'use strict';

const { db, generateId } = require('../models/store');
const { validateSuite, validateTestCase, validateWebhook } = require('../models/types');
const { paginate, nowISO, audit } = require('../utils');
const { triggerSuiteExecution } = require('./scheduler');

// PUBLIC_INTERFACE
function listSuites({ page = 1, size = 20 } = {}) {
  /** Return paginated suites. */
  const items = Array.from(db.suites.values());
  return paginate(items, page, size);
}

// PUBLIC_INTERFACE
function createSuite(suitePayload, actor = 'api') {
  /** Create a test suite. */
  const suite = { ...suitePayload };
  if (!suite.id) suite.id = generateId('suite');
  if (!suite.createdAt) suite.createdAt = nowISO();
  suite.updatedAt = nowISO();
  // ensure each test case has id
  suite.testCases = (suite.testCases || []).map((tc) => {
    const t = { ...tc };
    if (!t.id) t.id = generateId('tc');
    if (!t.status) t.status = 'active';
    return t;
  });
  const errors = validateSuite(suite);
  suite.testCases.forEach((t) => errors.push(...validateTestCase(t)));
  if (errors.length) {
    const err = new Error('Validation failed');
    err.details = errors;
    err.status = 400;
    throw err;
  }
  db.suites.set(suite.id, suite);
  audit('suite_created', actor, { suiteId: suite.id });
  return suite;
}

// PUBLIC_INTERFACE
function getSuite(id) {
  /** Retrieve suite by ID. */
  return db.suites.get(id);
}

// PUBLIC_INTERFACE
function updateSuite(id, payload, actor = 'api') {
  /** Update a suite. */
  const existing = db.suites.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...payload, id, updatedAt: nowISO() };
  updated.testCases = (updated.testCases || []).map((tc) => ({ id: tc.id || generateId('tc'), status: 'active', ...tc }));
  const errors = validateSuite(updated);
  updated.testCases.forEach((t) => errors.push(...validateTestCase(t)));
  if (errors.length) {
    const err = new Error('Validation failed');
    err.details = errors;
    err.status = 400;
    throw err;
  }
  db.suites.set(id, updated);
  audit('suite_updated', actor, { suiteId: id });
  return updated;
}

// PUBLIC_INTERFACE
function deleteSuite(id, actor = 'api') {
  /** Delete a suite by ID. */
  const existed = db.suites.delete(id);
  if (existed) audit('suite_deleted', actor, { suiteId: id });
  return existed;
}

// PUBLIC_INTERFACE
function executeSuite({ suiteId, environment, actor = 'api' }) {
  /** Trigger async execution. */
  const ok = triggerSuiteExecution(suiteId, environment, actor);
  audit('suite_execution_enqueued', actor, { suiteId, environment });
  return ok;
}

// PUBLIC_INTERFACE
function listResults({ suiteId, status, page = 1, size = 20 } = {}) {
  /** Retrieve results with filters. */
  let items = Array.from(db.results.values());
  if (suiteId) items = items.filter((r) => r.suiteId === suiteId);
  if (status) items = items.filter((r) => r.status === status);
  return paginate(items.sort((a, b) => (a.startTime < b.startTime ? 1 : -1)), page, size);
}

// PUBLIC_INTERFACE
function getResult(id) {
  /** Get a single result by ID. */
  return db.results.get(id);
}

// PUBLIC_INTERFACE
function getResultLogs(id) {
  /** Get logs for a result. */
  const r = db.results.get(id);
  return r ? { logs: r.logs || [] } : null;
}

// PUBLIC_INTERFACE
function getReport(id) {
  /** Return report link or inline data (placeholder). */
  const r = db.results.get(id);
  if (!r) return null;
  return { reportUrl: r.reportUrl || `/reports/${id}`, summary: r.summary };
}

// PUBLIC_INTERFACE
function registerWebhook(payload, actor = 'api') {
  /** Register webhook for events. */
  const hook = { ...payload };
  if (!hook.id) hook.id = generateId('wh');
  if (!hook.createdAt) hook.createdAt = nowISO();
  const errors = validateWebhook(hook);
  if (errors.length) {
    const err = new Error('Validation failed');
    err.details = errors;
    err.status = 400;
    throw err;
  }
  db.webhooks.set(hook.id, hook);
  audit('webhook_registered', actor, { webhookId: hook.id, events: hook.eventTypes });
  return hook;
}

// PUBLIC_INTERFACE
function listWebhooks() {
  /** List registered webhooks. */
  return Array.from(db.webhooks.values());
}

// PUBLIC_INTERFACE
function deleteWebhook(id, actor = 'api') {
  /** Delete webhook. */
  const existed = db.webhooks.delete(id);
  if (existed) audit('webhook_deleted', actor, { webhookId: id });
  return existed;
}

// PUBLIC_INTERFACE
function getAuditLogs({ page = 1, size = 50 } = {}) {
  /** Retrieve audit logs (for compliance). */
  return paginate(db.auditLogs.slice().reverse(), page, size);
}

// PUBLIC_INTERFACE
function ciCallback({ pipelineId, status, metadata }, actor = 'ci') {
  /** CI/CD callback to update status or record audit entry. */
  audit('cicd_callback', actor, { pipelineId, status, metadata });
  return { acknowledged: true };
}

module.exports = {
  listSuites,
  createSuite,
  getSuite,
  updateSuite,
  deleteSuite,
  executeSuite,
  listResults,
  getResult,
  getResultLogs,
  getReport,
  registerWebhook,
  listWebhooks,
  deleteWebhook,
  getAuditLogs,
  ciCallback,
};
