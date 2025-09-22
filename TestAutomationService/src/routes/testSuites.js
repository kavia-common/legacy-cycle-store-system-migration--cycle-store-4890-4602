'use strict';
const express = require('express');
const controller = require('../controllers/testSuites');

const router = express.Router();

/**
 * @swagger
 * /api/test-suites:
 *   get:
 *     tags: [Test Suites]
 *     summary: List all test suites
 *     responses:
 *       200:
 *         description: List of test suites
 */
router.get('/', controller.list);

/**
 * @swagger
 * /api/test-suites:
 *   post:
 *     tags: [Test Suites]
 *     summary: Create a new test suite
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               testCases:
 *                 type: array
 *                 items:
 *                   type: object
 *               environment: { type: string }
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Validation error
 */
router.post('/', controller.create);

/**
 * @swagger
 * /api/test-suites/{id}:
 *   get:
 *     tags: [Test Suites]
 *     summary: Get details of a test suite
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Test suite details
 *       404:
 *         description: Not found
 */
router.get('/:id', controller.getById);

/**
 * @swagger
 * /api/test-suites/{id}:
 *   put:
 *     tags: [Test Suites]
 *     summary: Update a test suite
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object }
 *     responses:
 *       200: { description: Updated }
 *       404: { description: Not found }
 */
router.put('/:id', controller.update);

/**
 * @swagger
 * /api/test-suites/{id}:
 *   delete:
 *     tags: [Test Suites]
 *     summary: Delete a test suite
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Deleted }
 *       404: { description: Not found }
 */
router.delete('/:id', controller.remove);

/**
 * @swagger
 * /api/test-suites/execute:
 *   post:
 *     tags: [Test Suites]
 *     summary: Trigger execution of a test suite
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [suiteId, environment]
 *             properties:
 *               suiteId: { type: string }
 *               environment: { type: string, example: dev }
 *     responses:
 *       202:
 *         description: Execution started
 *       404:
 *         description: Suite not found
 */
router.post('/execute', controller.execute);

module.exports = router;
