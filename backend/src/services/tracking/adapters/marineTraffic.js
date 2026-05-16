/*
 * MarineTraffic AIS adapter (stub).
 *
 * Production setup:
 *   - Set MARINETRAFFIC_API_KEY in .env
 *   - Vessel positions by IMO: GET https://services.marinetraffic.com/api/exportvessel/v:8/{key}/vessels/imo:{imo}/protocol:json
 *   - Expected voyage events:  GET https://services.marinetraffic.com/api/expectedarrivals/v:2/{key}...
 *
 * MarineTraffic is best used for real-time vessel position only;
 * combine with a cargo tracker (Searates/P44) for event milestones.
 *
 * Docs: https://www.marinetraffic.com/en/ais-api-services
 */

const BASE = 'https://services.marinetraffic.com/api';

module.exports = {
  name: 'marinetraffic',

  async getTracking(shipment) {
    const apiKey = process.env.MARINETRAFFIC_API_KEY;
    if (!apiKey) throw new Error('MARINETRAFFIC_API_KEY is not configured');

    if (shipment.mode !== 'sea') {
      throw new Error('MarineTraffic adapter only supports sea shipments');
    }

    // Resolve vessel IMO — either stored directly or derivable from vesselName
    const imo = shipment.vesselImo;
    if (!imo) throw new Error('vesselImo is required for MarineTraffic lookup');

    const url = `${BASE}/exportvessel/v:8/${apiKey}/vessels/imo:${imo}/protocol:json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`MarineTraffic error: ${res.status}`);
    const data = await res.json();

    const vessel = data?.[0];
    const vesselPosition = vessel
      ? {
          lat:       parseFloat(vessel.LAT),
          lng:       parseFloat(vessel.LON),
          heading:   parseFloat(vessel.HEADING || 0),
          speed:     parseFloat(vessel.SPEED || 0),
          updatedAt: new Date(vessel.TIMESTAMP || Date.now()),
        }
      : null;

    // MarineTraffic does not provide cargo event history in this endpoint
    return {
      provider:       'marinetraffic',
      trackingNumber: imo,
      events:         [], // combine with a cargo tracker for events
      vesselPosition,
      origin:         null,
      destination:    null,
    };
  },
};
