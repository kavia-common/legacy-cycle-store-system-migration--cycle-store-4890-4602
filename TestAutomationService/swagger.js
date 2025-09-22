const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Test Automation REST API',
      version: '1.0.0',
      description:
        'API for managing automated test suites, triggering executions, and retrieving aggregated results and reports.',
    },
    tags: [
      { name: 'Health', description: 'Service healthcheck' },
      { name: 'Test Suites', description: 'CRUD and execution for test suites' },
      { name: 'Results', description: 'Test execution results and logs' },
      { name: 'Reports', description: 'Generated reports access' },
      { name: 'Webhooks', description: 'Webhook registration (demo)' },
    ],
  },
  apis: ['./src/routes/*.js'], // Path to the API docs
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;
