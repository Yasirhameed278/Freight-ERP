const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      required: true,
      enum: ['Shipment', 'Deal', 'Client', 'Document', 'Quote', 'Invoice', 'Rate', 'User'],
      index: true,
    },
    entityId:   { type: mongoose.Schema.Types.ObjectId, required: true, index: true, refPath: 'entityType' },
    action:     {
      type: String,
      required: true,
      enum: ['create', 'update', 'delete', 'status_change', 'assign', 'approve',
             'reject', 'send', 'pay', 'cancel', 'login', 'view', 'download', 'comment'],
      index: true,
    },
    summary:   { type: String, required: true },
    diff:      { type: mongoose.Schema.Types.Mixed },
    metadata:  { type: mongoose.Schema.Types.Mixed },
    user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    ipAddress: String,
    userAgent: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activitySchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
