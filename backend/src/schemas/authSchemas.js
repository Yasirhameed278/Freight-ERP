const Joi = require('joi');

const password = Joi.string().min(8).max(128).required().messages({
  'string.min': 'Password must be at least 8 characters',
  'string.max': 'Password must not exceed 128 characters',
  'any.required': 'Password is required',
});

exports.loginSchema = Joi.object({
  email:    Joi.string().email().lowercase().trim().required(),
  password: Joi.string().required(),
});

exports.registerSchema = Joi.object({
  firstName:  Joi.string().trim().min(1).max(100).required(),
  lastName:   Joi.string().trim().min(1).max(100).required(),
  email:      Joi.string().email().lowercase().trim().required(),
  password,
  phone:      Joi.string().trim().max(30).optional().allow(''),
  clientCode: Joi.string().trim().uppercase().required(),
});

exports.createStaffSchema = Joi.object({
  firstName:  Joi.string().trim().min(1).max(100).required(),
  lastName:   Joi.string().trim().min(1).max(100).required(),
  email:      Joi.string().email().lowercase().trim().required(),
  password,
  phone:      Joi.string().trim().max(30).optional().allow(''),
  role:       Joi.string().valid('admin','manager','operations','sales','finance','customer_service','agent').optional(),
  department: Joi.string().optional().allow(''),
  branch:     Joi.string().optional().allow(''),
});

exports.updatePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: password,
});

exports.bootstrapSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(100).required(),
  lastName:  Joi.string().trim().min(1).max(100).required(),
  email:     Joi.string().email().lowercase().trim().required(),
  password,
});
