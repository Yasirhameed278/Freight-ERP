module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  testTimeout: 30000,
  setupFiles: ['./src/__tests__/helpers/setEnv.js'],
  maxWorkers: 1, // serialize suites — shared local MongoDB, no parallel interference
  forceExit: true,
};
