const { Schema, model } = require('mongoose');

const taskSchema = new Schema(
  {
    title:       { type: String, required: true, maxlength: 300 },
    description: { type: String, maxlength: 2000 },

    status: {
      type: String,
      enum: ['open', 'in_progress', 'review', 'done', 'cancelled'],
      default: 'open',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },

    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    createdBy:  { type: Schema.Types.ObjectId, ref: 'User' },

    dueAt:       { type: Date, index: true },
    completedAt: Date,
    slaBreached: { type: Boolean, default: false, index: true },

    linkedTo: {
      kind:  { type: String, enum: ['Shipment', 'Deal', 'Invoice', 'Client', 'PortalQuote'] },
      id:    Schema.Types.ObjectId,
      label: String,   // e.g. "SHP-2026-001" — avoids a populate for display
    },

    workflowRule: { type: Schema.Types.ObjectId, ref: 'WorkflowRule' },
    tags:         [String],
  },
  { timestamps: true }
);

taskSchema.index({ assignedTo: 1, status: 1, dueAt: 1 });
taskSchema.index({ 'linkedTo.kind': 1, 'linkedTo.id': 1 });
taskSchema.index({ status: 1, dueAt: 1 });
taskSchema.index({ slaBreached: 1, status: 1 });
taskSchema.index({ createdBy: 1, createdAt: -1 });

module.exports = model('Task', taskSchema);
