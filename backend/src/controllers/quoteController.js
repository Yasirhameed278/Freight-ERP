const asyncHandler = require('../utils/asyncHandler');
const Quote = require('../models/Quote');
const Rate = require('../models/Rate');
const Shipment = require('../models/Shipment');
const { generateQuoteNumber } = require('../utils/numberGenerators');
const generateShipmentNumber = require('../utils/generateShipmentNumber');
const { buildDefaultMilestones } = require('../utils/defaultMilestones');
const activity = require('../services/activityLogger');
const { generateQuotePdf } = require('../services/pdf');
const { sendEmail } = require('../services/email');
const { quoteEmail } = require('../services/email/templates');
const documentArchiver = require('../services/documentArchiver');

exports.listQuotes = asyncHandler(async (req, res) => {
  const filter = { ...req.scope };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.clientId) filter.client = req.query.clientId;

  const items = await Quote.find(filter)
    .populate('client', 'companyName clientCode')
    .populate('salesRep', 'firstName lastName')
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean();
  res.json({ success: true, items });
});

exports.getQuote = asyncHandler(async (req, res) => {
  const quote = await Quote.findOne({ _id: req.params.id, ...req.scope })
    .populate('client')
    .populate('sourceRates')
    .populate('salesRep', 'firstName lastName email');
  if (!quote) { res.status(404); throw new Error('Quote not found'); }
  res.json({ success: true, quote });
});

exports.createQuote = asyncHandler(async (req, res) => {
  const { rateIds = [], lines: customLines = [], ...rest } = req.body;

  let lines = [];

  if (rateIds.length) {
    const rates = await Rate.find({ _id: { $in: rateIds } });
    for (const rate of rates) {
      for (const charge of rate.charges) {
        let sell;
        if (rate.markupType === 'absolute_sell') {
          sell = charge.amount * 1.15;
        } else if (rate.markupType === 'flat') {
          const totalBuy = rate.charges.reduce((s, c) => s + c.amount, 0);
          const share = totalBuy > 0 ? charge.amount / totalBuy : 0;
          sell = charge.amount + (rate.markupValue || 0) * share;
        } else {
          sell = charge.amount * (1 + (rate.markupValue || 0) / 100);
        }
        lines.push({
          code: charge.code,
          description: charge.description,
          quantity: 1,
          unit: charge.basis,
          buyRate: charge.amount,
          sellRate: +sell.toFixed(2),
          currency: charge.currency || rate.baseCurrency,
        });
      }
    }
  }

  if (customLines.length) lines = lines.concat(customLines);

  const quoteNumber = await generateQuoteNumber();
  const quote = await Quote.create({
    ...rest,
    quoteNumber,
    sourceRates: rateIds,
    lines,
    salesRep: rest.salesRep || req.user._id,
    createdBy: req.user._id,
  });

  activity.log({ req, entityType: 'Quote', entityId: quote._id, action: 'create',
    summary: `Quote ${quote.quoteNumber} created for ${quote.client}` });

  res.status(201).json({ success: true, quote });
});

exports.updateQuote = asyncHandler(async (req, res) => {
  const quote = await Quote.findOne({ _id: req.params.id, ...req.scope });
  if (!quote) { res.status(404); throw new Error('Quote not found'); }
  Object.assign(quote, req.body);
  await quote.save();
  activity.log({ req, entityType: 'Quote', entityId: quote._id, action: 'update',
    summary: `Quote ${quote.quoteNumber} updated` });
  res.json({ success: true, quote });
});

exports.sendQuote = asyncHandler(async (req, res) => {
  const quote = await Quote.findOne({ _id: req.params.id, ...req.scope })
    .populate('client', 'companyName clientCode email phone taxNumber')
    .populate('salesRep', 'firstName lastName email');

  if (!quote) { res.status(404); throw new Error('Quote not found'); }
  if (!['draft', 'sent'].includes(quote.status)) {
    res.status(400);
    throw new Error(`Quote in status '${quote.status}' cannot be sent`);
  }

  const recipientEmail = req.body.email || quote.client?.email;
  if (!recipientEmail) {
    res.status(400);
    throw new Error('No recipient email — provide one in the request body or set client.email');
  }

  const pdfFile = await generateQuotePdf(quote);

  const doc = await documentArchiver.archive({
    pdfFile,
    category: 'quotation',
    name: `Quote ${quote.quoteNumber}.pdf`,
    description: `Quotation for ${quote.client?.companyName}`,
    entityType: 'Quote',
    entityId: quote._id,
    clientId: quote.client?._id,
    uploadedBy: req.user._id,
    visibility: 'client',
    req,
  });

  const { subject, html, text } = quoteEmail({
    quote,
    customerName: quote.client?.companyName,
    senderName: quote.salesRep ? `${quote.salesRep.firstName} ${quote.salesRep.lastName}` : undefined,
  });

  const emailResult = await sendEmail({
    to: recipientEmail,
    cc: req.body.cc,
    subject,
    html,
    text,
    attachments: [{
      filename: `Quote-${quote.quoteNumber}.pdf`,
      path: pdfFile.path,
      contentType: 'application/pdf',
    }],
  });

  quote.status = 'sent';
  quote.sentAt = new Date();
  quote.sentBy = req.user._id;
  await quote.save();

  activity.log({
    req,
    entityType: 'Quote',
    entityId: quote._id,
    action: 'send',
    summary: `Quote ${quote.quoteNumber} sent to ${recipientEmail}`,
    metadata: { documentId: doc._id, emailMessageId: emailResult.messageId },
  });

  res.json({
    success: true,
    quote,
    document: doc,
    email: emailResult,
  });
});

exports.downloadQuotePdf = asyncHandler(async (req, res) => {
  const quote = await Quote.findOne({ _id: req.params.id, ...req.scope })
    .populate('client', 'companyName clientCode email phone taxNumber')
    .populate('salesRep', 'firstName lastName');

  if (!quote) { res.status(404); throw new Error('Quote not found'); }

  const pdfFile = await generateQuotePdf(quote);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="Quote-${quote.quoteNumber}.pdf"`);
  res.sendFile(pdfFile.path);
});

exports.acceptQuote = asyncHandler(async (req, res) => {
  const quote = await Quote.findOne({ _id: req.params.id, ...req.scope });
  if (!quote) { res.status(404); throw new Error('Quote not found'); }
  quote.status = 'accepted';
  quote.acceptedAt = new Date();
  await quote.save();
  activity.log({ req, entityType: 'Quote', entityId: quote._id, action: 'approve',
    summary: `Quote ${quote.quoteNumber} accepted` });
  res.json({ success: true, quote });
});

exports.rejectQuote = asyncHandler(async (req, res) => {
  const quote = await Quote.findOne({ _id: req.params.id, ...req.scope });
  if (!quote) { res.status(404); throw new Error('Quote not found'); }
  quote.status = 'rejected';
  quote.rejectedAt = new Date();
  quote.rejectionReason = req.body.reason || '';
  await quote.save();
  activity.log({ req, entityType: 'Quote', entityId: quote._id, action: 'reject',
    summary: `Quote ${quote.quoteNumber} rejected` });
  res.json({ success: true, quote });
});

exports.convertToShipment = asyncHandler(async (req, res) => {
  const quote = await Quote.findOne({ _id: req.params.id, ...req.scope });
  if (!quote) { res.status(404); throw new Error('Quote not found'); }
  if (quote.status !== 'accepted') {
    res.status(400);
    throw new Error('Only accepted quotes can be converted');
  }
  if (quote.convertedToShipment) {
    res.status(409);
    throw new Error('Quote already converted to a shipment');
  }

  const shipmentNumber = await generateShipmentNumber(quote.mode);
  const milestones = buildDefaultMilestones({ mode: quote.mode, direction: quote.direction });

  const charges = quote.lines.flatMap((l) => ([
    { description: l.description, code: l.code, type: 'cost',    amount: l.buyRate || 0, currency: l.currency, quantity: l.quantity || 1 },
    { description: l.description, code: l.code, type: 'revenue', amount: l.sellRate || 0, currency: l.currency, quantity: l.quantity || 1 },
  ]));

  const shipment = await Shipment.create({
    shipmentNumber,
    mode: quote.mode,
    type: quote.type,
    direction: quote.direction,
    shipper: quote.client,
    consignee: quote.client,
    customer: quote.client,
    portOfLoading:   quote.origin,
    portOfDischarge: quote.destination,
    incoterm: quote.incoterm,
    salesRep: quote.salesRep,
    milestones,
    charges,
    status: 'booked',
    createdBy: req.user._id,
    notes: `Converted from quote ${quote.quoteNumber}`,
  });

  quote.status = 'converted';
  quote.convertedToShipment = shipment._id;
  await quote.save();

  activity.log({ req, entityType: 'Quote', entityId: quote._id, action: 'status_change',
    summary: `Quote converted to shipment ${shipment.shipmentNumber}`,
    metadata: { shipmentId: shipment._id } });

  res.json({ success: true, quote, shipment });
});
