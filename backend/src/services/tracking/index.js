const mock        = require('./adapters/mock');
const project44   = require('./adapters/project44');
const searates    = require('./adapters/searates');
const marineTraffic = require('./adapters/marineTraffic');

const ADAPTERS = {
  mock,
  project44,
  searates,
  marinetraffic: marineTraffic,
};

async function getTracking(shipment) {
  const key     = (shipment.trackingProvider || 'mock').toLowerCase();
  const adapter = ADAPTERS[key] || mock;

  try {
    return await adapter.getTracking(shipment);
  } catch (err) {
    if (adapter !== mock) {
      console.warn(`[tracking] ${key} failed (${err.message}), falling back to mock`);
      return await mock.getTracking(shipment);
    }
    throw err;
  }
}

module.exports = { getTracking };
