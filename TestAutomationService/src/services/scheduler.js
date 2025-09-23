'use strict';

const { db, generateId } = require('../models/store');
const { nowISO, notifyWebhooks, audit } = require('../utils');
const { runTestCase } = require('./selenium');

const MAX_CONCURRENT_JOBS = parseInt(process.env.MAX_CONCURRENT_JOBS || '3', 10);

const queue = [];
let running = 0;

function enqueue(job) {
  queue.push(job);
  drain();
}

function drain() {
  while (running < MAX_CONCURRENT_JOBS && queue.length > 0) {
    const job = queue.shift();
    running += 1;
    execute(job).finally(() => {
      running -= 1;
      drain();
    });
  }
}

async function execute(job) {
  const { suite } = job;
  const resultId = generateId('result');
  const result = {
    id: resultId,
    suiteId: suite.id,
    status: 'running',
    startTime: nowISO(),
    endTime: null,
    logs: [`[${nowISO()}] Started suite execution: ${suite.name}`],
    reportUrl: null,
    summary: { total: suite.testCases.length, passed: 0, failed: 0 },
    environment: job.environment || suite.environment,
  };
  db.results.set(resultId, result);
  audit('suite_execution_started', job.triggeredBy || 'system', { resultId, suiteId: suite.id });
  await notifyWebhooks('suite.execution.started', { resultId, suiteId: suite.id });

  try {
    for (const testCase of suite.testCases) {
      result.logs.push(`[${nowISO()}] Executing test case: ${testCase.name}`);
      const tc = await runTestCase(testCase, result.environment, { suiteId: suite.id, resultId });
      tc.logs.forEach((l) => result.logs.push(l));
      if (tc.status === 'passed') {
        result.summary.passed += 1;
      } else {
        result.summary.failed += 1;
      }
    }
    result.status = result.summary.failed > 0 ? 'failed' : 'passed';
    result.endTime = nowISO();
    result.logs.push(`[${result.endTime}] Suite completed with status: ${result.status}`);
    result.reportUrl = `/reports/${resultId}`;
    audit('suite_execution_completed', job.triggeredBy || 'system', { resultId, suiteId: suite.id, status: result.status });
    await notifyWebhooks('suite.execution.completed', { resultId, suiteId: suite.id, status: result.status, summary: result.summary });
  } catch (e) {
    result.status = 'failed';
    result.endTime = nowISO();
    result.logs.push(`[${result.endTime}] Execution error: ${e.message}`);
    audit('suite_execution_error', job.triggeredBy || 'system', { resultId, suiteId: suite.id, error: e.message });
    await notifyWebhooks('suite.execution.failed', { resultId, suiteId: suite.id, error: e.message });
  }

  return result;
}

// PUBLIC_INTERFACE
function triggerSuiteExecution(suiteId, environment, triggeredBy = 'api') {
  /** Enqueue a suite execution job and return async result id. */
  const suite = db.suites.get(suiteId);
  if (!suite) throw new Error('Suite not found');
  const job = { suite, environment, triggeredBy };
  enqueue(job);
  return { accepted: true };
}

module.exports = {
  triggerSuiteExecution,
};
