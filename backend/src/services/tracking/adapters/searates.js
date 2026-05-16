/*
 * Searates tracking adapter (stub).
 *
 * Production setup:
 *   - Set SEARATES_API_KEY in .env
 *   - Container tracking: GET https://tracking.searates.com/tracking?type=CT&number={containerNumber}&sealine={carrierCode}&api_key={key}
 *   - Vessel positions:   GET https://tracking.searates.com/position?imo={imo}&api_key={key}
 *
 * Docs: https://www.searates.com/services/tracking/api/
 */

const BASE = 'https://tracking.searates.com';

function normalizeEvent(ev) {
  return {
    timestamp:      new Date(ev.date),
    event:          ev.event || ev.description,
    location:       [ev.location, ev.country].filter(Boolean).join(', '),
    milestoneMatch: null,
    status:         'completed',
    provider:       'searates',
  };
}

module.exports = {
  name: 'searates',

  async getTracking(shipment) {
    const apiKey = process.env.SEARATES_API_KEY;
    if (!apiKey) throw new Error('SEARATES_API_KEY is not configured');

    const containerNumber = shipment.containers?.[0]?.containerNumber;
    if (!containerNumber) throw new Error('No container number on shipment for Searates');

    const url = `${BASE}/tracking?type=CT&number=${encodeURIComponent(containerNumber)}&sealine=${shipment.carrierCode || ''}&api_key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Searates error: ${res.status}`);
    const data = await res.json();

    const events = (data.data?.route || []).map(normalizeEvent);

    // Vessel position
    let vesselPosition = null;
    if (data.data?.vessel?.imo) {
      try {
        const posRes = await fetch(`${BASE}/position?imo=${data.data.vessel.imo}&api_key=${apiKey}`);
        if (posRes.ok) {
          const pos = await posRes.json();
          if (pos.lat && pos.lng) {
            vesselPosition = {
              lat:       pos.lat,
              lng:       pos.lng,
              heading:   pos.course || 0,
              speed:     pos.speed  || 0,
              updatedAt: new Date(pos.timestamp || Date.now()),
            };
          }
        }
      } catch { /* vessel position is best-effort */ }
    }

    return {
      provider:       'searates',
      trackingNumber: containerNumber,
      events,
      vesselPosition,
      origin:         null,
      destination:    null,
    };
  },
};
