const express = require('express');
const healthController = require('../controllers/health');
const testSuitesRouter = require('./testSuites');
const testResultsRouter = require('./testResults');
const reportsRouter = require('./reports');
const webhooksRouter = require('./webhooks');

const router = express.Router();

// Health endpoint
/**
 * @swagger
 * /:
 *   get:
 *     tags: [Health]
 *     summary: Health endpoint
 *     responses:
 *       200:
 *         description: Service health check passed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 message:
 *                   type: string
 *                   example: Service is healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 environment:
 *                   type: string
 *                   example: development
 */
router.get('/', healthController.check.bind(healthController));

// Mount API routers
router.use('/api/test-suites', testSuitesRouter);
router.use('/api/test-results', testResultsRouter);
router.use('/api/reports', reportsRouter);
router.use('/api/webhooks', webhooksRouter);

module.exports = router;
