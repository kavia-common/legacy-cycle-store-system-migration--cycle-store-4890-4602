'use strict';

const express = require('express');
const controller = require('../controllers/testController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Health
 *     description: Service health and readiness
 *   - name: Test Suites
 *     description: Manage and execute test suites
 *   - name: Results
 *     description: Test results and reporting
 *   - name: Webhooks
 *     description: Webhook registration for notifications
 */

/**
 * @swagger
 * /test-suites:
 *   get:
 *     summary: List all test suites
 *     tags: [Test Suites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: size
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: List of test suites
 */
router.get('/test-suites', authenticate, authorize(['admin', 'tester', 'viewer']), controller.listSuites.bind(controller));

/**
 * @swagger
 * /test-suites:
 *   post:
 *     summary: Create a new test suite
 *     tags: [Test Suites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TestSuite'
 *     responses:
 *       201:
 *         description: Test suite created
 */
router.post('/test-suites', authenticate, authorize(['admin', 'tester']), controller.createSuite.bind(controller));

/**
 * @swagger
 * /test-suites/{id}:
 *   get:
 *     summary: Get details of a test suite
 *     tags: [Test Suites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema: { type: string }
 *         required: true
 *     responses:
 *       200:
 *         description: Test suite details
 *       404:
 *         description: Not found
 */
router.get('/test-suites/:id', authenticate, authorize(['admin', 'tester', 'viewer']), controller.getSuite.bind(controller));

/**
 * @swagger
 * /test-suites/{id}:
 *   put:
 *     summary: Update a test suite
 *     tags: [Test Suites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema: { type: string }
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TestSuite'
 *     responses:
 *       200:
 *         description: Test suite updated
 *       404:
 *         description: Not found
 */
router.put('/test-suites/:id', authenticate, authorize(['admin', 'tester']), controller.updateSuite.bind(controller));

/**
 * @swagger
 * /test-suites/{id}:
 *   delete:
 *     summary: Delete a test suite
 *     tags: [Test Suites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema: { type: string }
 *         required: true
 *     responses:
 *       204:
 *         description: Test suite deleted
 *       404:
 *         description: Not found
 */
router.delete('/test-suites/:id', authenticate, authorize(['admin']), controller.deleteSuite.bind(controller));

/**
 * @swagger
 * /test-suites/execute:
 *   post:
 *     summary: Trigger execution of a test suite
 *     tags: [Test Suites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               suiteId: { type: string }
 *               environment: { type: string }
 *             required: [suiteId, environment]
 *     responses:
 *       202:
 *         description: Test execution started
 */
router.post('/test-suites/execute', authenticate, authorize(['admin', 'tester']), controller.executeSuite.bind(controller));

/**
 * @swagger
 * /test-results:
 *   get:
 *     summary: Retrieve test execution results
 *     tags: [Results]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: suiteId
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: size
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: List of test results
 */
router.get('/test-results', authenticate, authorize(['admin', 'tester', 'viewer']), controller.listResults.bind(controller));

/**
 * @swagger
 * /test-results/{id}/logs:
 *   get:
 *     summary: Retrieve logs for a test execution
 *     tags: [Results]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema: { type: string }
 *         required: true
 *     responses:
 *       200:
 *         description: Test execution logs
 *       404:
 *         description: Not found
 */
router.get('/test-results/:id/logs', authenticate, authorize(['admin', 'tester', 'viewer']), controller.getLogs.bind(controller));

/**
 * @swagger
 * /reports/{id}:
 *   get:
 *     summary: Retrieve a test report
 *     tags: [Results]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema: { type: string }
 *         required: true
 *     responses:
 *       200:
 *         description: Test report
 *       404:
 *         description: Not found
 */
router.get('/reports/:id', authenticate, authorize(['admin', 'tester', 'viewer']), controller.getReport.bind(controller));

/**
 * @swagger
 * /webhooks:
 *   post:
 *     summary: Register a webhook for notifications
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url: { type: string, format: uri }
 *               eventTypes: { type: array, items: { type: string } }
 *               secret: { type: string }
 *     responses:
 *       201:
 *         description: Webhook registered
 */
router.post('/webhooks', authenticate, authorize(['admin']), controller.registerWebhook.bind(controller));

module.exports = router;
