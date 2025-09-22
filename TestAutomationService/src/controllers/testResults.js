'use strict';
const path = require('path');
const fs = require('fs');
const { listResults, getResult } = require('../services/testResultService');

// PUBLIC_INTERFACE
async function list(req, res) {
  /** List results with optional filters suiteId/status. */
  const { suiteId, status, page = 1, size = 50 } = req.query || {};
  const all = listResults({ suiteId, status });
  const p = Math.max(1, parseInt(page, 10) || 1);
  const sz = Math.max(1, parseInt(size, 10) || 50);
  const start = (p - 1) * sz;
  const data = all.slice(start, start + sz);
  res.status(200).json({ total: all.length, page: p, size: sz, items: data });
}

// PUBLIC_INTERFACE
async function logs(req, res) {
  /** Retrieve logs for a result id. */
  const { id } = req.params;
  const r = getResult(id);
  if (!r) return res.status(404).json({ error: 'Not Found' });
  try {
    const content = fs.readFileSync(r.logFile, 'utf8');
    res.status(200).json({ logs: content.split('\n').filter(Boolean) });
  } catch (e) {
    res.status(200).json({ logs: r.logs || [] });
  }
}

// PUBLIC_INTERFACE
async function report(req, res) {
  /** Retrieve a simple JSON report for a result id. */
  const { id } = req.params;
  const r = getResult(id);
  if (!r) return res.status(404).json({ error: 'Not Found' });

  if (!r.reportUrl) return res.status(404).json({ error: 'Report not ready' });

  // The reportUrl is /reports/:id, but we also serve the file content directly here.
  const reportPath = path.join(process.env.REPORTS_DIR || path.join(process.cwd(), 'storage', 'reports'), `${id}.json`);
  if (fs.existsSync(reportPath)) {
    const buf = fs.readFileSync(reportPath);
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(buf.toString('utf8'));
  }
  return res.status(404).json({ error: 'Report not found' });
}

module.exports = {
  list,
  logs,
  report,
};
