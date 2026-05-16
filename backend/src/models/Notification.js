const { Schema, model } = require('mongoose');

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'shipment_milestone',
        'invoice_overdue',
        'invoice_sent',
        'payment_received',
        'deal_stage',
        'demurrage_warning',
        'ar_alert',
        'portal_quote',
      ],
      required: true,
    },
    title:    { type: String, required: true, maxlength: 200 },
    body:     { type: String, default: '', maxlength: 500 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    read:     { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1 });

module.exports = model('Notification', notificationSchema);
