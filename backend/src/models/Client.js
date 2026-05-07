const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: 'HQ' },
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: { type: String, required: true },
    countryCode: String,
    isPrimary: { type: Boolean, default: false },
  },
  { _id: true }
);

const contactPersonSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    designation: String,
    department: String,
    email: { type: String, lowercase: true, trim: true },
    phone: String,
    mobile: String,
    isPrimary: { type: Boolean, default: false },
  },
  { _id: true }
);

const clientSchema = new mongoose.Schema(
  {
    clientCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    companyName: { type: String, required: true, trim: true, index: true },
    legalName: String,
    displayName: String,

    type: {
      type: String,
      enum: ['shipper', 'consignee', 'both', 'agent', 'carrier', 'vendor', 'broker', 'trucker'],
      default: 'both',
      index: true,
    },
    industry: String,
    website: String,
    logo: String,

    email: { type: String, lowercase: true, trim: true },
    phone: String,
    fax: String,

    // Tax & Trade IDs (logistics-specific)
    taxNumber: String,
    vatNumber: String,
    eoriNumber: String,
    iecCode: String,
    dunsNumber: String,
    registrationNumber: String,

    addresses: [addressSchema],
    contacts: [contactPersonSchema],

    // Financials
    creditLimit: { type: Number, default: 0, min: 0 },
    creditDays: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'USD', uppercase: true },
    paymentTerms: String,
    bankDetails: {
      bankName: String,
      accountName: String,
      accountNumber: String,
      iban: String,
      swift: String,
      routingNumber: String,
    },
    outstandingBalance: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },

    // Relationship
    accountManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    salesRep: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    status: {
      type: String,
      enum: ['active', 'inactive', 'prospect', 'blacklisted', 'on_hold'],
      default: 'prospect',
      index: true,
    },
    rating: { type: Number, min: 1, max: 5 },

    tags: [String],
    notes: String,

    kycStatus: {
      type: String,
      enum: ['not_submitted', 'pending', 'verified', 'rejected'],
      default: 'not_submitted',
    },
    kycDocuments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

clientSchema.index({ companyName: 'text', clientCode: 'text', email: 'text' });

clientSchema.virtual('primaryAddress').get(function () {
  return this.addresses?.find((a) => a.isPrimary) || this.addresses?.[0];
});

clientSchema.virtual('primaryContact').get(function () {
  return this.contacts?.find((c) => c.isPrimary) || this.contacts?.[0];
});

module.exports = mongoose.model('Client', clientSchema);
