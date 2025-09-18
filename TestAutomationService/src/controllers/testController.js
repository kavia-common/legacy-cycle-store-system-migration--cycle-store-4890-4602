'use strict';

const store = require('../services/store');
const orchestrator = require('../services/testOrchestrator');
const config = require('../config');

/**
 * Controllers encapsulate route logic.
 */
class TestController {
  // PUBLIC_INTERFACE
  async listSuites(req, res) {
    /** List available test suites with pagination. */
    const page = parseInt(req.query.page || '1', 10);
    const size = parseInt(req.query.size || '20', 10);
    const data = store.listSuites({ page, size });
    return res.status(200).json(data);
  }

  // PUBLIC_INTERFACE
  async createSuite(req, res) {
    /** Create a new test suite. */
    const body = req.body || {};
    if (!body.name || !Array.isArray(body.testCases)) {
      return res.status(400).json({ error: 'validation_error', message: 'name and testCases required' });
    }
    const created = store.createSuite(body);
    return res.status(201).json(created);
  }

  // PUBLIC_INTERFACE
  async getSuite(req, res) {
    /** Get details of a specific suite. */
    const suite = store.getSuite(req.params.id);
    if (!suite) return res.status(404).json({ error: 'not_found', message: 'Suite not found' });
    return res.status(200).json(suite);
  }

  // PUBLIC_INTERFACE
  async updateSuite(req, res) {
    /** Update a suite by id. */
    const updated = store.updateSuite(req.params.id, req.body || {});
    if (!updated) return res.status(404).json({ error: 'not_found', message: 'Suite not found' });
    return res.status(200).json(updated);
  }

  // PUBLIC_INTERFACE
  async deleteSuite(req, res) {
    /** Delete a suite by id. */
    const ok = store.deleteSuite(req.params.id);
    if (!ok) return res.status(404).json({ error: 'not_found', message: 'Suite not found' });
    return res.status(204).send();
  }

  // PUBLIC_INTERFACE
  async executeSuite(req, res) {
    /** Trigger execution of a suite; returns 202 and result tracking id. */
    const { suiteId, environment } = req.body || {};
    if (!suiteId || !environment) {
      return res.status(400).json({ error: 'validation_error', message: 'suiteId and environment required' });
    }
    const suite = store.getSuite(suiteId);
    if (!suite) return res.status(404).json({ error: 'not_found', message: 'Suite not found' });

    // Kick off async execution
    const run = store.createResult({ suiteId, status: 'running' });
    // Fire and forget actual orchestrator run; this separate placeholder ensures immediate 202.
    orchestrator.executeSuite(suiteId, { environment }).catch(() => { /* errors handled inside */ });

    return res.status(202).json({ message: 'Execution started', resultId: run.id });
  }

  // PUBLIC_INTERFACE
  async listResults(req, res) {
    /** List execution results with filters. */
    const page = parseInt(req.query.page || '1', 10);
    const size = parseInt(req.query.size || '20', 10);
    const { suiteId, status } = req.query;
    const data = store.listResults({ suiteId, status, page, size });
    return res.status(200).json(data);
  }

  // PUBLIC_INTERFACE
  async getLogs(req, res) {
    /** Retrieve logs for a result id. */
    const result = store.getResult(req.params.id);
    if (!result) return res.status(404).json({ error: 'not_found', message: 'Result not found' });
    return res.status(200).json({ logs: result.logs || [] });
  }

  // PUBLIC_INTERFACE
  async getReport(req, res) {
    /** Provide a basic report URL stub for a given result id. */
    const result = store.getResult(req.params.id);
    if (!result) return res.status(404).json({ error: 'not_found', message: 'Result not found' });
    const reportUrl = `${config.reportBaseUrl}/${result.id}`;
    return res.status(200).json({ reportUrl });
  }

  // PUBLIC_INTERFACE
  async registerWebhook(req, res) {
    /** Stub endpoint for webhook registration (in-memory only). */
    const body = req.body || {};
    if (!body.url || !Array.isArray(body.eventTypes)) {
      return res.status(400).json({ error: 'validation_error', message: 'url and eventTypes required' });
    }
    // No persistence implemented; acknowledge registration.
    return res.status(201).json({ ...body, id: 'webhook-' + Date.now(), createdAt: new Date().toISOString() });
  }
}

module.exports = new TestController();
