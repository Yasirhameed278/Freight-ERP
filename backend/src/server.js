require('dotenv').config();
require('./config/validateEnv')(); // fail fast on missing required env vars

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

const connectDB = require('./config/db');
const logger = require('./utils/logger');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { globalLimiter } = require('./middleware/rateLimiter');

const app = express();

/* ---------- Core Middleware ---------- */
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : true;

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.options('*', cors());
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(compression({
  filter: (req, res) => {
    if (req.headers.accept === 'text/event-stream') return false;
    return compression.filter(req, res);
  },
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

/* Structured request logging (replaces morgan) */
app.use(logger.requestMiddleware);

/* Global rate limit — applied before all routes */
app.use(globalLimiter);

/* ---------- Health & Root ---------- */
app.get('/', (req, res) => {
  res.json({ name: 'Freight Forwarding ERP API', version: '1.0.0', status: 'running' });
});

app.get('/api/health', (req, res) => {
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: states[mongoose.connection.readyState] || 'unknown',
    environment: process.env.NODE_ENV || 'development',
  });
});

/* ---------- Routes ---------- */
app.use('/api/auth',           require('./routes/authRoutes'));
app.use('/api/clients',        require('./routes/clientRoutes'));
app.use('/api/shipments',      require('./routes/shipmentRoutes'));
app.use('/api/deals',          require('./routes/dealRoutes'));
app.use('/api/documents',      require('./routes/documentRoutes'));
app.use('/api/rates',          require('./routes/rateRoutes'));
app.use('/api/quotes',         require('./routes/quoteRoutes'));
app.use('/api/invoices',       require('./routes/invoiceRoutes'));
app.use('/api/analytics',      require('./routes/analyticsRoutes'));
app.use('/api/activities',     require('./routes/activityRoutes'));
app.use('/api/notifications',  require('./routes/notificationRoutes'));
app.use('/api/portal',         require('./routes/portalRoutes'));
app.use('/api/tasks',          require('./routes/taskRoutes'));
app.use('/api/workflows',      require('./routes/workflowRoutes'));

/* ---------- Error Handlers (must be last) ---------- */
app.use(notFound);
app.use(errorHandler);

/* ---------- Bootstrap ---------- */
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    require('./services/cronJobs').startCronJobs();
    require('./services/trackingPoller').startTrackingPoller();
    const server = app.listen(PORT, () => {
      logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });

    const shutdown = (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(() => {
        mongoose.connection.close(false).then(() => {
          logger.info('Closed all connections.');
          process.exit(0);
        });
      });
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));
  } catch (err) {
    logger.error('Failed to start server', { error: err.message, stack: err.stack });
    process.exit(1);
  }
};

process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION', { error: err?.message, stack: err?.stack });
  process.exit(1);
});

startServer();

module.exports = app;
