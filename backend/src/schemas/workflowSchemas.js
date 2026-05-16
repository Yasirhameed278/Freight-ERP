const Joi = require('joi');

const conditionSchema = Joi.object({
  field:    Joi.string().trim().max(100).required(),
  operator: Joi.string().valid('eq', 'neq', 'in', 'not_in', 'gt', 'lt').required(),
  value:    Joi.alternatives().try(
    Joi.string(),
    Joi.number(),
    Joi.boolean(),
    Joi.array().items(Joi.string(), Joi.number())
  ).required(),
});

const actionSchema = Joi.object({
  type: Joi.string().valid('create_task', 'send_notification').required(),

  // create_task fields
  taskTitle:      Joi.string().trim().max(300).when('type', { is: 'create_task', then: Joi.required() }),
  taskDesc:       Joi.string().trim().max(2000).optional().allow(''),
  assignToType:   Joi.string().valid('role', 'creator', 'assignedTo').when('type', { is: 'create_task', then: Joi.required() }),
  assignRole:     Joi.string().when('assignToType', { is: 'role', then: Joi.required() }),
  dueDays:        Joi.number().integer().min(0).max(365).optional(),
  dueHours:       Joi.number().integer().min(0).max(8760).optional(),
  priority:       Joi.string().valid('low', 'normal', 'high', 'urgent').optional(),

  // send_notification fields
  notifTitle:     Joi.string().trim().max(200).when('type', { is: 'send_notification', then: Joi.required() }),
  notifBody:      Joi.string().trim().max(1000).optional().allow(''),
  notifRoles:     Joi.array().items(Joi.string()).when('type', { is: 'send_notification', then: Joi.required() }),
});

exports.createRuleSchema = Joi.object({
  name:        Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().trim().max(1000).optional().allow(''),
  active:      Joi.boolean().default(true),
  trigger: Joi.object({
    entity:     Joi.string().valid('Shipment', 'Deal', 'Invoice').required(),
    event:      Joi.string().valid('status_changed', 'stage_changed', 'milestone_completed', 'created').required(),
    conditions: Joi.array().items(conditionSchema).max(10).default([]),
  }).required(),
  actions: Joi.array().items(actionSchema).min(1).max(10).required(),
});

exports.updateRuleSchema = exports.createRuleSchema.fork(
  ['name', 'trigger', 'actions'],
  (s) => s.optional()
).min(1);
