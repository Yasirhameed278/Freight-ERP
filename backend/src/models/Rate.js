const mongoose = require('mongoose');

const rateChargeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD', uppercase: true },
    basis: {
      type: String,
      enum: ['per_container', 'per_cbm', 'per_kg', 'per_shipment', 'per_bl', 'per_awb', 'percentage'],
      default: 'per_container',
    },
    minCharge: Number,
    containerType: String,
    category: {
      type: String,
      enum: ['freight', 'origin', 'destination', 'documentation', 'fuel', 'security', 'other'],
      default: 'freight',
    },
    taxable: { type: Boolean, default: true },
  },
  { _id: true }
);

const rateSchema = new mongoose.Schema(
  {
    rateCode: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    name: String,

    mode: { type: String, enum: ['sea', 'air', 'road', 'rail', 'multimodal', 'courier'], required: true, index: true },
    type: { type: String, enum: ['FCL', 'LCL', 'AIR', 'COURIER', 'BREAK_BULK', 'RORO', 'FTL', 'LTL'] },
    direction: { type: String, enum: ['import', 'export', 'cross_trade', 'domestic'] },

    origin:      { name: String, code: String, country: String, countryCode: String },
    destination: { name: String, code: String, country: String, countryCode: String },
    viaPort:     { name: String, code: String },

    carrier: { type: String, index: true },
    carrierCode: String,
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    serviceLevel: String,
    transitTimeDays: Number,
    frequency: String,

    validFrom: { type: Date, required: true, index: true },
    validTo:   { type: Date, required: true, index: true },

    charges: [rateChargeSchema],
    baseCurrency: { type: String, default: 'USD', uppercase: true },

    markupType:    { type: String, enum: ['percentage', 'flat', 'absolute_sell'], default: 'percentage' },
    markupValue:   { type: Number, default: 0 },
    minMarginPct:  Number,
    minMarginAbs:  Number,

    appliesToClients:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Client' }],
    contractReference:   String,
    isContractRate:      { type: Boolean, default: false },
    isSpotRate:          { type: Boolean, default: false },

    minVolume: Number, maxVolume: Number,
    minWeight: Number, maxWeight: Number,
    commodityCodes: [String],
    excludeDangerousGoods: { type: Boolean, default: false },

    notes: String,
    status: { type: String, enum: ['draft', 'active', 'expired', 'suspended'], default: 'active', index: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

rateSchema.index({ mode: 1, 'origin.code': 1, 'destination.code': 1, validFrom: 1, validTo: 1 });
rateSchema.index({ status: 1, validTo: 1 });

rateSchema.virtual('isCurrentlyValid').get(function () {
  const now = new Date();
  return this.status === 'active' && this.validFrom <= now && this.validTo >= now;
});

module.exports = mongoose.model('Rate', rateSchema);
