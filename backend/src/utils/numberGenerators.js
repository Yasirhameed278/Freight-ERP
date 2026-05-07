const Counter = require('../models/Counter');

const ym = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const make = (prefix, key, padding = 4) => async () => {
  const seq = await Counter.next(`${key}-${ym()}`);
  return `${prefix}-${ym()}-${String(seq).padStart(padding, '0')}`;
};

module.exports = {
  generateClientCode:    make('CL',  'client', 4),
  generateRateCode:      make('R',   'rate', 5),
  generateQuoteNumber:   make('QT',  'quote', 4),
  generateInvoiceNumber: make('INV', 'invoice', 5),
  generateDealCode:      make('DL',  'deal', 4),
  generateDocumentNumber: make('DOC', 'doc', 5),
};
