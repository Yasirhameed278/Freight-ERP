/*
 * Mock tracking adapter — always available, no API key required.
 * Generates realistic events from the shipment's existing milestones
 * and interpolates vessel position between origin and destination ports.
 */

const PORT_COORDS = {
  // Asia-Pacific
  CNSHA: { lat: 31.2304,  lng: 121.4737, name: 'Shanghai' },
  CNNGB: { lat: 29.8683,  lng: 121.5440, name: 'Ningbo' },
  CNSZX: { lat: 22.5279,  lng: 114.0596, name: 'Shenzhen' },
  CNQIN: { lat: 36.1066,  lng: 120.3700, name: 'Qingdao' },
  CNTJN: { lat: 39.1100,  lng: 117.1900, name: 'Tianjin' },
  CNCAN: { lat: 22.5431,  lng: 113.8900, name: 'Guangzhou' },
  SGSIN: { lat: 1.2644,   lng: 103.8222, name: 'Singapore' },
  JPTYO: { lat: 35.6762,  lng: 139.6503, name: 'Tokyo' },
  JPYOK: { lat: 35.4447,  lng: 139.6395, name: 'Yokohama' },
  KRPUS: { lat: 35.1796,  lng: 129.0756, name: 'Busan' },
  TWKHH: { lat: 22.6273,  lng: 120.3014, name: 'Kaohsiung' },
  HKHKG: { lat: 22.3193,  lng: 114.1694, name: 'Hong Kong' },
  MYPEN: { lat: 5.4139,   lng: 100.3300, name: 'Penang' },
  MYPKG: { lat: 2.7380,   lng: 101.5480, name: 'Port Klang' },
  THBKK: { lat: 13.7563,  lng: 100.5018, name: 'Bangkok' },
  VNCLI: { lat: 10.8231,  lng: 106.6297, name: 'Ho Chi Minh City' },
  IDBLW: { lat: -6.2088,  lng: 106.8456, name: 'Jakarta' },
  BDCGP: { lat: 22.3419,  lng: 91.8130,  name: 'Chittagong' },
  LKBOW: { lat: 6.9271,   lng: 79.8612,  name: 'Colombo' },
  INNSA: { lat: 18.9322,  lng: 72.8388,  name: 'Mumbai (JNPT)' },
  INMAA: { lat: 13.0827,  lng: 80.2707,  name: 'Chennai' },
  INPAV: { lat: 20.9517,  lng: 70.3670,  name: 'Pipavav' },
  PKKAR: { lat: 24.8608,  lng: 67.0104,  name: 'Karachi' },
  // Middle East
  AEDXB: { lat: 25.2048,  lng: 55.2708,  name: 'Dubai (Jebel Ali)' },
  AEAUH: { lat: 24.4539,  lng: 54.3773,  name: 'Abu Dhabi' },
  SAJED: { lat: 21.5433,  lng: 39.1728,  name: 'Jeddah' },
  OMSOH: { lat: 23.6133,  lng: 58.5922,  name: 'Sohar' },
  KWSWK: { lat: 29.3700,  lng: 47.9700,  name: 'Kuwait' },
  BMBAH: { lat: 26.2154,  lng: 50.5650,  name: 'Bahrain' },
  // Europe
  NLRTM: { lat: 51.9225,  lng: 4.4792,   name: 'Rotterdam' },
  DEHAM: { lat: 53.5511,  lng: 9.9937,   name: 'Hamburg' },
  BEANR: { lat: 51.2213,  lng: 4.3997,   name: 'Antwerp' },
  GBFXT: { lat: 51.8900,  lng: 1.2867,   name: 'Felixstowe' },
  GBSOU: { lat: 50.9049,  lng: -1.3784,  name: 'Southampton' },
  FRLEH: { lat: 49.4944,  lng: 0.1079,   name: 'Le Havre' },
  ESVLC: { lat: 39.4699,  lng: -0.3763,  name: 'Valencia' },
  ESAGP: { lat: 36.5297,  lng: -6.2922,  name: 'Algeciras' },
  ITGOA: { lat: 44.4056,  lng: 8.9463,   name: 'Genoa' },
  GRPIR: { lat: 37.9414,  lng: 23.6481,  name: 'Piraeus' },
  EGPSD: { lat: 31.2357,  lng: 29.9553,  name: 'Port Said' },
  EGALY: { lat: 31.1975,  lng: 29.8925,  name: 'Alexandria' },
  MAPTM: { lat: 35.7695,  lng: -5.7995,  name: 'Tanger Med' },
  // Americas
  USNYC: { lat: 40.6892,  lng: -74.0445, name: 'New York/NJ' },
  USLAX: { lat: 33.7395,  lng: -118.2694, name: 'Los Angeles' },
  USLGB: { lat: 33.7543,  lng: -118.2165, name: 'Long Beach' },
  USSAV: { lat: 32.0835,  lng: -81.0998, name: 'Savannah' },
  USHOU: { lat: 29.7604,  lng: -95.3698, name: 'Houston' },
  USMIA: { lat: 25.7617,  lng: -80.1918, name: 'Miami' },
  CAVAN: { lat: 49.2827,  lng: -123.1207, name: 'Vancouver' },
  BRSAO: { lat: -23.9553, lng: -46.3328, name: 'Santos' },
  // Africa
  ZADUR: { lat: -29.8587, lng: 31.0218,  name: 'Durban' },
  ZAPZB: { lat: -33.9249, lng: 18.4241,  name: 'Cape Town' },
  NGAPP: { lat: 6.4541,   lng: 3.3947,   name: 'Apapa / Lagos' },
};

function interpolatePosition(shipment) {
  if (!['sea', 'air'].includes(shipment.mode)) return null;

  const originCode = shipment.portOfLoading?.code;
  const destCode   = shipment.portOfDischarge?.code;
  const origin = PORT_COORDS[originCode];
  const dest   = PORT_COORDS[destCode];

  if (!origin || !dest) return null;

  const etd = shipment.etd ? new Date(shipment.etd).getTime() : null;
  const eta = shipment.eta ? new Date(shipment.eta).getTime() : null;
  const now = Date.now();

  let ratio = 0.5; // default: midway
  if (etd && eta && eta > etd) {
    ratio = Math.min(1, Math.max(0, (now - etd) / (eta - etd)));
  }

  const lat = origin.lat + (dest.lat - origin.lat) * ratio;
  const lng = origin.lng + (dest.lng - origin.lng) * ratio;

  const dLat = dest.lat - origin.lat;
  const dLng = dest.lng - origin.lng;
  const heading = ((Math.atan2(dLng, dLat) * 180) / Math.PI + 360) % 360;

  return { lat, lng, heading: Math.round(heading), speed: 14 + Math.round(Math.random() * 4), updatedAt: new Date() };
}

function buildEvents(shipment) {
  const events = [];
  const milestones = shipment.milestones || [];

  for (const m of milestones) {
    if (m.status === 'completed' && m.actualDate) {
      events.push({
        timestamp:      new Date(m.actualDate),
        event:          m.event,
        location:       m.location || shipment.portOfLoading?.name || '',
        milestoneMatch: m.event,
        status:         'completed',
        provider:       'mock',
      });
    } else if (m.status === 'pending' && m.plannedDate && new Date(m.plannedDate) < new Date()) {
      // Planned date has passed — surface as a detected event
      events.push({
        timestamp:      new Date(m.plannedDate),
        event:          m.event,
        location:       m.location || '',
        milestoneMatch: m.event,
        status:         'detected',
        provider:       'mock',
      });
    }
  }

  return events.sort((a, b) => b.timestamp - a.timestamp);
}

module.exports = {
  name: 'mock',

  async getTracking(shipment) {
    const originCode = shipment.portOfLoading?.code;
    const destCode   = shipment.portOfDischarge?.code;
    const origin = originCode
      ? { ...PORT_COORDS[originCode], code: originCode } || null
      : null;
    const destination = destCode
      ? { ...PORT_COORDS[destCode], code: destCode } || null
      : null;

    const trackingNumber =
      shipment.mblNumber ||
      shipment.hblNumber ||
      shipment.awbNumber ||
      shipment.containers?.[0]?.containerNumber ||
      shipment.shipmentNumber;

    return {
      provider:        'mock',
      trackingNumber,
      events:          buildEvents(shipment),
      vesselPosition:  interpolatePosition(shipment),
      origin,
      destination,
    };
  },

  // Exported for use in other modules (e.g., the detail page API)
  PORT_COORDS,
};
