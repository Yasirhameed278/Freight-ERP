const mongoose = require('mongoose');

const quoteLineSchema = new mongoose.Schema(
  {
    code: String,
    description: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    unit: String,
    buyRate: { type: Number, default: 0 },
    sellRate: { type: Number, required: true },
    currency: { type: String, default: 'USD', uppercase: true },
    margin: { type: Number, default: 0 },
    marginPct: { type: Number, default: 0 },
  },
  { _id: true }
);

const quoteSchema = new mongoose.Schema(
  {
    quoteNumber: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    revision: { type: Number, default: 1 },

    deal:   { type: mongoose.Schema.Types.ObjectId, ref: 'Deal', index: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },

    mode:      { type: String, enum: ['sea', 'air', 'road', 'rail', 'multimodal', 'courier'], required: true },
    type:      { type: String, enum: ['FCL', 'LCL', 'AIR', 'COURIER', 'BREAK_BULK', 'RORO', 'FTL', 'LTL'] },
    direction: { type: String, enum: ['import', 'export', 'cross_trade', 'domestic'] },
    origin:    { name: String, code: String, country: String },
    destination: { name: String, code: String, country: String },

    cargoDescription: String,
    hsCode: String,
    dangerousGoods: { type: Boolean, default: false },
    weight: Number,
    volume: Number,
    containers: [{ type: { type: String }, quantity: Number }],

    incoterm: { type: String, enum: ['EXW','FCA','FAS','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP'] },

    sourceRates: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Rate' }],

    lines: [quoteLineSchema],

    subtotalBuy: { type: Number, default: 0 },
    subtotalSell: { type: Number, default: 0 },
    totalMargin: { type: Number, default: 0 },
    totalMarginPct: { type: Number, default: 0 },
    currency: { type: String, default: 'USD', uppercase: true },

    validUntil: { type: Date, required: true },
    transitTimeDays: Number,
    notes: String,
    termsAndConditions: String,

    status: {
      type: String,
      enum: ['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'],
      default: 'draft',
      index: true,
    },

    sentAt: Date,
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    acceptedAt: Date,
    rejectedAt: Date,
    rejectionReason: String,
    convertedToShipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment' },

    salesRep: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

quoteSchema.pre('save', function (next) {
  let buy = 0, sell = 0;
  for (const line of this.lines) {
    const lineBuy = (line.buyRate || 0) * (line.quantity || 1);
    const lineSell = (line.sellRate || 0) * (line.quantity || 1);
    line.margin = lineSell - lineBuy;
    line.marginPct = lineSell > 0 ? ((lineSell - lineBuy) / lineSell) * 100 : 0;
    buy += lineBuy;
    sell += lineSell;
  }
  this.subtotalBuy = +buy.toFixed(2);
  this.subtotalSell = +sell.toFixed(2);
  this.totalMargin = +(sell - buy).toFixed(2);
  this.totalMarginPct = sell > 0 ? +(((sell - buy) / sell) * 100).toFixed(2) : 0;

  if (this.validUntil < new Date() && this.status === 'sent') {
    this.status = 'expired';
  }
  next();
});

module.exports = mongoose.model('Quote', quoteSchema);
