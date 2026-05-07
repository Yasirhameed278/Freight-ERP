const asyncHandler = require('../utils/asyncHandler');
const Activity = require('../models/Activity');

exports.list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.entityType) filter.entityType = req.query.entityType;
  if (req.query.entityId)   filter.entityId = req.query.entityId;
  if (req.query.userId)     filter.user = req.query.userId;
  if (req.query.action)     filter.action = req.query.action;

  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const items = await Activity.find(filter)
    .populate('user', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  res.json({ success: true, items });
});
