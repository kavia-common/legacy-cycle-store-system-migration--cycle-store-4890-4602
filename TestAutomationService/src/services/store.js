'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Simple in-memory store for TestSuites and Results.
 * Replace with persistent storage as needed (e.g., Postgres/MySQL).
 */

const suites = new Map(); // id -> suite
const results = new Map(); // id -> result

// PUBLIC_INTERFACE
function listSuites({ page = 1, size = 20 } = {}) {
  /** Returns paginated list of test suites. */
  const arr = Array.from(suites.values());
  const start = (page - 1) * size;
  return arr.slice(start, start + size);
}

// PUBLIC_INTERFACE
function createSuite(suite) {
  /** Create a new test suite with generated id and timestamps. */
  const id = suite.id || uuidv4();
  const now = new Date().toISOString();
  const item = {
    id,
    name: suite.name,
    description: suite.description || '',
    testCases: Array.isArray(suite.testCases) ? suite.testCases : [],
    environment: suite.environment || 'dev',
    createdBy: suite.createdBy || 'system',
    createdAt: now,
    updatedAt: now,
  };
  suites.set(id, item);
  return item;
}

// PUBLIC_INTERFACE
function getSuite(id) {
  /** Retrieve a test suite by id, or null. */
  return suites.get(id) || null;
}

// PUBLIC_INTERFACE
function updateSuite(id, update) {
  /** Update an existing suite; returns updated or null. */
  const existing = suites.get(id);
  if (!existing) return null;
  const now = new Date().toISOString();
  const updated = {
    ...existing,
    ...update,
    updatedAt: now,
  };
  suites.set(id, updated);
  return updated;
}

// PUBLIC_INTERFACE
function deleteSuite(id) {
  /** Delete a suite by id. Returns boolean. */
  return suites.delete(id);
}

// PUBLIC_INTERFACE
function createResult({ suiteId, status = 'pending' }) {
  /** Create a test result record. */
  const id = uuidv4();
  const startTime = new Date().toISOString();
  const rec = { id, suiteId, status, startTime, logs: [] };
  results.set(id, rec);
  return rec;
}

// PUBLIC_INTERFACE
function updateResult(id, update) {
  /** Update a result record. */
  const rec = results.get(id);
  if (!rec) return null;
  const merged = { ...rec, ...update };
  results.set(id, merged);
  return merged;
}

// PUBLIC_INTERFACE
function getResult(id) {
  /** Get a result record by id. */
  return results.get(id) || null;
}

// PUBLIC_INTERFACE
function listResults({ suiteId, status, page = 1, size = 20 } = {}) {
  /** Query results with optional filters and pagination. */
  let arr = Array.from(results.values());
  if (suiteId) arr = arr.filter((r) => r.suiteId === suiteId);
  if (status) arr = arr.filter((r) => r.status === status);
  const start = (page - 1) * size;
  return arr.slice(start, start + size);
}

module.exports = {
  listSuites,
  createSuite,
  getSuite,
  updateSuite,
  deleteSuite,
  createResult,
  updateResult,
  getResult,
  listResults,
};
