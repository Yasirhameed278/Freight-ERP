const { Schema, model } = require('mongoose');

const conditionSchema = new Schema({
  field:    { type: String, required: true },  // e.g. 'status', 'mode'
  operator: { type: String, enum: ['eq', 'neq', 'in', 'not_in'], default: 'eq' },
  value:    Schema.Types.Mixed,                 // string | string[]
}, { _id: false });

const actionSchema = new Schema({
  type: { type: String, enum: ['create_task', 'send_notification'], required: true },

  // create_task fields
  taskTitle:    String,
  taskDesc:     String,
  assignToType: { type: String, enum: ['role', 'creator', 'assignedTo'] },
  assignRole:   String,   // role string when assignToType === 'role'
  dueDays:      { type: Number, default: 0 },
  dueHours:     { type: Number, default: 24 },
  priority:     { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },

  // send_notification fields
  notifTitle:   String,
  notifBody:    String,
  notifRoles:   [String],
}, { _id: false });

const workflowRuleSchema = new Schema(
  {
    name:        { type: String, required: true, maxlength: 200 },
    description: { type: String, maxlength: 500 },
    active:      { type: Boolean, default: true, index: true },

    trigger: {
      entity:     { type: String, enum: ['Shipment', 'Deal', 'Invoice'], required: true },
      event:      { type: String, enum: ['status_changed', 'stage_changed', 'milestone_completed', 'created'], required: true },
      conditions: [conditionSchema],
    },

    actions: {
      type: [actionSchema],
      validate: [(v) => v.length > 0, 'At least one action required'],
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    runCount:  { type: Number, default: 0 },
    lastRunAt: Date,
  },
  { timestamps: true }
);

workflowRuleSchema.index({ 'trigger.entity': 1, 'trigger.event': 1, active: 1 });

module.exports = model('WorkflowRule', workflowRuleSchema);
