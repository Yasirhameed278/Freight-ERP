const crypto        = require('crypto');
const asyncHandler  = require('../utils/asyncHandler');
const PortalQuote   = require('../models/PortalQuote');
const { searchRates }      = require('../services/rateSearchService');
const { createForRoles }   = require('../services/notificationService');
const { sendEmail }        = require('../services/email');
const { portalQuoteEmail } = require('../services/email/templates');

const MARKUP_PCT       = parseFloat(process.env.PORTAL_MARKUP_PCT  || 15);
const TOKEN_DAYS       = parseInt(process.env.PORTAL_TOKEN_DAYS    || 7);
const APP_URL          = process.env.APP_URL || 'http://localhost:5173';
const SALES_ROLES      = ['admin', 'manager', 'sales'];

/* ─── helper ─────────────────────────────────────────────── */
function sanitize(pq) {
  const obj = pq.toObject ? pq.toObject() : { ...pq };
  delete obj.token;
  delete obj.markupPct;
  // Strip internal buy price from each rate option
  if (obj.rates) {
    obj.rates = obj.rates.map(({ totalSell, ...rest }) => rest); // eslint-disable-line no-unused-vars
  }
  return obj;
}

/* ─── Public: rate search (no auth) ──────────────────────── */
exports.publicSearchRates = asyncHandler(async (req, res) => {
  const { mode, originCode, destinationCode, weight, volume } = req.body;

  if (!mode || !originCode || !destinationCode) {
    res.status(400);
    throw new Error('mode, originCode, and destinationCode are required');
  }

  const raw = await searchRates({ mode, originCode, destinationCode, weight, volume });

  const rates = raw.slice(0, 6).map((r) => ({
    rateId:      r._id,
    carrier:     r.carrier     || 'General Carrier',
    service:     r.name        || r.serviceLevel || '',
    type:        r.type        || '',
    transitDays: r.transitTimeDays,
    currency:    r.baseCurrency || 'USD',
    totalSell:   r.totalSell,
    portalPrice: +(r.totalSell * (1 + MARKUP_PCT / 100)).toFixed(2),
    validTo:     r.validTo,
  }));

  res.json({ success: true, rates, markup: MARKUP_PCT });
});

/* ─── Public: submit quote request ───────────────────────── */
exports.submitQuoteRequest = asyncHandler(async (req, res) => {
  const { contact, origin, destination, mode, weight, weightUnit,
    volume, volumeUnit, packages, cargoType, dangerousGoods, notes,
    rates, selectedRate } = req.body;

  if (!contact?.name || !contact?.email) {
    res.status(400);
    throw new Error('Contact name and email are required');
  }
  if (!mode) {
    res.status(400);
    throw new Error('Shipping mode is required');
  }

  const rawToken   = crypto.randomBytes(32).toString('hex');
  const tokenExpiry = new Date(Date.now() + TOKEN_DAYS * 86400000);

  const pq = await PortalQuote.create({
    contact, origin, destination, mode,
    weight, weightUnit, volume, volumeUnit,
    packages, cargoType, dangerousGoods, notes,
    rates, selectedRate,
    markupPct: MARKUP_PCT,
    token:       rawToken,
    tokenExpiry,
    status: 'sent',
    sentAt: new Date(),
  });

  // Email customer
  const quoteUrl = `${APP_URL}/portal/quote/${rawToken}`;
  const tpl = portalQuoteEmail({ pq, quoteUrl });
  sendEmail({ to: contact.email, ...tpl }).catch((e) =>
    console.error('[portal] email failed:', e.message)
  );

  // Notify sales
  const routeLabel = [origin?.name || originCode, destination?.name || destinationCode]
    .filter(Boolean).join(' → ');
  createForRoles(SALES_ROLES, {
    type:  'portal_quote',
    title: 'New portal quote request',
    body:  `${contact.company || contact.name} · ${routeLabel}`,
    metadata: { portalQuoteId: pq._id, quoteRef: pq.quoteRef, contact },
  }).catch(() => {});

  res.status(201).json({
    success:  true,
    quoteRef: pq.quoteRef,
    message:  'Quote request received. Check your email for the quote link.',
  });
});

/* ─── Public: view quote by token ────────────────────────── */
exports.getQuoteByToken = asyncHandler(async (req, res) => {
  const pq = await PortalQuote.findOne({ token: req.params.token });

  if (!pq) {
    res.status(404);
    throw new Error('Quote not found — the link may be invalid or expired');
  }

  if (pq.tokenExpiry < new Date()) {
    if (pq.status !== 'expired') { pq.status = 'expired'; await pq.save(); }
    res.status(410);
    throw new Error('This quote has expired. Please request a new one.');
  }

  if (pq.status === 'sent') {
    pq.status   = 'viewed';
    pq.viewedAt = new Date();
    await pq.save();
  }

  res.json({ success: true, quote: sanitize(pq) });
});

/* ─── Public: accept quote + booking details ─────────────── */
exports.acceptQuote = asyncHandler(async (req, res) => {
  const pq = await PortalQuote.findOne({ token: req.params.token });
  if (!pq) { res.status(404); throw new Error('Quote not found'); }
  if (['accepted', 'declined', 'expired', 'converted'].includes(pq.status)) {
    res.status(409); throw new Error(`Quote is already ${pq.status}`);
  }
  if (pq.tokenExpiry < new Date()) {
    res.status(410); throw new Error('Quote has expired');
  }

  const { selectedRate, booking } = req.body;
  pq.status     = 'accepted';
  pq.acceptedAt = new Date();
  if (selectedRate) pq.selectedRate = selectedRate;
  if (booking)      pq.booking      = booking;
  await pq.save();

  createForRoles(SALES_ROLES, {
    type:  'portal_quote',
    title: '🎉 Portal quote accepted',
    body:  `${pq.contact.company || pq.contact.name} accepted ${pq.quoteRef} — ready to convert to booking`,
    metadata: { portalQuoteId: pq._id, quoteRef: pq.quoteRef },
  }).catch(() => {});

  res.json({
    success:  true,
    quoteRef: pq.quoteRef,
    message:  'Booking request confirmed! Our team will contact you within 24 hours to finalize.',
  });
});

/* ─── Public: decline quote ──────────────────────────────── */
exports.declineQuote = asyncHandler(async (req, res) => {
  const pq = await PortalQuote.findOne({ token: req.params.token });
  if (!pq) { res.status(404); throw new Error('Quote not found'); }
  if (['accepted', 'declined'].includes(pq.status)) {
    res.status(409); throw new Error(`Quote is already ${pq.status}`);
  }

  pq.status = 'declined';
  await pq.save();

  res.json({ success: true, message: 'Quote declined. Thank you for considering Reliq.' });
});

/* ─── Internal (auth required): list portal requests ─────── */
exports.listPortalQuotes = asyncHandler(async (req, res) => {
  const page  = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 25, 100);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const [items, total] = await Promise.all([
    PortalQuote.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    PortalQuote.countDocuments(filter),
  ]);

  res.json({ success: true, items: items.map(sanitize), total, page, pages: Math.ceil(total / limit) });
});
