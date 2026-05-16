/*
 * Project44 tracking adapter (stub).
 *
 * Production setup:
 *   - Set P44_CLIENT_ID and P44_CLIENT_SECRET in .env
 *   - OAuth2 token endpoint: https://api.project44.com/api/v1/oauth2/token
 *   - Tracking endpoint: POST https://api.project44.com/api/v4/shipments/tracking
 *   - Supports: ocean (container, B/L, booking), air (MAWB, HAWB), road (PRO)
 *
 * Docs: https://developers.project44.com/
 */

const ENDPOINT = 'https://api.project44.com/api/v4/shipments/tracking';

async function getAccessToken() {
  if (!process.env.P44_CLIENT_ID || !process.env.P44_CLIENT_SECRET) {
    throw new Error('P44_CLIENT_ID and P44_CLIENT_SECRET are not configured');
  }
  const res = await fetch('https://api.project44.com/api/v1/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     process.env.P44_CLIENT_ID,
      client_secret: process.env.P44_CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`P44 token error: ${res.status}`);
  const { access_token } = await res.json();
  return access_token;
}

function buildTrackingId(shipment) {
  if (shipment.mode === 'air' && shipment.awbNumber) {
    return { type: 'AIR_WAYBILL', value: shipment.awbNumber };
  }
  if (shipment.containers?.[0]?.containerNumber) {
    return { type: 'CONTAINER', value: shipment.containers[0].containerNumber };
  }
  if (shipment.mblNumber) {
    return { type: 'BILL_OF_LADING', value: shipment.mblNumber };
  }
  return null;
}

function normalizeEvent(p44Event) {
  return {
    timestamp:      new Date(p44Event.eventDateTime || p44Event.estimatedArrivalDateTime),
    event:          p44Event.description || p44Event.eventType,
    location:       [p44Event.location?.city, p44Event.location?.countryCode].filter(Boolean).join(', '),
    milestoneMatch: null, // requires fuzzy matching in the poller
    status:         'completed',
    provider:       'project44',
  };
}

module.exports = {
  name: 'project44',

  async getTracking(shipment) {
    const trackingId = buildTrackingId(shipment);
    if (!trackingId) throw new Error('No trackable identifier on shipment for Project44');

    const token = await getAccessToken();
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        shipmentIdentifiers: [trackingId],
        carrierCode:         shipment.carrierCode || undefined,
      }),
    });

    if (!res.ok) throw new Error(`P44 tracking error: ${res.status}`);
    const data = await res.json();

    const events = (data.statusUpdates || []).map(normalizeEvent);

    return {
      provider:       'project44',
      trackingNumber: trackingId.value,
      events,
      vesselPosition: null, // P44 does not expose raw AIS position
      origin:         null,
      destination:    null,
    };
  },
};
