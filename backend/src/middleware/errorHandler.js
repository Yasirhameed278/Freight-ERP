const logger = require('../utils/logger');

/* ── Optional Sentry / error-monitoring hook ────────────────────
   Set SENTRY_DSN in env and install @sentry/node to enable.
   The hook is a no-op when Sentry is not configured.              */
let captureException = () => {};
if (process.env.SENTRY_DSN) {
  try {
    const Sentry = require('@sentry/node');
    Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV });
    captureException = (err, req) =>
      Sentry.captureException(err, { extra: { url: req.originalUrl, method: req.method } });
    logger.info('[sentry] Error monitoring active');
  } catch {
    logger.warn('[sentry] @sentry/node not installed — monitoring disabled');
  }
}

const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  let message = err.message || 'Internal Server Error';
  let errors = null;

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
      value: e.value,
    }));
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value for ${field}: '${err.keyValue[field]}'`;
  }

  // Mongoose cast error (bad ObjectId, etc.)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') { statusCode = 401; message = 'Invalid token'; }
  if (err.name === 'TokenExpiredError') { statusCode = 401; message = 'Token expired'; }

  // Multer errors
  if (err.name === 'MulterError') { statusCode = 400; message = `Upload error: ${err.message}`; }

  // Rate limit passthrough (express-rate-limit sets status before calling next)
  if (statusCode === 429) message = err.message || 'Too many requests';

  // Log server errors
  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} — ${message}`, { stack: err.stack });
    captureException(err, req);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };
