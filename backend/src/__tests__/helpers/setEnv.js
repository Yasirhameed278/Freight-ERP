/* Sets required env vars before any modules are loaded in tests. */
process.env.NODE_ENV        = 'test';
process.env.JWT_SECRET      = 'test-secret-key-at-least-32-chars-long!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-at-least-32-chars-long!!';
process.env.JWT_EXPIRES_IN  = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.MONGODB_URI     = 'mongodb://localhost:27017/freight_erp_test';
