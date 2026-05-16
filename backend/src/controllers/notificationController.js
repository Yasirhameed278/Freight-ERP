const asyncHandler = require('../utils/asyncHandler');
const Notification = require('../models/Notification');
const { addClient, removeClient } = require('../services/notificationService');

exports.stream = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const userId = req.user._id.toString();
  addClient(userId, res);
  res.write(`data: ${JSON.stringify({ event: 'connected' })}\n\n`);

  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeClient(userId, res);
  });
};

exports.list = asyncHandler(async (req, res) => {
  const page  = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 30, 100);
  const filter = { user: req.user._id };
  if (req.query.unread === 'true') filter.read = false;

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);

  res.json({ success: true, items, total, unreadCount, page, pages: Math.ceil(total / limit) });
});

exports.unreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ user: req.user._id, read: false });
  res.json({ success: true, count });
});

exports.markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { read: true },
    { new: true }
  );
  if (!notification) { res.status(404); throw new Error('Notification not found'); }
  res.json({ success: true, notification });
});

exports.markAllRead = asyncHandler(async (req, res) => {
  const { modifiedCount } = await Notification.updateMany(
    { user: req.user._id, read: false },
    { read: true }
  );
  res.json({ success: true, modifiedCount });
});

exports.deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!notification) { res.status(404); throw new Error('Notification not found'); }
  res.json({ success: true, message: 'Notification deleted' });
});
