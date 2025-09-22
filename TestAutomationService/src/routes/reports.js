'use strict';
const express = require('express');
const controller = require('../controllers/testResults');

const router = express.Router();

/**
 * @swagger
 * /api/reports/{id}:
 *   get:
 *     tags: [Reports]
 *     summary: Retrieve a test report
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: JSON report
 *       404:
 *         description: Not found
 */
router.get('/:id', controller.report);

module.exports = router;
