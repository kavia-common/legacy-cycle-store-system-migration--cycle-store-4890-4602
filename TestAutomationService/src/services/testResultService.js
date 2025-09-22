'use strict';
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { readJSON, writeJSON, ensureDir } = require('../utils/fsStore');

const STORAGE_DIR = process.env.STORAGE_DIR || path.join(process.cwd(), 'storage');
const RESULTS_FILE = path.join(STORAGE_DIR, 'test_results.json');
const RESULTS_DIR = process.env.RESULTS_DIR || path.join(STORAGE_DIR, 'results');
const REPORTS_DIR = process.env.REPORTS_DIR || path.join(STORAGE_DIR, 'reports');
ensureDir(STORAGE_DIR);
ensureDir(RESULTS_DIR);
ensureDir(REPORTS_DIR);

let results = readJSON(RESULTS_FILE, []);

// PUBLIC_INTERFACE
function listResults(filter = {}) {
  /** List test results with optional filtering. */
  return results.filter((r) => {
    if (filter.suiteId && r.suiteId !== filter.suiteId) return false;
    if (filter.status && r.status !== filter.status) return false;
    return true;
  });
}

// PUBLIC_INTERFACE
function getResult(id) {
  /** Retrieve a single test result by id. */
  return results.find((r) => r.id === id) || null;
}

// PUBLIC_INTERFACE
function createResult(suiteId) {
  /** Create a test result shell with pending status. */
  const id = uuidv4();
  const now = new Date().toISOString();
  const logFile = path.join(RESULTS_DIR, `${id}.log`);
  fs.writeFileSync(logFile, '', { flag: 'w' });
  const record = {
    id,
    suiteId,
    status: 'pending',
    startTime: now,
    endTime: null,
    logs: [],
    reportUrl: null,
    logFile,
  };
  results.push(record);
  writeJSON(RESULTS_FILE, results);
  return record;
}

// PUBLIC_INTERFACE
function appendLog(resultId, line) {
  /** Append a log line to the result record and file. */
  const r = getResult(resultId);
  if (!r) return;
  r.logs.push(line);
  try {
    fs.appendFileSync(r.logFile, (line || '') + '\n');
  } catch (e) {
    // no-op
  }
}

// PUBLIC_INTERFACE
function updateStatus(resultId, status) {
  /** Update status for a test result. */
  const idx = results.findIndex((r) => r.id === resultId);
  if (idx === -1) return;
  results[idx].status = status;
  if (status === 'passed' || status === 'failed') {
    results[idx].endTime = new Date().toISOString();
  }
  writeJSON(RESULTS_FILE, results);
}

// PUBLIC_INTERFACE
function setReportUrl(resultId, reportUrl) {
  /** Set a report URL for a test result. */
  const idx = results.findIndex((r) => r.id === resultId);
  if (idx === -1) return;
  results[idx].reportUrl = reportUrl;
  writeJSON(RESULTS_FILE, results);
}

module.exports = {
  listResults,
  getResult,
  createResult,
  appendLog,
  updateStatus,
  setReportUrl,
  REPORTS_DIR,
};
