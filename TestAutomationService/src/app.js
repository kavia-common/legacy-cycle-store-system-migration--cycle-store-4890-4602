const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const crypto = require('crypto');
const routes = require('./routes');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../swagger');
const logger = require('./middleware/logger');

// Initialize express app
const app = express();

// Security headers
app.use(helmet());

// Optional HTTPS enforcement behind a proxy/load balancer
app.set('trust proxy', true);
app.use((req, res, next) => {
  if ((process.env.FORCE_HTTPS || 'false').toLowerCase() === 'true') {
    const xfProto = (req.headers['x-forwarded-proto'] || '').toString().toLowerCase();
    if (!req.secure && xfProto !== 'https') {
      const host = req.get('host');
      return res.redirect(301, `https://${host}${req.originalUrl}`);
    }
  }
  return next();
});

// CORS with env-driven allowlist
const allowedOrigins = (process.env.CORS_ORIGINS || '*')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS not allowed'), false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id']
}));

// Request ID
app.use((req, res, next) => {
  const reqId = req.header('X-Request-Id') || crypto.randomUUID();
  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
});

// Request logging (privacy-preserving)
app.use(logger);

// Swagger docs with dynamic server URL
app.use('/docs', swaggerUi.serve, (req, res, next) => {
  const host = req.get('host');           // may or may not include port
  let protocol = req.protocol;          // http or https

  const actualPort = req.socket.localPort;
  const hasPort = host.includes(':');
  
  const needsPort =
    !hasPort &&
    ((protocol === 'http' && actualPort !== 80) ||
     (protocol === 'https' && actualPort !== 443));
  const fullHost = needsPort ? `${host}:${actualPort}` : host;
  protocol = req.secure ? 'https' : protocol;

  const dynamicSpec = {
    ...swaggerSpec,
    servers: [
      {
        url: `${protocol}://${fullHost}`,
      },
    ],
  };
  swaggerUi.setup(dynamicSpec)(req, res, next);
});

// Parse JSON request body
app.use(express.json({ limit: '1mb' }));

// Mount routes
app.use('/', routes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`[${req.id}]`, err.stack || err.message || err);
  res.status(500).json({
    status: 'error',
    message: 'Internal Server Error',
    requestId: req.id
  });
});

module.exports = app;
