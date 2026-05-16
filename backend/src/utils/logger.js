const winston = require('winston');
const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const devFmt = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  const extras = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${ts} [${level}]  ${stack || message}${extras}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'warn' : 'info'),
  format: combine(errors({ stack: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })),
  transports: [
    new winston.transports.Console({
      format:
        process.env.NODE_ENV === 'production'
          ? combine(errors({ stack: true }), timestamp(), json())
          : combine(
              colorize({ all: true }),
              errors({ stack: true }),
              timestamp({ format: 'HH:mm:ss' }),
              devFmt
            ),
    }),
  ],
});

if (process.env.NODE_ENV === 'production' && process.env.LOG_FILE) {
  logger.add(
    new winston.transports.File({
      filename: process.env.LOG_FILE,
      level: 'warn',
      format: combine(errors({ stack: true }), timestamp(), json()),
    })
  );
}

/* Express request logger middleware (replaces morgan) */
logger.requestMiddleware = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'http';
    logger.log(level, `${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`, {
      ip: req.ip,
      ua: req.headers['user-agent']?.slice(0, 80),
    });
  });
  next();
};

module.exports = logger;
