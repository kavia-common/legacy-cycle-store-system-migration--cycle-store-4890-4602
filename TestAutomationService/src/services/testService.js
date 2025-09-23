'use strict';

const { db, generateId } = require('../models/store');
const { validateSuite, validateTestCase, validateWebhook } = require('../models/types');
const { paginate, nowISO, audit } = require('../utils');
const { triggerSuiteExecution } = require('./scheduler');
const { sendTestResultNotification, logToMonitoring, reportMetric, createAlert } = require('./notificationService');

// PUBLIC_INTERFACE
function listSuites({ page = 1, size = 20 } = {}) {
  /** Return paginated suites with monitoring. */
  try {
    const items = Array.from(db.suites.values());
    const result = paginate(items, page, size);
    
    // Report metrics
    reportMetric('test_suites_listed', 1, {
      page: page.toString(),
      total_suites: items.length.toString()
    });
    
    logToMonitoring('INFO', `Listed ${items.length} test suites`, 'testService.listSuites', {
      page,
      size,
      totalSuites: items.length
    });
    
    return result;
  } catch (error) {
    logToMonitoring('ERROR', `Failed to list suites: ${error.message}`, 'testService.listSuites', { error: error.stack });
    throw error;
  }
}

// PUBLIC_INTERFACE
function createSuite(suitePayload, actor = 'api') {
  /** Create a test suite with validation and monitoring. */
  try {
    const suite = { ...suitePayload };
    if (!suite.id) suite.id = generateId('suite');
    if (!suite.createdAt) suite.createdAt = nowISO();
    suite.updatedAt = nowISO();
    
    // Ensure each test case has id and status
    suite.testCases = (suite.testCases || []).map((tc) => {
      const t = { ...tc };
      if (!t.id) t.id = generateId('tc');
      if (!t.status) t.status = 'active';
      return t;
    });
    
    // Validate suite and test cases
    const errors = validateSuite(suite);
    suite.testCases.forEach((t) => errors.push(...validateTestCase(t)));
    
    if (errors.length) {
      const err = new Error('Validation failed');
      err.details = errors;
      err.status = 400;
      
      logToMonitoring('WARN', `Suite validation failed: ${errors.join(', ')}`, 'testService.createSuite', {
        suiteId: suite.id,
        errors,
        actor
      });
      
      throw err;
    }
    
    db.suites.set(suite.id, suite);
    audit('suite_created', actor, { suiteId: suite.id, testCaseCount: suite.testCases.length });
    
    // Report metrics
    reportMetric('test_suites_created', 1, {
      actor,
      test_case_count: suite.testCases.length.toString()
    });
    
    logToMonitoring('INFO', `Created test suite: ${suite.name}`, 'testService.createSuite', {
      suiteId: suite.id,
      testCaseCount: suite.testCases.length,
      actor
    });
    
    return suite;
  } catch (error) {
    logToMonitoring('ERROR', `Failed to create suite: ${error.message}`, 'testService.createSuite', {
      error: error.stack,
      actor
    });
    throw error;
  }
}

// PUBLIC_INTERFACE
function getSuite(id) {
  /** Retrieve suite by ID with access logging. */
  try {
    const suite = db.suites.get(id);
    
    if (suite) {
      logToMonitoring('INFO', `Retrieved test suite: ${suite.name}`, 'testService.getSuite', {
        suiteId: id
      });
    } else {
      logToMonitoring('WARN', `Suite not found: ${id}`, 'testService.getSuite', {
        suiteId: id
      });
    }
    
    return suite;
  } catch (error) {
    logToMonitoring('ERROR', `Failed to get suite: ${error.message}`, 'testService.getSuite', {
      suiteId: id,
      error: error.stack
    });
    throw error;
  }
}

// PUBLIC_INTERFACE
function updateSuite(id, payload, actor = 'api') {
  /** Update a suite with validation and monitoring. */
  try {
    const existing = db.suites.get(id);
    if (!existing) {
      logToMonitoring('WARN', `Attempted to update non-existent suite: ${id}`, 'testService.updateSuite', {
        suiteId: id,
        actor
      });
      return null;
    }
    
    const updated = { ...existing, ...payload, id, updatedAt: nowISO() };
    updated.testCases = (updated.testCases || []).map((tc) => ({ 
      id: tc.id || generateId('tc'), 
      status: 'active', 
      ...tc 
    }));
    
    // Validate updated suite
    const errors = validateSuite(updated);
    updated.testCases.forEach((t) => errors.push(...validateTestCase(t)));
    
    if (errors.length) {
      const err = new Error('Validation failed');
      err.details = errors;
      err.status = 400;
      
      logToMonitoring('WARN', `Suite update validation failed: ${errors.join(', ')}`, 'testService.updateSuite', {
        suiteId: id,
        errors,
        actor
      });
      
      throw err;
    }
    
    db.suites.set(id, updated);
    audit('suite_updated', actor, { suiteId: id, changes: Object.keys(payload) });
    
    // Report metrics
    reportMetric('test_suites_updated', 1, {
      actor,
      test_case_count: updated.testCases.length.toString()
    });
    
    logToMonitoring('INFO', `Updated test suite: ${updated.name}`, 'testService.updateSuite', {
      suiteId: id,
      changes: Object.keys(payload),
      actor
    });
    
    return updated;
  } catch (error) {
    logToMonitoring('ERROR', `Failed to update suite: ${error.message}`, 'testService.updateSuite', {
      suiteId: id,
      error: error.stack,
      actor
    });
    throw error;
  }
}

// PUBLIC_INTERFACE
function deleteSuite(id, actor = 'api') {
  /** Delete a suite by ID with monitoring. */
  try {
    const suite = db.suites.get(id);
    const existed = db.suites.delete(id);
    
    if (existed) {
      audit('suite_deleted', actor, { suiteId: id, suiteName: suite?.name });
      
      reportMetric('test_suites_deleted', 1, { actor });
      
      logToMonitoring('INFO', `Deleted test suite: ${suite?.name || id}`, 'testService.deleteSuite', {
        suiteId: id,
        actor
      });
    } else {
      logToMonitoring('WARN', `Attempted to delete non-existent suite: ${id}`, 'testService.deleteSuite', {
        suiteId: id,
        actor
      });
    }
    
    return existed;
  } catch (error) {
    logToMonitoring('ERROR', `Failed to delete suite: ${error.message}`, 'testService.deleteSuite', {
      suiteId: id,
      error: error.stack,
      actor
    });
    throw error;
  }
}

// PUBLIC_INTERFACE
function executeSuite({ suiteId, environment, actor = 'api' }) {
  /** Trigger async execution with enhanced monitoring. */
  try {
    const suite = db.suites.get(suiteId);
    if (!suite) {
      const error = new Error('Suite not found');
      logToMonitoring('ERROR', `Execution failed - suite not found: ${suiteId}`, 'testService.executeSuite', {
        suiteId,
        actor
      });
      throw error;
    }
    
    const ok = triggerSuiteExecution(suiteId, environment, actor);
    audit('suite_execution_enqueued', actor, { suiteId, environment });
    
    // Report metrics
    reportMetric('test_executions_started', 1, {
      environment,
      actor,
      test_case_count: suite.testCases.length.toString()
    });
    
    logToMonitoring('INFO', `Test execution queued: ${suite.name}`, 'testService.executeSuite', {
      suiteId,
      environment,
      testCaseCount: suite.testCases.length,
      actor
    });
    
    return ok;
  } catch (error) {
    logToMonitoring('ERROR', `Failed to execute suite: ${error.message}`, 'testService.executeSuite', {
      suiteId,
      environment,
      error: error.stack,
      actor
    });
    throw error;
  }
}

// PUBLIC_INTERFACE
function listResults({ suiteId, status, page = 1, size = 20 } = {}) {
  /** Retrieve results with filters and monitoring. */
  try {
    let items = Array.from(db.results.values());
    
    if (suiteId) items = items.filter((r) => r.suiteId === suiteId);
    if (status) items = items.filter((r) => r.status === status);
    
    const result = paginate(items.sort((a, b) => (a.startTime < b.startTime ? 1 : -1)), page, size);
    
    // Report metrics
    reportMetric('test_results_listed', 1, {
      suite_id: suiteId || 'all',
      status: status || 'all',
      total_results: items.length.toString()
    });
    
    logToMonitoring('INFO', `Listed ${items.length} test results`, 'testService.listResults', {
      suiteId,
      status,
      totalResults: items.length
    });
    
    return result;
  } catch (error) {
    logToMonitoring('ERROR', `Failed to list results: ${error.message}`, 'testService.listResults', {
      suiteId,
      status,
      error: error.stack
    });
    throw error;
  }
}

// PUBLIC_INTERFACE
function getResult(id) {
  /** Get a single result by ID with access logging. */
  try {
    const result = db.results.get(id);
    
    if (result) {
      logToMonitoring('INFO', `Retrieved test result: ${id}`, 'testService.getResult', {
        resultId: id,
        status: result.status
      });
    } else {
      logToMonitoring('WARN', `Test result not found: ${id}`, 'testService.getResult', {
        resultId: id
      });
    }
    
    return result;
  } catch (error) {
    logToMonitoring('ERROR', `Failed to get result: ${error.message}`, 'testService.getResult', {
      resultId: id,
      error: error.stack
    });
    throw error;
  }
}

// PUBLIC_INTERFACE
function getResultLogs(id) {
  /** Get logs for a result with access logging. */
  try {
    const r = db.results.get(id);
    
    if (r) {
      logToMonitoring('INFO', `Retrieved logs for result: ${id}`, 'testService.getResultLogs', {
        resultId: id,
        logCount: r.logs?.length || 0
      });
      return { logs: r.logs || [] };
    } else {
      logToMonitoring('WARN', `Logs not found for result: ${id}`, 'testService.getResultLogs', {
        resultId: id
      });
      return null;
    }
  } catch (error) {
    logToMonitoring('ERROR', `Failed to get result logs: ${error.message}`, 'testService.getResultLogs', {
      resultId: id,
      error: error.stack
    });
    throw error;
  }
}

// PUBLIC_INTERFACE
function getReport(id) {
  /** Return report link with access logging. */
  try {
    const r = db.results.get(id);
    
    if (!r) {
      logToMonitoring('WARN', `Report not found for result: ${id}`, 'testService.getReport', {
        resultId: id
      });
      return null;
    }
    
    logToMonitoring('INFO', `Retrieved report for result: ${id}`, 'testService.getReport', {
      resultId: id,
      status: r.status
    });
    
    return { 
      reportUrl: r.reportUrl || `/reports/${id}`, 
      summary: r.summary,
      status: r.status,
      environment: r.environment
    };
  } catch (error) {
    logToMonitoring('ERROR', `Failed to get report: ${error.message}`, 'testService.getReport', {
      resultId: id,
      error: error.stack
    });
    throw error;
  }
}

// PUBLIC_INTERFACE
function registerWebhook(payload, actor = 'api') {
  /** Register webhook with validation and monitoring. */
  try {
    const hook = { ...payload };
    if (!hook.id) hook.id = generateId('wh');
    if (!hook.createdAt) hook.createdAt = nowISO();
    
    const errors = validateWebhook(hook);
    if (errors.length) {
      const err = new Error('Validation failed');
      err.details = errors;
      err.status = 400;
      
      logToMonitoring('WARN', `Webhook validation failed: ${errors.join(', ')}`, 'testService.registerWebhook', {
        webhookUrl: hook.url,
        errors,
        actor
      });
      
      throw err;
    }
    
    db.webhooks.set(hook.id, hook);
    audit('webhook_registered', actor, { webhookId: hook.id, url: hook.url, events: hook.eventTypes });
    
    // Report metrics
    reportMetric('webhooks_registered', 1, {
      actor,
      event_types: hook.eventTypes.join(',')
    });
    
    logToMonitoring('INFO', `Registered webhook: ${hook.url}`, 'testService.registerWebhook', {
      webhookId: hook.id,
      url: hook.url,
      eventTypes: hook.eventTypes,
      actor
    });
    
    return hook;
  } catch (error) {
    logToMonitoring('ERROR', `Failed to register webhook: ${error.message}`, 'testService.registerWebhook', {
      webhookUrl: payload?.url,
      error: error.stack,
      actor
    });
    throw error;
  }
}

// PUBLIC_INTERFACE
function listWebhooks() {
  /** List registered webhooks with monitoring. */
  try {
    const webhooks = Array.from(db.webhooks.values());
    
    logToMonitoring('INFO', `Listed ${webhooks.length} webhooks`, 'testService.listWebhooks', {
      webhookCount: webhooks.length
    });
    
    return webhooks;
  } catch (error) {
    logToMonitoring('ERROR', `Failed to list webhooks: ${error.message}`, 'testService.listWebhooks', {
      error: error.stack
    });
    throw error;
  }
}

// PUBLIC_INTERFACE
function deleteWebhook(id, actor = 'api') {
  /** Delete webhook with monitoring. */
  try {
    const webhook = db.webhooks.get(id);
    const existed = db.webhooks.delete(id);
    
    if (existed) {
      audit('webhook_deleted', actor, { webhookId: id, url: webhook?.url });
      
      reportMetric('webhooks_deleted', 1, { actor });
      
      logToMonitoring('INFO', `Deleted webhook: ${webhook?.url || id}`, 'testService.deleteWebhook', {
        webhookId: id,
        url: webhook?.url,
        actor
      });
    } else {
      logToMonitoring('WARN', `Attempted to delete non-existent webhook: ${id}`, 'testService.deleteWebhook', {
        webhookId: id,
        actor
      });
    }
    
    return existed;
  } catch (error) {
    logToMonitoring('ERROR', `Failed to delete webhook: ${error.message}`, 'testService.deleteWebhook', {
      webhookId: id,
      error: error.stack,
      actor
    });
    throw error;
  }
}

// PUBLIC_INTERFACE
function getAuditLogs({ page = 1, size = 50 } = {}) {
  /** Retrieve audit logs with monitoring. */
  try {
    const result = paginate(db.auditLogs.slice().reverse(), page, size);
    
    logToMonitoring('INFO', `Retrieved ${result.items.length} audit log entries`, 'testService.getAuditLogs', {
      page,
      size,
      totalLogs: db.auditLogs.length
    });
    
    return result;
  } catch (error) {
    logToMonitoring('ERROR', `Failed to get audit logs: ${error.message}`, 'testService.getAuditLogs', {
      error: error.stack
    });
    throw error;
  }
}

// PUBLIC_INTERFACE
function ciCallback({ pipelineId, status, metadata }, actor = 'ci') {
  /** CI/CD callback with enhanced monitoring. */
  try {
    audit('cicd_callback', actor, { pipelineId, status, metadata });
    
    // Report metrics
    reportMetric('cicd_callbacks_received', 1, {
      pipeline_status: status,
      actor
    });
    
    logToMonitoring('INFO', `CI/CD callback received: ${pipelineId}`, 'testService.ciCallback', {
      pipelineId,
      status,
      metadata,
      actor
    });
    
    // Create alert for failed pipelines
    if (status === 'failed') {
      createAlert(`CI/CD Pipeline failed: ${pipelineId}`, 'HIGH');
    }
    
    return { acknowledged: true, timestamp: nowISO() };
  } catch (error) {
    logToMonitoring('ERROR', `Failed to process CI/CD callback: ${error.message}`, 'testService.ciCallback', {
      pipelineId,
      error: error.stack,
      actor
    });
    throw error;
  }
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
  ciCallback
};
