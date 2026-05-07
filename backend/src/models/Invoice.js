const mongoose = require('mongoose');

const invoiceLineSchema = new mongoose.Schema(
  {
    code: String,
    description: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, required: true },
    amount: { type: Number, required: true },
    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    total: { type: Number, required: true },
  },
  { _id: true }
);

const paymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    paidOn: { type: Date, required: true },
    method: {
      type: String,
      enum: ['bank_transfer', 'cheque', 'cash', 'card', 'online', 'other'],
      default: 'bank_transfer',
    },
    reference: String,
    notes: String,
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: true, timestamps: true }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    type: { type: String, enum: ['ar', 'ap', 'credit_note', 'debit_note'], default: 'ar', index: true },

    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },

    shipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', index: true },
    quote:    { type: mongoose.Schema.Types.ObjectId, ref: 'Quote' },

    issueDate: { type: Date, default: Date.now, required: true },
    dueDate:   { type: Date, required: true },
    paidDate:  Date,

    lines: [invoiceLineSchema],
    subtotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    total:    { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    amountDue:  { type: Number, default: 0 },
    currency: { type: String, default: 'USD', uppercase: true },
    exchangeRate: { type: Number, default: 1 },

    payments: [paymentSchema],

    status: {
      type: String,
      enum: ['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled', 'written_off'],
      default: 'draft',
      index: true,
    },

    taxNumber: String,
    poNumber: String,
    paymentTerms: String,
    notes: String,

    sentAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

invoiceSchema.index({ client: 1, status: 1 });
invoiceSchema.index({ status: 1, dueDate: 1 });

invoiceSchema.virtual('isOverdue').get(function () {
  return ['sent', 'partially_paid'].includes(this.status) && this.dueDate < new Date();
});
invoiceSchema.virtual('daysPastDue').get(function () {
  if (!this.isOverdue) return 0;
  return Math.floor((Date.now() - this.dueDate) / (1000 * 60 * 60 * 24));
});

invoiceSchema.pre('save', function (next) {
  for (const line of this.lines) {
    line.amount = +(((line.unitPrice || 0) * (line.quantity || 1))).toFixed(2);
    line.taxAmount = +((line.amount * (line.taxRate || 0)) / 100).toFixed(2);
    line.total = +(line.amount + line.taxAmount).toFixed(2);
  }
  this.subtotal = +this.lines.reduce((s, l) => s + l.amount, 0).toFixed(2);
  this.taxTotal = +this.lines.reduce((s, l) => s + l.taxAmount, 0).toFixed(2);
  this.total = +(this.subtotal + this.taxTotal).toFixed(2);

  this.amountPaid = +this.payments.reduce((s, p) => s + (p.amount || 0), 0).toFixed(2);
  this.amountDue = +(this.total - this.amountPaid).toFixed(2);

  if (this.amountDue <= 0 && this.total > 0) {
    this.status = 'paid';
    if (!this.paidDate) this.paidDate = new Date();
  } else if (this.amountPaid > 0 && this.amountPaid < this.total) {
    if (this.status !== 'cancelled' && this.status !== 'written_off') {
      this.status = 'partially_paid';
    }
  } else if (
    ['sent', 'partially_paid'].includes(this.status) &&
    this.dueDate < new Date()
  ) {
    this.status = 'overdue';
  }
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);
