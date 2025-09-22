'use strict';

// In-memory webhook registry for demo purposes
const webhooks = [];

// PUBLIC_INTERFACE
async function register(req, res) {
  /** Register a webhook endpoint for notifications (demo-only). */
  const { url, eventTypes = [], secret = null } = req.body || {};
  if (!url) return res.status(400).json({ error: 'url is required' });
  const hook = {
    id: String(Date.now()),
    url,
    eventTypes,
    secret,
    createdAt: new Date().toISOString(),
  };
  webhooks.push(hook);
  res.status(201).json(hook);
}

// PUBLIC_INTERFACE
async function list(req, res) {
  /** List registered webhooks (demo-only). */
  res.status(200).json(webhooks);
}

module.exports = {
  register,
  list,
};
