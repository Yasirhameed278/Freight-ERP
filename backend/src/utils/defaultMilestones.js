const SEA_EXPORT = [
  { event: 'Booking Confirmed' },
  { event: 'Cargo Received at Warehouse' },
  { event: 'Customs Export Cleared' },
  { event: 'Loaded on Vessel' },
  { event: 'Vessel Departed (ATD)' },
  { event: 'In Transit' },
  { event: 'Vessel Arrived (ATA)' },
  { event: 'Discharged' },
  { event: 'Customs Import Cleared' },
  { event: 'Out for Delivery' },
  { event: 'Delivered' },
];

const SEA_IMPORT = [
  { event: 'Booking Confirmed' },
  { event: 'Loaded at Origin' },
  { event: 'Vessel Departed' },
  { event: 'In Transit' },
  { event: 'Vessel Arrived' },
  { event: 'Discharged' },
  { event: 'Customs Import Cleared' },
  { event: 'Out for Delivery' },
  { event: 'Delivered' },
];

const AIR = [
  { event: 'Booking Confirmed' },
  { event: 'Cargo Tendered' },
  { event: 'Loaded on Flight' },
  { event: 'In Transit' },
  { event: 'Arrived' },
  { event: 'Customs Cleared' },
  { event: 'Delivered' },
];

const ROAD = [
  { event: 'Booking Confirmed' },
  { event: 'Pickup' },
  { event: 'In Transit' },
  { event: 'Border Crossing' },
  { event: 'Delivered' },
];

const buildDefaultMilestones = ({ mode, direction }) => {
  let template;
  if (mode === 'air') template = AIR;
  else if (mode === 'road' || mode === 'rail') template = ROAD;
  else if (mode === 'sea' && direction === 'import') template = SEA_IMPORT;
  else template = SEA_EXPORT;

  return template.map((m) => ({ ...m, status: 'pending' }));
};

module.exports = { buildDefaultMilestones };
