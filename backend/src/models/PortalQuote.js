const crypto = require('crypto');
const { Schema, model } = require('mongoose');

const contactSchema = new Schema({
  name:    { type: String, required: true, trim: true },
  email:   { type: String, required: true, lowercase: true, trim: true },
  phone:   { type: String, trim: true },
  company: { type: String, trim: true },
}, { _id: false });

const portLocSchema = new Schema({
  code:    String,
  name:    String,
  city:    String,
  country: String,
}, { _id: false });

const rateOptionSchema = new Schema({
  rateId:      Schema.Types.ObjectId,
  carrier:     String,
  service:     String,
  type:        String,
  transitDays: Number,
  totalSell:   Number,     // internal sell price (not shown to customer)
  portalPrice: Number,     // totalSell + portal markup
  currency:    { type: String, default: 'USD' },
  validTo:     Date,
}, { _id: false });

const bookingSchema = new Schema({
  shipperName:         String,
  shipperAddress:      String,
  shipperContact:      String,
  consigneeName:       String,
  consigneeAddress:    String,
  consigneeContact:    String,
  commodity:           String,
  hsCode:              String,
  readyDate:           Date,
  specialInstructions: String,
}, { _id: false });

const portalQuoteSchema = new Schema(
  {
    quoteRef: { type: String, unique: true, index: true },

    contact:     { type: contactSchema, required: true },
    origin:      portLocSchema,
    destination: portLocSchema,

    mode:      { type: String, enum: ['sea', 'air', 'road', 'courier', 'multimodal'], required: true },
    cargoType: String,
    weight:    Number,
    weightUnit: { type: String, default: 'KG' },
    volume:    Number,
    volumeUnit: { type: String, default: 'CBM' },
    packages:  Number,
    dangerousGoods: { type: Boolean, default: false },
    notes:     String,

    rates:        [rateOptionSchema],
    selectedRate: rateOptionSchema,
    markupPct:    { type: Number, default: 15 },

    // Magic link
    token:       { type: String, unique: true, sparse: true, index: true },
    tokenExpiry: Date,

    status: {
      type: String,
      enum: ['draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'converted'],
      default: 'draft',
      index: true,
    },

    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },

    booking:      bookingSchema,
    linkedQuote:  { type: Schema.Types.ObjectId, ref: 'Quote' },

    viewedAt:   Date,
    acceptedAt: Date,
    sentAt:     Date,
  },
  { timestamps: true }
);

// Unique, human-readable quote reference (PQ-2026-3F7A2C)
portalQuoteSchema.pre('validate', function (next) {
  if (!this.quoteRef) {
    const hex = crypto.randomBytes(3).toString('hex').toUpperCase();
    this.quoteRef = `PQ-${new Date().getFullYear()}-${hex}`;
  }
  next();
});

portalQuoteSchema.index({ 'contact.email': 1 });
portalQuoteSchema.index({ status: 1, createdAt: -1 });

module.exports = model('PortalQuote', portalQuoteSchema);
