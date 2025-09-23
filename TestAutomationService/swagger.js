const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Test Automation REST API',
      version: '1.0.0',
      description: 'REST API for managing and executing automated tests, CI/CD integration, and retrieving results.',
    },
    components: {
      securitySchemes: {
        OAuth2: {
          type: 'oauth2',
          flows: {
            authorizationCode: {
              authorizationUrl: 'https://auth.cyclestore.com/oauth/authorize',
              tokenUrl: 'https://auth.cyclestore.com/oauth/token',
              scopes: {
                admin: 'Full access to all API operations',
                tester: 'Execute and manage test assets',
                viewer: 'Read-only access to test results and assets',
              },
            },
          },
        },
      },
    },
    security: [{ OAuth2: ['admin', 'tester', 'viewer'] }],
    tags: [
      { name: 'Health', description: 'Service health' },
      { name: 'TestSuites', description: 'Manage test suites and executions' },
      { name: 'Results', description: 'Test results, logs and reports' },
      { name: 'Webhooks', description: 'Webhook registration and management' },
      { name: 'CI', description: 'CI/CD integration endpoints' },
    ],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;
