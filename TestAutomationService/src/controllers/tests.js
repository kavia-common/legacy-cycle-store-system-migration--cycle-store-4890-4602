'use strict';

const service = require('../services/testService');

function sendError(res, err) {
  const status = err.status || 500;
  res.status(status).json({
    code: status.toString(),
    message: err.message || 'Internal error',
    details: err.details || undefined,
  });
}

class TestsController {
  // PUBLIC_INTERFACE
  async listSuites(req, res) {
    /** List suites. */
    try {
      const data = service.listSuites({ page: req.query.page, size: req.query.size });
      res.json(data);
    } catch (e) { sendError(res, e); }
  }

  // PUBLIC_INTERFACE
  async createSuite(req, res) {
    /** Create suite. */
    try {
      const created = service.createSuite(req.body, req.user?.id || 'api');
      res.status(201).json(created);
    } catch (e) { sendError(res, e); }
  }

  // PUBLIC_INTERFACE
  async getSuite(req, res) {
    /** Get suite by id. */
    try {
      const s = service.getSuite(req.params.id);
      if (!s) return res.status(404).json({ code: '404', message: 'Not found' });
      res.json(s);
    } catch (e) { sendError(res, e); }
  }

  // PUBLIC_INTERFACE
  async updateSuite(req, res) {
    /** Update suite by id. */
    try {
      const s = service.updateSuite(req.params.id, req.body, req.user?.id || 'api');
      if (!s) return res.status(404).json({ code: '404', message: 'Not found' });
      res.json(s);
    } catch (e) { sendError(res, e); }
  }

  // PUBLIC_INTERFACE
  async deleteSuite(req, res) {
    /** Delete suite. */
    try {
      const ok = service.deleteSuite(req.params.id, req.user?.id || 'api');
      if (!ok) return res.status(404).json({ code: '404', message: 'Not found' });
      res.status(204).send();
    } catch (e) { sendError(res, e); }
  }

  // PUBLIC_INTERFACE
  async executeSuite(req, res) {
    /** Trigger execution. */
    try {
      const { suiteId, environment } = req.body || {};
      if (!suiteId || !environment) {
        return res.status(400).json({ code: '400', message: 'suiteId and environment are required' });
      }
      const r = service.executeSuite({ suiteId, environment, actor: req.user?.id || 'api' });
      res.status(202).json({ message: 'Test execution started', ...r });
    } catch (e) { sendError(res, e); }
  }

  // PUBLIC_INTERFACE
  async listResults(req, res) {
    /** List results with filters. */
    try {
      const data = service.listResults({
        suiteId: req.query.suiteId,
        status: req.query.status,
        page: req.query.page,
        size: req.query.size,
      });
      res.json(data);
    } catch (e) { sendError(res, e); }
  }

  // PUBLIC_INTERFACE
  async getResultLogs(req, res) {
    /** Get logs for a result id. */
    try {
      const id = req.params.id;
      const data = service.getResultLogs(id);
      if (!data) return res.status(404).json({ code: '404', message: 'Not found' });
      res.json(data);
    } catch (e) { sendError(res, e); }
  }

  // PUBLIC_INTERFACE
  async getReport(req, res) {
    /** Get report link for a result. */
    try {
      const id = req.params.id;
      const data = service.getReport(id);
      if (!data) return res.status(404).json({ code: '404', message: 'Not found' });
      res.json(data);
    } catch (e) { sendError(res, e); }
  }

  // PUBLIC_INTERFACE
  async registerWebhook(req, res) {
    /** Register webhook. */
    try {
      const created = service.registerWebhook(req.body, req.user?.id || 'api');
      res.status(201).json(created);
    } catch (e) { sendError(res, e); }
  }

  // PUBLIC_INTERFACE
  async listWebhooks(req, res) {
    /** List webhooks. */
    try {
      res.json(service.listWebhooks());
    } catch (e) { sendError(res, e); }
  }

  // PUBLIC_INTERFACE
  async deleteWebhook(req, res) {
    /** Delete webhook. */
    try {
      const ok = service.deleteWebhook(req.params.id, req.user?.id || 'api');
      if (!ok) return res.status(404).json({ code: '404', message: 'Not found' });
      res.status(204).send();
    } catch (e) { sendError(res, e); }
  }

  // PUBLIC_INTERFACE
  async getAudit(req, res) {
    /** Retrieve audit logs. */
    try {
      const data = service.getAuditLogs({ page: req.query.page, size: req.query.size });
      res.json(data);
    } catch (e) { sendError(res, e); }
  }

  // PUBLIC_INTERFACE
  async ciCallback(req, res) {
    /** CI pipeline callback endpoint. */
    try {
      const r = service.ciCallback(req.body, 'ci');
      res.json(r);
    } catch (e) { sendError(res, e); }
  }
}

module.exports = new TestsController();
