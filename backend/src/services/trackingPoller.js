const cron    = require('node-cron');
const Shipment = require('../models/Shipment');
const { getTracking } = require('./tracking');
const { create, createForRoles } = require('./notificationService');

const POLL_CONCURRENCY   = 5;   // shipments processed in parallel per batch
const SHIPMENT_TIMEOUT_MS = 20_000; // max ms per shipment before we give up

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// Statuses that are worth polling — ignore quotes, delivered, cancelled
const POLLABLE_STATUSES = [
  'booked', 'pickup_scheduled', 'cargo_received',
  'customs_export', 'loaded', 'in_transit', 'transhipment',
  'arrived', 'customs_import', 'cleared', 'out_for_delivery',
];

// Map milestone event keywords → shipment status
function milestoneEventToStatus(eventName) {
  const ev = eventName.toLowerCase();
  if (ev.includes('delivered'))                    return 'delivered';
  if (ev.includes('out for delivery'))             return 'out_for_delivery';
  if (ev.includes('customs import') || ev.includes('customs cleared')) return 'cleared';
  if (ev.includes('discharged') || ev.includes('vessel arrived') || ev.includes('ata')) return 'arrived';
  if (ev.includes('in transit') || ev.includes('vessel departed') || ev.includes('atd')) return 'in_transit';
  if (ev.includes('loaded'))                       return 'loaded';
  if (ev.includes('customs export'))               return 'customs_export';
  if (ev.includes('cargo received'))               return 'cargo_received';
  return null;
}

async function processShipment(shipment) {
  let tracking;
  try {
    tracking = await getTracking(shipment);
  } catch (err) {
    console.error(`[tracking-poller] ${shipment.shipmentNumber}: ${err.message}`);
    return;
  }

  const newEvents = tracking.events.filter((ev) => ev.milestoneMatch);
  let changed = false;
  let newStatus = null;

  // Reconcile: mark pending milestones as completed when tracking confirms them
  const milestones = shipment.milestones || [];
  for (const ev of newEvents) {
    const ms = milestones.find(
      (m) =>
        m.status !== 'completed' &&
        m.event.toLowerCase() === ev.milestoneMatch.toLowerCase()
    );
    if (!ms) continue;

    ms.status     = 'completed';
    ms.actualDate = ev.timestamp;
    if (ev.location) ms.location = ev.location;
    ms.remarks = `Auto-updated by ${ev.provider} tracking`;
    changed    = true;

    const derived = milestoneEventToStatus(ms.event);
    if (derived) newStatus = derived;

    // Notify the operations manager (if assigned)
    if (shipment.operationsManager?._id || shipment.operationsManager) {
      const uid = shipment.operationsManager?._id || shipment.operationsManager;
      create(uid, {
        type:  'shipment_milestone',
        title: `Tracking update: ${ms.event}`,
        body:  `${shipment.shipmentNumber}${ev.location ? ' · ' + ev.location : ''}`,
        metadata: { shipmentId: shipment._id, shipmentNumber: shipment.shipmentNumber, milestone: ms.event },
      }).catch(() => {});
    }
  }

  if (!changed && !tracking.vesselPosition) return;

  const update = { lastTrackingUpdate: new Date() };
  if (tracking.vesselPosition) update.vesselPosition = tracking.vesselPosition;

  if (changed) {
    update.milestones = milestones;
    if (newStatus && newStatus !== shipment.status) update.status = newStatus;
  }

  await Shipment.findByIdAndUpdate(shipment._id, update);
}

let isPolling = false;

async function runPoll() {
  if (isPolling) {
    console.warn('[tracking-poller] Previous poll still running — skipping this tick');
    return;
  }
  isPolling = true;

  try {
    const shipments = await Shipment.find({
      status: { $in: POLLABLE_STATUSES },
      mode:   { $in: ['sea', 'air', 'multimodal'] },
    })
      .select('shipmentNumber mode status milestones mblNumber hblNumber awbNumber containers vesselName voyageNumber carrierCode portOfLoading portOfDischarge etd eta trackingProvider operationsManager vesselPosition')
      .lean();

    if (!shipments.length) return;

    // Process in parallel batches — limits DB/network pressure while staying faster than sequential
    for (let i = 0; i < shipments.length; i += POLL_CONCURRENCY) {
      const batch = shipments.slice(i, i + POLL_CONCURRENCY);
      await Promise.allSettled(
        batch.map((s) =>
          withTimeout(processShipment(s), SHIPMENT_TIMEOUT_MS).catch((err) =>
            console.error(`[tracking-poller] ${s.shipmentNumber}: ${err.message}`)
          )
        )
      );
    }

    console.log(`[tracking-poller] Polled ${shipments.length} active shipment(s)`);
  } finally {
    isPolling = false;
  }
}

function startTrackingPoller() {
  // Poll every 15 minutes
  cron.schedule('*/15 * * * *', () => {
    runPoll().catch((e) => console.error('[tracking-poller] poll error:', e.message));
  });

  console.log('✅ Tracking poller started (every 15 minutes)');
}

module.exports = { startTrackingPoller, runPoll };
