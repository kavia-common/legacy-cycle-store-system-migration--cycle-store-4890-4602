'use strict';
const express = require('express');
const controller = require('../controllers/testResults');

const router = express.Router();

/**
 * @swagger
 * /api/test-results:
 *   get:
 *     tags: [Results]
 *     summary: Retrieve test execution results
 *     parameters:
 *       - in: query
 *         name: suiteId
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, running, passed, failed] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: size
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: List of results with pagination
 */
router.get('/', controller.list);

/**
 * @swagger
 * /api/test-results/{id}/logs:
 *   get:
 *     tags: [Results]
 *     summary: Retrieve logs for a test execution
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Execution logs
 *       404:
 *         description: Not found
 */
router.get('/:id/logs', controller.logs);

module.exports = router;
