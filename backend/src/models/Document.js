const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    documentNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    originalName: String,
    description: String,

    category: {
      type: String,
      required: true,
      index: true,
      enum: [
        // Transport documents
        'master_bl', 'house_bl', 'bill_of_lading', 'sea_waybill',
        'air_waybill', 'master_awb', 'house_awb',
        'cmr', 'rail_consignment_note',
        // Commercial
        'commercial_invoice', 'proforma_invoice', 'packing_list',
        'purchase_order', 'sales_contract', 'quotation',
        // Customs & origin
        'certificate_of_origin', 'customs_declaration',
        'import_license', 'export_license',
        // Compliance & inspection
        'insurance_certificate', 'inspection_certificate',
        'phytosanitary', 'fumigation', 'health_certificate',
        'dangerous_goods_declaration', 'msds',
        // Operational
        'arrival_notice', 'delivery_order', 'booking_confirmation',
        'shipping_instruction', 'proof_of_delivery',
        // Finance
        'letter_of_credit', 'bank_guarantee', 'payment_receipt',
        // Other
        'kyc', 'contract', 'other',
      ],
    },

    fileUrl: { type: String, required: true },
    storageKey: String,
    storageProvider: {
      type: String,
      enum: ['local', 's3', 'gcs', 'azure'],
      default: 'local',
    },
    fileSize: Number,
    mimeType: String,
    fileExtension: String,
    checksum: String,

    version: { type: Number, default: 1 },
    previousVersion: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    isLatest: { type: Boolean, default: true },

    relatedTo: {
      entityType: {
        type: String,
        enum: ['Shipment', 'Deal', 'Client', 'User', 'Invoice', 'Quote'],
      },
      entityId: { type: mongoose.Schema.Types.ObjectId, refPath: 'relatedTo.entityType' },
    },
    shipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', index: true },
    deal:     { type: mongoose.Schema.Types.ObjectId, ref: 'Deal', index: true },
    client:   { type: mongoose.Schema.Types.ObjectId, ref: 'Client', index: true },

    documentDate: Date,
    expiryDate: Date,
    issuer: String,
    issuingAuthority: String,
    referenceNumber: String,

    status: {
      type: String,
      enum: ['draft', 'pending_review', 'approved', 'rejected', 'expired', 'archived'],
      default: 'draft',
      index: true,
    },
    visibility: {
      type: String,
      enum: ['private', 'internal', 'client', 'public'],
      default: 'internal',
    },

    ocrText: { type: String, select: false },
    extractedData: { type: mongoose.Schema.Types.Mixed },
    isOcrProcessed: { type: Boolean, default: false },

    tags: [String],

    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectedAt: Date,
    rejectionReason: String,

    downloadCount: { type: Number, default: 0 },
    lastAccessedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

documentSchema.index({ name: 'text', description: 'text', tags: 'text', referenceNumber: 'text' });
documentSchema.index({ 'relatedTo.entityType': 1, 'relatedTo.entityId': 1 });

documentSchema.virtual('isExpired').get(function () {
  return this.expiryDate && this.expiryDate < new Date();
});

documentSchema.virtual('expiresInDays').get(function () {
  if (!this.expiryDate) return null;
  return Math.ceil((this.expiryDate - Date.now()) / (1000 * 60 * 60 * 24));
});

module.exports = mongoose.model('Document', documentSchema);
