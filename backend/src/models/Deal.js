const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['call', 'email', 'meeting', 'task', 'note'], required: true },
    subject: { type: String, required: true },
    description: String,
    dueDate: Date,
    completedAt: Date,
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: true, timestamps: true }
);

const dealSchema = new mongoose.Schema(
  {
    dealCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: String,

    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', index: true },
    contactPerson: String,
    contactEmail: String,
    contactPhone: String,

    stage: {
      type: String,
      enum: ['inquiry', 'quoted', 'confirmed', 'lost', 'on_hold'],
      default: 'inquiry',
      index: true,
    },
    pipeline: { type: String, default: 'default', index: true },
    position: { type: Number, default: 0 },

    estimatedValue: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'USD', uppercase: true },
    probability: { type: Number, min: 0, max: 100, default: 10 },
    weightedValue: { type: Number, default: 0 },

    expectedCloseDate: Date,
    actualCloseDate: Date,

    source: {
      type: String,
      enum: [
        'website', 'referral', 'cold_call', 'email_campaign',
        'social_media', 'trade_show', 'partner', 'inbound', 'other',
      ],
    },
    lostReason: String,
    competitor: String,

    shipmentMode: { type: String, enum: ['sea', 'air', 'road', 'rail', 'multimodal'] },
    shipmentType: {
      type: String,
      enum: ['FCL', 'LCL', 'AIR', 'COURIER', 'BREAK_BULK', 'RORO', 'FTL', 'LTL'],
    },
    direction: { type: String, enum: ['import', 'export', 'cross_trade', 'domestic'] },
    origin: String,
    destination: String,
    cargoDescription: String,
    estimatedVolume: String,
    estimatedWeight: Number,
    frequency: {
      type: String,
      enum: ['one_time', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'yearly'],
    },
    annualPotential: Number,

    convertedToShipments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Shipment' }],

    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    team: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    activities: [activitySchema],
    documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],

    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    tags: [String],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

dealSchema.index({ stage: 1, position: 1 });
dealSchema.index({ owner: 1, stage: 1 });
dealSchema.index({ title: 'text', dealCode: 'text', cargoDescription: 'text' });

dealSchema.virtual('daysInStage').get(function () {
  return Math.floor((Date.now() - this.updatedAt) / (1000 * 60 * 60 * 24));
});

dealSchema.virtual('isStale').get(function () {
  const openStages = ['inquiry', 'quoted'];
  return openStages.includes(this.stage) &&
    (Date.now() - this.updatedAt) > 14 * 24 * 60 * 60 * 1000;
});

dealSchema.pre('save', function (next) {
  this.weightedValue = ((this.estimatedValue || 0) * (this.probability || 0)) / 100;

  if (this.isModified('stage') && ['confirmed', 'lost'].includes(this.stage) && !this.actualCloseDate) {
    this.actualCloseDate = new Date();
  }
  if (this.stage === 'confirmed') this.probability = 100;
  if (this.stage === 'lost') this.probability = 0;

  next();
});

module.exports = mongoose.model('Deal', dealSchema);
