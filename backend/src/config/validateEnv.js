const REQUIRED = [
  'MONGODB_URI',
  'JWT_SECRET',
];

const RECOMMENDED = [
  'JWT_REFRESH_SECRET',
  'JWT_EXPIRES_IN',
  'CORS_ORIGIN',
  'PORT',
];

module.exports = () => {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`\n[env] ❌ Missing required environment variables:\n  ${missing.join('\n  ')}\n`);
    process.exit(1);
  }

  const warnings = RECOMMENDED.filter((k) => !process.env[k]);
  if (warnings.length && process.env.NODE_ENV !== 'test') {
    console.warn(`[env] ⚠ Recommended variables not set: ${warnings.join(', ')}`);
  }

  if (!process.env.JWT_REFRESH_SECRET) {
    process.env.JWT_REFRESH_SECRET = process.env.JWT_SECRET + '_refresh';
  }
};
