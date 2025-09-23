const express = require('express');
const routes = require('./routes');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../swagger');
const { 
  authenticate, 
  authorize, 
  optionalAuth, 
  rateLimit, 
  requestLogger, 
  errorHandler, 
  cors,
  passport 
} = require('./middleware');

// Initialize express app
const app = express();

// Trust proxy for accurate IP addresses
app.set('trust proxy', true);

// Initialize Passport
app.use(passport.initialize());

// CORS middleware
app.use(cors);

// Request logging middleware
app.use(requestLogger);

// Rate limiting
app.use(rateLimit(15 * 60 * 1000, 100)); // 100 requests per 15 minutes

// Body parser
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Swagger UI with dynamic server and authentication
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

// OAuth2 authentication routes
app.get('/auth/oauth2', passport.authenticate('oauth2'));
app.get('/auth/oauth2/callback', 
  passport.authenticate('oauth2', { session: false }),
  (req, res) => {
    // Generate JWT token for the authenticated user
    const { generateToken } = require('./middleware');
    const token = generateToken(req.user);
    
    // In production, you might redirect to a frontend app with the token
    res.json({
      message: 'Authentication successful',
      token,
      user: {
        id: req.user.id,
        roles: req.user.roles
      }
    });
  }
);

// Health check route (no authentication required)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Test Automation Service is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: require('../package.json').version
  });
});

// Protected routes with authentication
app.use('/', optionalAuth, routes);

// Apply authentication to API routes that need it
app.use('/test-suites', authenticate);
app.use('/test-results', authenticate);
app.use('/reports', authenticate);
app.use('/webhooks', authenticate, authorize(['admin', 'tester']));
app.use('/audit', authenticate, authorize(['admin']));

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;
