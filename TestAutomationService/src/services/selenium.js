'use strict';

/**
 * Selenium integration stub. In a real deployment, this will:
 * - Connect to Selenium Grid via SELENIUM_GRID_URL
 * - Launch browsers (Chrome/Firefox) with desired capabilities
 * - Execute steps and collect logs/screenshots
 * For this implementation, we simulate execution and step logs.
 */

const { nowISO } = require('../utils');

const DEFAULT_EXECUTION_MS = 1500;

// PUBLIC_INTERFACE
async function runTestCase(testCase, environment, context = {}) {
  /** Execute a single test case and return a step-by-step log with pass/fail. */
  const logs = [];
  logs.push(`[${nowISO()}] Starting test: ${testCase.name} on ${environment}`);
  // Simulate steps
  for (const [i, step] of testCase.steps.entries()) {
    logs.push(`[${nowISO()}] Step ${i + 1}: ${step}`);
  }
  await new Promise((r) => setTimeout(r, Math.min(10000, testCase.steps.length * DEFAULT_EXECUTION_MS)));
  // Very naive pass/fail based on status field
  const passed = testCase.status !== 'inactive';
  logs.push(`[${nowISO()}] Expected: ${testCase.expectedResult}`);
  logs.push(`[${nowISO()}] Result: ${passed ? 'PASSED' : 'FAILED'}`);
  return {
    status: passed ? 'passed' : 'failed',
    logs,
    reportFragments: [],
    artifacts: [],
    meta: { environment, ...context },
  };
}

module.exports = {
  runTestCase,
};
