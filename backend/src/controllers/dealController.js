const asyncHandler = require('../utils/asyncHandler');
const Deal = require('../models/Deal');
const { generateDealCode } = require('../utils/numberGenerators');

const STAGES = ['inquiry', 'quoted', 'confirmed', 'lost', 'on_hold'];
const KANBAN_STAGES = ['inquiry', 'quoted', 'confirmed', 'lost'];

exports.getKanban = asyncHandler(async (req, res) => {
  const filter = { ...req.scope };

  if (req.query.owner) filter.owner = req.query.owner;
  if (req.query.priority) filter.priority = req.query.priority;
  if (req.query.search) {
    filter.$text = { $search: req.query.search };
  }

  const deals = await Deal.find(filter)
    .populate('client', 'companyName clientCode')
    .populate('owner', 'firstName lastName avatar')
    .sort({ stage: 1, position: 1, createdAt: -1 })
    .lean({ virtuals: true });

  const columns = KANBAN_STAGES.reduce((acc, stage) => {
    acc[stage] = { stage, deals: [], count: 0, totalValue: 0, weightedValue: 0 };
    return acc;
  }, {});

  for (const deal of deals) {
    const col = columns[deal.stage];
    if (!col) continue;
    col.deals.push(deal);
    col.count += 1;
    col.totalValue += deal.estimatedValue || 0;
    col.weightedValue += deal.weightedValue || 0;
  }

  res.json({ success: true, columns });
});

exports.listDeals = asyncHandler(async (req, res) => {
  const page  = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 25, 100);
  const skip  = (page - 1) * limit;

  const filter = { ...req.scope };
  if (req.query.stage) filter.stage = req.query.stage;
  if (req.query.search) filter.$text = { $search: req.query.search };

  const [items, total] = await Promise.all([
    Deal.find(filter)
      .populate('client', 'companyName clientCode')
      .populate('owner', 'firstName lastName')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean({ virtuals: true }),
    Deal.countDocuments(filter),
  ]);

  res.json({
    success: true,
    items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

exports.getDeal = asyncHandler(async (req, res) => {
  const deal = await Deal.findOne({ _id: req.params.id, ...req.scope })
    .populate('client', 'companyName clientCode email')
    .populate('owner', 'firstName lastName email')
    .populate('team', 'firstName lastName');

  if (!deal) {
    res.status(404);
    throw new Error('Deal not found or access denied');
  }
  res.json({ success: true, deal });
});

exports.createDeal = asyncHandler(async (req, res) => {
  const dealCode = await generateDealCode();

  const stage = req.body.stage || 'inquiry';
  const lastInStage = await Deal.findOne({ stage }).sort({ position: -1 }).select('position');
  const position = (lastInStage?.position ?? -1) + 1;

  const deal = await Deal.create({
    ...req.body,
    dealCode,
    stage,
    position,
    owner: req.body.owner || req.user._id,
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, deal });
});

exports.updateDeal = asyncHandler(async (req, res) => {
  const deal = await Deal.findOne({ _id: req.params.id, ...req.scope });
  if (!deal) {
    res.status(404);
    throw new Error('Deal not found or access denied');
  }

  delete req.body.stage;
  delete req.body.position;
  delete req.body.dealCode;

  Object.assign(deal, req.body);
  await deal.save();

  res.json({ success: true, deal });
});

exports.moveDeal = asyncHandler(async (req, res) => {
  const { stage, position } = req.body;

  if (!STAGES.includes(stage)) {
    res.status(400);
    throw new Error(`Invalid stage. Allowed: ${STAGES.join(', ')}`);
  }

  const deal = await Deal.findOne({ _id: req.params.id, ...req.scope });
  if (!deal) {
    res.status(404);
    throw new Error('Deal not found or access denied');
  }

  const fromStage = deal.stage;
  deal.stage = stage;
  if (typeof position === 'number') deal.position = position;

  if (fromStage !== stage) {
    deal.activities.push({
      type: 'note',
      subject: `Stage changed: ${fromStage} → ${stage}`,
      status: 'completed',
      completedAt: new Date(),
      user: req.user._id,
    });
  }

  await deal.save();

  if (fromStage !== stage) {
    const notify = require('../services/notificationService');
    notify.create(req.user._id, {
      type: 'deal_stage',
      title: `Deal moved to ${stage}`,
      body: `${deal.dealCode} advanced from ${fromStage} → ${stage}`,
      metadata: { dealId: deal._id, dealCode: deal.dealCode, fromStage, toStage: stage },
    }).catch(() => {});

    const wf = require('../services/workflowEngine');
    wf.fire({ entity: deal, entityType: 'Deal', event: 'stage_changed', context: { actorId: req.user._id } }).catch(() => {});
  }

  res.json({ success: true, deal });
});

exports.reorderDeals = asyncHandler(async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400);
    throw new Error('items array is required');
  }

  const ids = items.map((i) => i.id);
  const accessible = await Deal.find({ _id: { $in: ids }, ...req.scope }).select('_id');
  if (accessible.length !== ids.length) {
    res.status(403);
    throw new Error('One or more deals are outside your access scope');
  }

  const ops = items.map(({ id, position, stage }) => ({
    updateOne: {
      filter: { _id: id },
      update: stage ? { position, stage } : { position },
    },
  }));

  await Deal.bulkWrite(ops);
  res.json({ success: true, updated: items.length });
});

exports.deleteDeal = asyncHandler(async (req, res) => {
  const deal = await Deal.findOneAndDelete({ _id: req.params.id, ...req.scope });
  if (!deal) {
    res.status(404);
    throw new Error('Deal not found or access denied');
  }
  res.json({ success: true, message: 'Deal deleted' });
});
