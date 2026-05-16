const mongoose = require('mongoose');

/* ---------- Sub-schemas ---------- */

const portSchema = new mongoose.Schema(
  {
    name: String,
    code: { type: String, uppercase: true, trim: true },
    city: String,
    country: String,
    countryCode: String,
  },
  { _id: false }
);

const containerSchema = new mongoose.Schema(
  {
    containerNumber: { type: String, uppercase: true, trim: true },
    containerType: {
      type: String,
      enum: [
        '20GP', '40GP', '40HC', '45HC',
        '20RF', '40RF', '40HRF',
        '20OT', '40OT',
        '20FR', '40FR',
        '20TK', '20BU',
        'LCL',
      ],
    },
    sealNumber: String,
    tareWeight: Number,
    grossWeight: Number,
    netWeight: Number,
    cbm: Number,
    packages: Number,
  },
  { _id: true }
);

const cargoItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    hsCode: { type: String, trim: true, index: true },
    packages: Number,
    packageType: {
      type: String,
      enum: ['PALLET', 'CARTON', 'BOX', 'BAG', 'DRUM', 'CRATE', 'BUNDLE', 'ROLL', 'PIECE', 'OTHER'],
    },
    grossWeight: Number,
    netWeight: Number,
    weightUnit: { type: String, default: 'KG', enum: ['KG', 'LB', 'MT'] },
    volume: Number,
    volumeUnit: { type: String, default: 'CBM', enum: ['CBM', 'CFT'] },
    marks: String,
    declaredValue: Number,
    currency: { type: String, default: 'USD', uppercase: true },

    dangerousGoods: { type: Boolean, default: false },
    imoClass: String,
    unNumber: String,
    packingGroup: { type: String, enum: ['I', 'II', 'III'] },
  },
  { _id: true }
);

const milestoneSchema = new mongoose.Schema(
  {
    event: { type: String, required: true },
    location: String,
    plannedDate: Date,
    actualDate: Date,
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'delayed', 'skipped'],
      default: 'pending',
    },
    remarks: String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: true, timestamps: true }
);

const chargeSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    code: String,
    category: {
      type: String,
      enum: ['freight', 'origin', 'destination', 'customs', 'documentation', 'insurance', 'handling', 'other'],
    },
    type: { type: String, enum: ['cost', 'revenue'], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD', uppercase: true },
    exchangeRate: { type: Number, default: 1 },
    quantity: { type: Number, default: 1 },
    unit: String,
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    invoiceNumber: String,
    invoiceDate: Date,
    paid: { type: Boolean, default: false },
  },
  { _id: true }
);

/* ---------- Main schema ---------- */

const shipmentSchema = new mongoose.Schema(
  {
    shipmentNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    jobNumber: { type: String, trim: true, index: true },
    referenceNumber: String,

    mode: {
      type: String,
      enum: ['sea', 'air', 'road', 'rail', 'multimodal', 'courier'],
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['FCL', 'LCL', 'AIR', 'COURIER', 'BREAK_BULK', 'RORO', 'FTL', 'LTL'],
      index: true,
    },
    direction: {
      type: String,
      enum: ['import', 'export', 'cross_trade', 'domestic'],
      required: true,
      index: true,
    },

    // Parties
    shipper:     { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    consignee:   { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    notifyParty: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    customer:    { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    agent:       { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },

    // Bills & references
    mblNumber: { type: String, trim: true, index: true },
    hblNumber: { type: String, trim: true, index: true },
    bookingNumber: String,
    awbNumber: { type: String, trim: true, index: true },
    masterAwbNumber: String,

    // Carrier & conveyance
    carrier: String,
    carrierCode: String,
    vesselName: String,
    voyageNumber: String,
    flightNumber: String,
    truckNumber: String,
    driverName: String,

    // Routing
    placeOfReceipt:  portSchema,
    portOfLoading:   portSchema,
    portOfDischarge: portSchema,
    placeOfDelivery: portSchema,
    transhipmentPort: portSchema,

    // Dates / milestones
    bookingDate: Date,
    cargoReadyDate: Date,
    pickupDate: Date,
    cutoffDate: Date,
    etd: Date,
    atd: Date,
    eta: Date,
    ata: Date,
    deliveryDate: Date,
    freeTimeExpiry: Date,

    // Cargo
    containers: [containerSchema],
    cargo: [cargoItemSchema],
    totalPackages: Number,
    totalGrossWeight: Number,
    totalNetWeight: Number,
    totalVolume: Number,
    chargeableWeight: Number,

    // Commercial
    incoterm: {
      type: String,
      enum: ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'],
    },
    paymentTerms: String,
    invoiceValue: Number,
    invoiceCurrency: { type: String, uppercase: true },

    // Customs
    customsStatus: {
      type: String,
      enum: [
        'not_started', 'documents_pending', 'submitted',
        'under_examination', 'cleared', 'held', 'rejected',
      ],
      default: 'not_started',
    },
    customsDeclarationNumber: String,
    customsClearanceDate: Date,
    customsDuty: Number,
    customsBroker: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },

    // Lifecycle status
    status: {
      type: String,
      enum: [
        'quote', 'booked', 'pickup_scheduled', 'cargo_received',
        'customs_export', 'loaded', 'in_transit', 'transhipment',
        'arrived', 'customs_import', 'cleared', 'out_for_delivery',
        'delivered', 'completed', 'cancelled', 'on_hold',
      ],
      default: 'quote',
      index: true,
    },
    milestones: [milestoneSchema],

    // Financials
    charges: [chargeSchema],
    totalRevenue: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    profit: { type: Number, default: 0 },
    profitMargin: { type: Number, default: 0 },
    currency: { type: String, default: 'USD', uppercase: true },

    documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],

    trackingUrl: String,
    lastTrackingUpdate: Date,
    trackingProvider: String,
    vesselPosition: {
      lat:       Number,
      lng:       Number,
      heading:   Number,
      speed:     Number,
      updatedAt: Date,
    },

    operationsManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    salesRep:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    customsAgent:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    team:              [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    tags: [String],
    notes: String,
    internalNotes: String,

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Approval gate
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    approvedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt:   Date,
    approvalNote: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

shipmentSchema.index({ status: 1, createdAt: -1 });
shipmentSchema.index({ customer: 1, status: 1, createdAt: -1 });
shipmentSchema.index({ salesRep: 1, status: 1 });
shipmentSchema.index({ eta: 1, status: 1 });
shipmentSchema.index({ shipmentNumber: 'text', mblNumber: 'text', hblNumber: 'text', awbNumber: 'text' });

shipmentSchema.virtual('isOverdue').get(function () {
  if (!this.eta) return false;
  return this.eta < new Date() && !['delivered', 'completed', 'cancelled'].includes(this.status);
});

shipmentSchema.virtual('transitDays').get(function () {
  if (!this.atd || !this.ata) return null;
  return Math.ceil((this.ata - this.atd) / (1000 * 60 * 60 * 24));
});

shipmentSchema.pre('save', function (next) {
  if (this.isModified('charges')) {
    const revenue = this.charges
      .filter((c) => c.type === 'revenue')
      .reduce((sum, c) => sum + (c.amount || 0) * (c.exchangeRate || 1) * (c.quantity || 1), 0);
    const cost = this.charges
      .filter((c) => c.type === 'cost')
      .reduce((sum, c) => sum + (c.amount || 0) * (c.exchangeRate || 1) * (c.quantity || 1), 0);
    this.totalRevenue = revenue;
    this.totalCost = cost;
    this.profit = revenue - cost;
    this.profitMargin = revenue > 0 ? (this.profit / revenue) * 100 : 0;
  }
  next();
});

module.exports = mongoose.model('Shipment', shipmentSchema);
