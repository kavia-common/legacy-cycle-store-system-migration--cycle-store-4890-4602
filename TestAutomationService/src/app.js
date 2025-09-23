const cors = require('cors');
const express = require('express');
const routes = require('./routes');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../swagger');

// Initialize express app
const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.set('trust proxy', true);

// Swagger UI with dynamic server
app.use('/docs', swaggerUi.serve, (req, res, next) => {
  const host = req.get('host');
  let protocol = req.protocol;

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
      { url: `${protocol}://${fullHost}` },
    ],
  };
  swaggerUi.setup(dynamicSpec)(req, res, next);
});

// Body parser
app.use(express.json({ limit: '2mb' }));

// Very light auth placeholder (replace with real OAuth2 introspection/JWT)
app.use((req, res, next) => {
  // In production, validate Authorization header and populate req.user
  req.user = { id: 'system', roles: ['admin', 'tester', 'viewer'] };
  next();
});

// Routes
app.use('/', routes);

// Error handling middleware
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Centralized error handler
  // Prefer controllers to convert to structured error, this is a final fallback
  console.error(err.stack);
  res.status(500).json({
    code: '500',
    message: 'Internal Server Error',
  });
});

module.exports = app;
