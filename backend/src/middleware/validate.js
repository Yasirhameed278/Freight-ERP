/**
 * Joi validation middleware.
 * validate(schema) → Express middleware that validates req.body.
 * On failure returns 400 with the first validation message.
 */
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: true,
    stripUnknown: true,
    convert: true,
  });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message.replace(/['"]/g, ''),
    });
  }
  req.body = value;
  next();
};

module.exports = validate;
