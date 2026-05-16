const Notification = require('../models/Notification');
const User = require('../models/User');

// SSE registry: userId (string) → Set<res>
const clients = new Map();

function addClient(userId, res) {
  const key = String(userId);
  if (!clients.has(key)) clients.set(key, new Set());
  clients.get(key).add(res);
}

function removeClient(userId, res) {
  const key = String(userId);
  const set = clients.get(key);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) clients.delete(key);
}

function pushToUser(userId, data) {
  const set = clients.get(String(userId));
  if (!set) return;
  const chunk = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of set) {
    try { res.write(chunk); } catch (_) { /* stream closed */ }
  }
}

async function create(userId, { type, title, body = '', metadata = {} }) {
  const notification = await Notification.create({ user: userId, type, title, body, metadata });
  pushToUser(userId, { event: 'notification', notification });
  return notification;
}

async function createForRoles(roles, { type, title, body = '', metadata = {} }) {
  const users = await User.find({ role: { $in: roles }, status: 'active' }).select('_id').lean();
  if (!users.length) return [];
  const docs = users.map((u) => ({ user: u._id, type, title, body, metadata }));
  const notifications = await Notification.insertMany(docs);
  for (const n of notifications) pushToUser(n.user, { event: 'notification', notification: n });
  return notifications;
}

module.exports = { addClient, removeClient, pushToUser, create, createForRoles };
