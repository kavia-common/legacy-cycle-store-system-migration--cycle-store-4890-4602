'use strict';

/**
 * Centralized configuration loader using environment variables.
 * Do NOT hardcode secrets; ensure the .env file is managed by the orchestrator.
 */
require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  host: process.env.HOST || '0.0.0.0',
  port: parseInt(process.env.PORT || '3000', 10),

  // Auth
  jwtPublicKey: process.env.JWT_PUBLIC_KEY || '', // PEM string (if using signed tokens)
  jwtSecret: process.env.JWT_SECRET || '', // Optional symmetric signing for local tests
  authIssuer: process.env.AUTH_ISSUER || 'https://auth.cyclestore.com/',
  authAud: process.env.AUTH_AUDIENCE || 'test-automation-service',

  // RBAC roles
  roles: ['admin', 'tester', 'viewer'],

  // Selenium/Grid
  seleniumUrl: process.env.SELENIUM_URL || 'http://localhost:4444/wd/hub',
  defaultBrowser: process.env.DEFAULT_BROWSER || 'chrome',
  defaultBaseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',

  // External services
  notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL || '',
  monitoringServiceUrl: process.env.MONITORING_SERVICE_URL || '',

  // Reporting storage (for simplicity, in-memory; could be extended to DB or S3)
  reportBaseUrl: process.env.REPORT_BASE_URL || 'http://localhost:3000/reports',

  // CI/CD flags
  ci: process.env.CI === 'true',

  // Rate limiting configs (simple in-memory token bucket could be added later)
};

module.exports = config;
