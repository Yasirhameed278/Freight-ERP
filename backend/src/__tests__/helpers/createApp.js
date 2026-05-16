/**
 * Returns a minimal Express app for integration tests.
 * DB connection is managed separately by testDb.js.
 * Env vars are set by setEnv.js via jest.config.js setupFiles.
 */
const express = require('express');
const cookieParser = require('cookie-parser');
const { notFound, errorHandler } = require('../../middleware/errorHandler');

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth',      require('../../routes/authRoutes'));
app.use('/api/tasks',     require('../../routes/taskRoutes'));
app.use('/api/workflows', require('../../routes/workflowRoutes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
