'use strict';
const express = require('express');
const controller = require('../controllers/webhooks');

const router = express.Router();

/**
 * @swagger
 * /api/webhooks:
 *   get:
 *     tags: [Webhooks]
 *     summary: List registered webhooks (demo)
 *     responses:
 *       200:
 *         description: List of webhooks
 */
router.get('/', controller.list);

/**
 * @swagger
 * /api/webhooks:
 *   post:
 *     tags: [Webhooks]
 *     summary: Register a webhook (demo)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [url]
 *             properties:
 *               url: { type: string, format: uri }
 *               eventTypes:
 *                 type: array
 *                 items: { type: string }
 *               secret: { type: string }
 *     responses:
 *       201:
 *         description: Webhook registered
 *       400:
 *         description: Validation error
 */
router.post('/', controller.register);

module.exports = router;
