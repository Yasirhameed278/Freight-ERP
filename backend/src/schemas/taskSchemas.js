const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

exports.createTaskSchema = Joi.object({
  title:       Joi.string().trim().min(1).max(300).required(),
  description: Joi.string().trim().max(2000).optional().allow(''),
  status:      Joi.string().valid('open', 'in_progress', 'done', 'cancelled').default('open'),
  priority:    Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
  assignedTo:  objectId.optional(),
  dueAt:       Joi.date().iso().optional(),
  linkedTo: Joi.object({
    kind:  Joi.string().valid('Shipment', 'Deal', 'Invoice', 'Client', 'PortalQuote').required(),
    id:    objectId.required(),
    label: Joi.string().max(200).optional(),
  }).optional(),
  tags: Joi.array().items(Joi.string().trim().max(50)).max(20).default([]),
});

exports.updateTaskSchema = Joi.object({
  title:       Joi.string().trim().min(1).max(300),
  description: Joi.string().trim().max(2000).allow(''),
  status:      Joi.string().valid('open', 'in_progress', 'done', 'cancelled'),
  priority:    Joi.string().valid('low', 'normal', 'high', 'urgent'),
  assignedTo:  objectId.allow(null),
  dueAt:       Joi.date().iso().allow(null),
  tags:        Joi.array().items(Joi.string().trim().max(50)).max(20),
}).min(1);
