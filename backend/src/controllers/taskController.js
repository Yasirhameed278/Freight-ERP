const asyncHandler = require('../utils/asyncHandler');
const Task = require('../models/Task');

/* ─── helpers ─────────────────────────────────────────────── */
const populate = [
  { path: 'assignedTo', select: 'firstName lastName email role' },
  { path: 'createdBy',  select: 'firstName lastName email' },
];

/* ─── list ────────────────────────────────────────────────── */
exports.listTasks = asyncHandler(async (req, res) => {
  const { status, priority, assignedTo, linkedKind, linkedId,
          overdue, mine, page = 1, limit = 50 } = req.query;

  const filter = {};
  if (status)    filter.status   = { $in: status.split(',') };
  if (priority)  filter.priority = priority;
  if (linkedKind) filter['linkedTo.kind'] = linkedKind;
  if (linkedId)   filter['linkedTo.id']   = linkedId;

  if (mine === 'true') {
    filter.assignedTo = req.user._id;
  } else if (assignedTo) {
    filter.assignedTo = assignedTo;
  }

  if (overdue === 'true') {
    filter.dueAt  = { $lt: new Date() };
    filter.status = { $in: ['open', 'in_progress'] };
  }

  const lim = Math.min(parseInt(limit) || 50, 200);
  const skip = (Math.max(parseInt(page) || 1, 1) - 1) * lim;

  const [items, total] = await Promise.all([
    Task.find(filter)
      .sort({ dueAt: 1, createdAt: -1 })
      .skip(skip).limit(lim)
      .populate(populate)
      .lean(),
    Task.countDocuments(filter),
  ]);

  res.json({ success: true, items, total, page: parseInt(page), pages: Math.ceil(total / lim) });
});

/* ─── get one ─────────────────────────────────────────────── */
exports.getTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id).populate(populate);
  if (!task) { res.status(404); throw new Error('Task not found'); }
  res.json({ success: true, task });
});

/* ─── create ──────────────────────────────────────────────── */
exports.createTask = asyncHandler(async (req, res) => {
  const { title, description, priority, assignedTo, dueAt, linkedTo, tags } = req.body;
  if (!title) { res.status(400); throw new Error('title is required'); }

  const task = await Task.create({
    title, description, priority, assignedTo,
    dueAt: dueAt ? new Date(dueAt) : undefined,
    linkedTo, tags,
    createdBy: req.user._id,
    status: 'open',
  });

  res.status(201).json({ success: true, task });
});

/* ─── update ──────────────────────────────────────────────── */
exports.updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) { res.status(404); throw new Error('Task not found'); }

  const { title, description, priority, assignedTo, dueAt, tags, status } = req.body;
  if (title !== undefined)       task.title       = title;
  if (description !== undefined) task.description = description;
  if (priority !== undefined)    task.priority    = priority;
  if (assignedTo !== undefined)  task.assignedTo  = assignedTo || null;
  if (dueAt !== undefined)       task.dueAt       = dueAt ? new Date(dueAt) : null;
  if (tags !== undefined)        task.tags        = tags;

  if (status && status !== task.status) {
    task.status = status;
    if (status === 'done' && !task.completedAt) task.completedAt = new Date();
    if (status !== 'done') task.completedAt = undefined;
    if (['done', 'cancelled'].includes(status)) task.slaBreached = false;
  }

  await task.save();
  await task.populate(populate);
  res.json({ success: true, task });
});

/* ─── quick status transitions ────────────────────────────── */
exports.startTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) { res.status(404); throw new Error('Task not found'); }
  task.status = 'in_progress';
  await task.save();
  res.json({ success: true, task });
});

exports.completeTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) { res.status(404); throw new Error('Task not found'); }
  task.status      = 'done';
  task.completedAt = new Date();
  task.slaBreached = false;
  await task.save();
  res.json({ success: true, task });
});

/* ─── delete ──────────────────────────────────────────────── */
exports.deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findByIdAndDelete(req.params.id);
  if (!task) { res.status(404); throw new Error('Task not found'); }
  res.json({ success: true });
});

/* ─── counts for dashboard widget ────────────────────────── */
exports.myCounts = asyncHandler(async (req, res) => {
  const [open, inProgress, overdue] = await Promise.all([
    Task.countDocuments({ assignedTo: req.user._id, status: 'open' }),
    Task.countDocuments({ assignedTo: req.user._id, status: 'in_progress' }),
    Task.countDocuments({
      assignedTo: req.user._id,
      status: { $in: ['open', 'in_progress'] },
      dueAt: { $lt: new Date() },
    }),
  ]);
  res.json({ success: true, open, inProgress, overdue });
});
