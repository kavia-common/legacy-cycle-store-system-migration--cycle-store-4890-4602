'use strict';
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { readJSON, writeJSON, ensureDir } = require('../utils/fsStore');

const STORAGE_DIR = process.env.STORAGE_DIR || path.join(process.cwd(), 'storage');
const SUITES_FILE = path.join(STORAGE_DIR, 'test_suites.json');
ensureDir(STORAGE_DIR);

let suites = readJSON(SUITES_FILE, []);

/**
 * Validate a minimal test suite payload.
 * This is intentionally permissive; extend validation as needed.
 * @param {object} payload
 * @returns {{valid: boolean, message?: string}}
 */
function validateSuite(payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, message: 'Invalid payload' };
  }
  if (!payload.name || typeof payload.name !== 'string') {
    return { valid: false, message: 'name is required' };
  }
  return { valid: true };
}

// PUBLIC_INTERFACE
function listSuites() {
  /** List all test suites. */
  return suites;
}

// PUBLIC_INTERFACE
function getSuite(id) {
  /** Retrieve one test suite by id. */
  return suites.find((s) => s.id === id) || null;
}

// PUBLIC_INTERFACE
function createSuite(data, createdBy = 'system') {
  /** Create a new test suite. */
  const { valid, message } = validateSuite(data);
  if (!valid) {
    const err = new Error(message || 'Validation failed');
    err.status = 400;
    throw err;
  }
  const now = new Date().toISOString();
  const suite = {
    id: uuidv4(),
    name: data.name,
    description: data.description || '',
    testCases: Array.isArray(data.testCases) ? data.testCases : [],
    environment: data.environment || 'dev',
    createdBy,
    createdAt: now,
    updatedAt: now,
  };
  suites.push(suite);
  writeJSON(SUITES_FILE, suites);
  return suite;
}

// PUBLIC_INTERFACE
function updateSuite(id, patch) {
  /** Update a test suite. */
  const idx = suites.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  const now = new Date().toISOString();
  suites[idx] = {
    ...suites[idx],
    ...patch,
    id,
    updatedAt: now,
  };
  writeJSON(SUITES_FILE, suites);
  return suites[idx];
}

// PUBLIC_INTERFACE
function deleteSuite(id) {
  /** Delete a test suite by id. */
  const existed = suites.some((s) => s.id === id);
  suites = suites.filter((s) => s.id !== id);
  writeJSON(SUITES_FILE, suites);
  return existed;
}

module.exports = {
  listSuites,
  getSuite,
  createSuite,
  updateSuite,
  deleteSuite,
};
