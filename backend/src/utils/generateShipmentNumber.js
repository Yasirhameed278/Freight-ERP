const Counter = require('../models/Counter');

const generateShipmentNumber = async (mode = 'sea') => {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const seq = await Counter.next(`shipment-${ym}`);
  const prefix = { sea: 'SE', air: 'AE', road: 'RD', rail: 'RL', multimodal: 'MM', courier: 'CR' }[mode] || 'SH';
  return `${prefix}-${ym}-${String(seq).padStart(5, '0')}`;
};

module.exports = generateShipmentNumber;
