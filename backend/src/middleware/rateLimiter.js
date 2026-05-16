const rateLimit = require('express-rate-limit');

const make = (max, windowMinutes, message) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message },
    skip: () => process.env.NODE_ENV === 'test',
  });

/* 300 req / 15 min — applied globally */
const globalLimiter = make(300, 15, 'Too many requests, please try again later.');

/* 20 req / 15 min — auth endpoints */
const authLimiter = make(20, 15, 'Too many authentication attempts, please try again in 15 minutes.');

/* 5 req / 15 min — sensitive actions (bootstrap, password reset) */
const strictLimiter = make(5, 15, 'Rate limit exceeded for this action.');

module.exports = { globalLimiter, authLimiter, strictLimiter };
