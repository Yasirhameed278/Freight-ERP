const asyncHandler    = require('../utils/asyncHandler');
const WorkflowRule    = require('../models/WorkflowRule');

/* ─── list ────────────────────────────────────────────────── */
exports.listRules = asyncHandler(async (req, res) => {
  const { entity, active } = req.query;
  const filter = {};
  if (entity) filter['trigger.entity'] = entity;
  if (active !== undefined) filter.active = active === 'true';

  const rules = await WorkflowRule.find(filter)
    .sort({ createdAt: -1 })
    .populate('createdBy', 'name email')
    .lean();

  res.json({ success: true, rules });
});

/* ─── get one ─────────────────────────────────────────────── */
exports.getRule = asyncHandler(async (req, res) => {
  const rule = await WorkflowRule.findById(req.params.id).populate('createdBy', 'name email');
  if (!rule) { res.status(404); throw new Error('Workflow rule not found'); }
  res.json({ success: true, rule });
});

/* ─── create ──────────────────────────────────────────────── */
exports.createRule = asyncHandler(async (req, res) => {
  const { name, description, trigger, actions } = req.body;
  if (!name)    { res.status(400); throw new Error('name is required'); }
  if (!trigger) { res.status(400); throw new Error('trigger is required'); }
  if (!actions?.length) { res.status(400); throw new Error('At least one action required'); }

  const rule = await WorkflowRule.create({
    name, description, trigger, actions,
    createdBy: req.user._id,
    active: true,
  });

  res.status(201).json({ success: true, rule });
});

/* ─── update ──────────────────────────────────────────────── */
exports.updateRule = asyncHandler(async (req, res) => {
  const rule = await WorkflowRule.findById(req.params.id);
  if (!rule) { res.status(404); throw new Error('Workflow rule not found'); }

  const { name, description, trigger, actions, active } = req.body;
  if (name !== undefined)        rule.name        = name;
  if (description !== undefined) rule.description = description;
  if (trigger !== undefined)     rule.trigger     = trigger;
  if (actions !== undefined)     rule.actions     = actions;
  if (active !== undefined)      rule.active      = active;

  await rule.save();
  res.json({ success: true, rule });
});

/* ─── toggle active ───────────────────────────────────────── */
exports.toggleRule = asyncHandler(async (req, res) => {
  const rule = await WorkflowRule.findById(req.params.id);
  if (!rule) { res.status(404); throw new Error('Workflow rule not found'); }
  rule.active = !rule.active;
  await rule.save();
  res.json({ success: true, active: rule.active });
});

/* ─── delete ──────────────────────────────────────────────── */
exports.deleteRule = asyncHandler(async (req, res) => {
  const rule = await WorkflowRule.findByIdAndDelete(req.params.id);
  if (!rule) { res.status(404); throw new Error('Workflow rule not found'); }
  res.json({ success: true });
});
