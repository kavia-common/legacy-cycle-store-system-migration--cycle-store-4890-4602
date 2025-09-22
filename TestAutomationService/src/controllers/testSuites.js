'use strict';
const testSuiteService = require('../services/testSuiteService');
const { executeSuite } = require('../services/testExecutionService');

// PUBLIC_INTERFACE
async function list(req, res) {
  /** List all test suites. */
  const data = testSuiteService.listSuites();
  res.status(200).json(data);
}

// PUBLIC_INTERFACE
async function create(req, res, next) {
  /** Create a new test suite. */
  try {
    const suite = testSuiteService.createSuite(req.body, 'api');
    res.status(201).json(suite);
  } catch (err) {
    next(err);
  }
}

// PUBLIC_INTERFACE
async function getById(req, res) {
  /** Retrieve a test suite by id. */
  const suite = testSuiteService.getSuite(req.params.id);
  if (!suite) return res.status(404).json({ error: 'Not Found' });
  res.status(200).json(suite);
}

// PUBLIC_INTERFACE
async function update(req, res) {
  /** Update a test suite by id. */
  const suite = testSuiteService.updateSuite(req.params.id, req.body);
  if (!suite) return res.status(404).json({ error: 'Not Found' });
  res.status(200).json(suite);
}

// PUBLIC_INTERFACE
async function remove(req, res) {
  /** Delete a test suite by id. */
  const ok = testSuiteService.deleteSuite(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not Found' });
  res.status(204).send();
}

// PUBLIC_INTERFACE
async function execute(req, res, next) {
  /**
   * Trigger test suite execution.
   * body: { suiteId: string, environment: string }
   */
  try {
    const { suiteId, environment } = req.body || {};
    if (!suiteId) {
      return res.status(400).json({ error: 'suiteId is required' });
    }
    const result = executeSuite(suiteId, environment || 'dev');
    res.status(202).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  create,
  getById,
  update,
  remove,
  execute,
};
