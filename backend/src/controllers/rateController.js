const asyncHandler = require('../utils/asyncHandler');
const Rate = require('../models/Rate');
const { searchRates } = require('../services/rateSearchService');
const { generateRateCode } = require('../utils/numberGenerators');
const activity = require('../services/activityLogger');

exports.searchRates = asyncHandler(async (req, res) => {
  const results = await searchRates(req.query);
  res.json({ success: true, count: results.length, rates: results });
});

exports.listRates = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 25, 100);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.mode)   filter.mode = req.query.mode;
  if (req.query.carrier) filter.carrier = new RegExp(req.query.carrier, 'i');

  const [items, total] = await Promise.all([
    Rate.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Rate.countDocuments(filter),
  ]);
  res.json({ success: true, items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

exports.getRate = asyncHandler(async (req, res) => {
  const rate = await Rate.findById(req.params.id);
  if (!rate) { res.status(404); throw new Error('Rate not found'); }
  res.json({ success: true, rate });
});

exports.createRate = asyncHandler(async (req, res) => {
  const rateCode = req.body.rateCode || (await generateRateCode());
  const rate = await Rate.create({ ...req.body, rateCode, createdBy: req.user._id });
  activity.log({ req, entityType: 'Rate', entityId: rate._id, action: 'create', summary: `Rate ${rate.rateCode} created` });
  res.status(201).json({ success: true, rate });
});

exports.updateRate = asyncHandler(async (req, res) => {
  const rate = await Rate.findById(req.params.id);
  if (!rate) { res.status(404); throw new Error('Rate not found'); }
  Object.assign(rate, req.body);
  await rate.save();
  activity.log({ req, entityType: 'Rate', entityId: rate._id, action: 'update', summary: `Rate ${rate.rateCode} updated` });
  res.json({ success: true, rate });
});

exports.deleteRate = asyncHandler(async (req, res) => {
  const rate = await Rate.findByIdAndDelete(req.params.id);
  if (!rate) { res.status(404); throw new Error('Rate not found'); }
  activity.log({ req, entityType: 'Rate', entityId: req.params.id, action: 'delete', summary: `Rate ${rate.rateCode} deleted` });
  res.json({ success: true });
});
