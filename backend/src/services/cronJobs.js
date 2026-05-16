const cron = require('node-cron');
const Invoice = require('../models/Invoice');
const Shipment = require('../models/Shipment');
const Notification = require('../models/Notification');
const Task = require('../models/Task');
const { createForRoles, create: createNotif } = require('./notificationService');

const FINANCE_ROLES = ['admin', 'manager', 'finance'];
const OPS_ROLES     = ['admin', 'manager', 'operations'];

async function scanOverdueInvoices() {
  // Send at most one digest per day
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const alreadySent = await Notification.exists({ type: 'invoice_overdue', createdAt: { $gte: today } });
  if (alreadySent) return;

  const overdue = await Invoice.find({
    status: { $in: ['sent', 'partially_paid'] },
    dueDate: { $lt: new Date() },
  }).select('invoiceNumber').lean();

  if (!overdue.length) return;

  const preview = overdue.slice(0, 5).map((i) => i.invoiceNumber).join(', ');
  const suffix  = overdue.length > 5 ? ` +${overdue.length - 5} more` : '';

  await createForRoles(FINANCE_ROLES, {
    type: 'invoice_overdue',
    title: `${overdue.length} overdue invoice${overdue.length > 1 ? 's' : ''} require attention`,
    body: preview + suffix,
    metadata: { count: overdue.length },
  });
}

async function scanDemurrageWarnings() {
  const cutoff  = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const horizon = new Date(Date.now() + 48 * 60 * 60 * 1000);

  // Avoid re-notifying about the same shipment within 24 h
  const recentlyNotified = await Notification.find({
    type: 'demurrage_warning',
    createdAt: { $gte: cutoff },
  }).distinct('metadata.shipmentId');

  const atRisk = await Shipment.find({
    status: { $in: ['in_transit', 'arrived', 'customs_import'] },
    eta: { $gt: new Date(), $lt: horizon },
    _id: { $nin: recentlyNotified },
  }).select('shipmentNumber _id eta').lean();

  for (const s of atRisk) {
    await createForRoles(OPS_ROLES, {
      type: 'demurrage_warning',
      title: 'Demurrage risk — ETA within 48 h',
      body: `${s.shipmentNumber} — coordinate port clearance to avoid detention charges`,
      metadata: { shipmentId: s._id, shipmentNumber: s.shipmentNumber, eta: s.eta },
    });
  }
}

async function scanSlaBreaches() {
  const now = new Date();
  // Find tasks that are past due but not yet flagged
  const breached = await Task.find({
    status: { $in: ['open', 'in_progress'] },
    dueAt:  { $lt: now },
    slaBreached: false,
  }).select('_id assignedTo title dueAt').lean();

  if (!breached.length) return;

  // Bulk-flag them
  await Task.updateMany(
    { _id: { $in: breached.map((t) => t._id) } },
    { slaBreached: true }
  );

  // Notify each assignee
  for (const task of breached) {
    if (!task.assignedTo) continue;
    createNotif(task.assignedTo, {
      type: 'ar_alert',   // reuse closest type
      title: 'Task SLA breached',
      body:  `"${task.title}" was due ${new Date(task.dueAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      metadata: { taskId: task._id },
    }).catch(() => {});
  }

  console.log(`[cron] SLA: flagged ${breached.length} overdue task(s)`);
}

function startCronJobs() {
  // Overdue invoice digest — 08:00 daily
  cron.schedule('0 8 * * *', () => {
    scanOverdueInvoices().catch((e) => console.error('[cron] overdue-invoices:', e.message));
  });

  // Demurrage warnings — 07:00 daily
  cron.schedule('0 7 * * *', () => {
    scanDemurrageWarnings().catch((e) => console.error('[cron] demurrage:', e.message));
  });

  // SLA breach scanner — every hour
  cron.schedule('0 * * * *', () => {
    scanSlaBreaches().catch((e) => console.error('[cron] sla-breach:', e.message));
  });

  console.log('✅ Cron jobs scheduled (overdue: 08:00 · demurrage: 07:00 · SLA: hourly)');
}

module.exports = { startCronJobs, scanOverdueInvoices, scanDemurrageWarnings, scanSlaBreaches };
