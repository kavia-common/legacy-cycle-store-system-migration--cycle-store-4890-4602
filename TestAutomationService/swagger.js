const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Test Automation REST API',
      version: '1.0.0',
      description:
        'API for managing and executing automated tests, integrating with CI/CD, and retrieving results. Secured with JWT and RBAC.',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        TestCase: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            steps: { type: 'array', items: { type: 'string' } },
            expectedResult: { type: 'string' },
            status: { type: 'string', enum: ['active', 'inactive'] },
          },
          required: ['id', 'name', 'steps', 'expectedResult'],
        },
        TestSuite: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            testCases: { type: 'array', items: { $ref: '#/components/schemas/TestCase' } },
            environment: { type: 'string' },
            createdBy: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
          required: ['name', 'testCases', 'environment'],
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Health', description: 'Service health and readiness' },
      { name: 'Test Suites', description: 'Manage and execute test suites' },
      { name: 'Results', description: 'Test results and reporting' },
      { name: 'Webhooks', description: 'Webhook registration for notifications' },
    ],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;
