'use strict';

const express = require('express');
const controller = require('../controllers/tests');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: TestSuites
 *     description: Manage test suites and executions
 *   - name: Results
 *     description: Test execution results and logs
 *   - name: Webhooks
 *     description: Webhook registration for notifications
 *   - name: CI
 *     description: CI/CD integration endpoints
 */

// Suites CRUD
/**
 * @swagger
 * /test-suites:
 *   get:
 *     summary: List all test suites
 *     tags: [TestSuites]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: size
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Suites page
 */
router.get('/test-suites', controller.listSuites.bind(controller));

/**
 * @swagger
 * /test-suites:
 *   post:
 *     summary: Create a new test suite
 *     tags: [TestSuites]
 *     requestBody:
 *       required: true
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/test-suites', controller.createSuite.bind(controller));

/**
 * @swagger
 * /test-suites/{id}:
 *   get:
 *     summary: Get details of a test suite
 *     tags: [TestSuites]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not found }
 */
router.get('/test-suites/:id', controller.getSuite.bind(controller));

/**
 * @swagger
 * /test-suites/{id}:
 *   put:
 *     summary: Update a test suite
 *     tags: [TestSuites]
 *     parameters: [{ in: path, name: id, required: true }]
 *     requestBody:
 *       required: true
 *     responses:
 *       200: { description: Updated }
 *       404: { description: Not found }
 */
router.put('/test-suites/:id', controller.updateSuite.bind(controller));

/**
 * @swagger
 * /test-suites/{id}:
 *   delete:
 *     summary: Delete a test suite
 *     tags: [TestSuites]
 *     parameters: [{ in: path, name: id, required: true }]
 *     responses:
 *       204: { description: Deleted }
 *       404: { description: Not found }
 */
router.delete('/test-suites/:id', controller.deleteSuite.bind(controller));

/**
 * @swagger
 * /test-suites/execute:
 *   post:
 *     summary: Trigger execution of a test suite
 *     tags: [TestSuites]
 *     requestBody:
 *       required: true
 *     responses:
 *       202:
 *         description: Test execution started
 */
router.post('/test-suites/execute', controller.executeSuite.bind(controller));

// Results
/**
 * @swagger
 * /test-results:
 *   get:
 *     summary: Retrieve test execution results
 *     tags: [Results]
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
 *         description: Results page
 */
router.get('/test-results', controller.listResults.bind(controller));

/**
 * @swagger
 * /test-results/{id}/logs:
 *   get:
 *     summary: Retrieve logs for a test execution
 *     tags: [Results]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200: { description: Logs }
 *       404: { description: Not found }
 */
router.get('/test-results/:id/logs', controller.getResultLogs.bind(controller));

/**
 * @swagger
 * /reports/{id}:
 *   get:
 *     summary: Retrieve a test report
 *     tags: [Results]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200: { description: Report link }
 *       404: { description: Not found }
 */
router.get('/reports/:id', controller.getReport.bind(controller));

// Webhooks
/**
 * @swagger
 * /webhooks:
 *   post:
 *     summary: Register a webhook for notifications
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *     responses:
 *       201: { description: Registered }
 */
router.post('/webhooks', controller.registerWebhook.bind(controller));

/**
 * @swagger
 * /webhooks:
 *   get:
 *     summary: List registered webhooks
 *     tags: [Webhooks]
 *     responses:
 *       200: { description: OK }
 */
router.get('/webhooks', controller.listWebhooks.bind(controller));

/**
 * @swagger
 * /webhooks/{id}:
 *   delete:
 *     summary: Delete a webhook
 *     tags: [Webhooks]
 *     parameters: [{ in: path, name: id, required: true }]
 *     responses:
 *       204: { description: Deleted }
 *       404: { description: Not found }
 */
router.delete('/webhooks/:id', controller.deleteWebhook.bind(controller));

// Audit
/**
 * @swagger
 * /audit:
 *   get:
 *     summary: Retrieve audit logs
 *     tags: [Results]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: size
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200: { description: OK }
 */
router.get('/audit', controller.getAudit.bind(controller));

// CI/CD callback
/**
 * @swagger
 * /ci/callback:
 *   post:
 *     summary: CI/CD pipeline callback
 *     tags: [CI]
 *     requestBody:
 *       required: true
 *     responses:
 *       200: { description: Acknowledged }
 */
router.post('/ci/callback', controller.ciCallback.bind(controller));

module.exports = router;
