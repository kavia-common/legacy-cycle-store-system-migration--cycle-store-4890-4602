'use strict';

/**
 * Simple in-memory stores and ID helpers.
 * In production, replace with a persistent datastore (e.g., Postgres/Mongo/Redis).
 */

const crypto = require('crypto');

// PUBLIC_INTERFACE
function generateId(prefix = 'id') {
  /** Generates a URL-safe unique identifier with a prefix. */
  const rnd = crypto.randomBytes(8).toString('hex');
  return `${prefix}_${rnd}`;
}

const db = {
  suites: new Map(),         // suiteId -> TestSuite
  results: new Map(),        // resultId -> TestResult
  webhooks: new Map(),       // webhookId -> Webhook
  tests: new Map(),          // testId -> TestCase (optional standalone tests)
  auditLogs: [],             // append-only audit entries
};

module.exports = {
  db,
  generateId,
};
