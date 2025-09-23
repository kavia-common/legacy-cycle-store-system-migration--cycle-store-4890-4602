'use strict';

const auth = require('./auth');
const { logToMonitoring, reportMetric } = require('../services/notificationService');

// PUBLIC_INTERFACE
function requestLogger(req, res, next) {
  /** Log all requests for monitoring and debugging. */
  const start = Date.now();
  const { method, url, ip } = req;
  const userAgent = req.get('User-Agent') || 'unknown';
  
  // Log request start
  logToMonitoring('INFO', `${method} ${url}`, 'request-logger', {
    ip,
    userAgent,
    userId: req.user?.id
  });

  // Capture response details
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    
    // Log response
    logToMonitoring('INFO', `${method} ${url} - ${statusCode} (${duration}ms)`, 'request-logger', {
      statusCode,
      duration,
      ip,
      userId: req.user?.id
    });

    // Report metrics
    reportMetric('http_requests_total', 1, {
      method,
      status_code: statusCode.toString(),
      endpoint: url
    });
    
    reportMetric('http_request_duration_ms', duration, {
      method,
      endpoint: url
    });

    return originalSend.call(this, data);
  };

  next();
}

// PUBLIC_INTERFACE
function errorHandler(err, req, res, next) {
  /** Global error handler with monitoring integration. */
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Log error
  logToMonitoring('ERROR', `Error in ${req.method} ${req.url}: ${message}`, 'error-handler', {
    statusCode,
    stack: err.stack,
    userId: req.user?.id,
    ip: req.ip
  });

  // Report error metric
  reportMetric('http_errors_total', 1, {
    method: req.method,
    status_code: statusCode.toString(),
    endpoint: req.url
  });

  // Send error response
  res.status(statusCode).json({
    code: statusCode.toString(),
    message,
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    timestamp: new Date().toISOString()
  });
}

// PUBLIC_INTERFACE
function cors(req, res, next) {
  /** CORS middleware for cross-origin requests. */
  res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Max-Age', '3600');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
}

module.exports = {
  // Authentication & Authorization
  authenticate: auth.authenticate,
  authorize: auth.authorize,
  optionalAuth: auth.optionalAuth,
  rateLimit: auth.rateLimit,
  generateToken: auth.generateToken,
  
  // Request handling
  requestLogger,
  errorHandler,
  cors,
  
  // Passport
  passport: auth.passport
};
