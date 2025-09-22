'use strict';
const { spawn } = require('child_process');
const path = require('path');
const { getSuite } = require('./testSuiteService');
const {
  createResult,
  appendLog,
  updateStatus,
  setReportUrl,
  REPORTS_DIR,
} = require('./testResultService');

/**
 * Build the command and args for a test execution based on environment configuration.
 * Priority: PLAYWRIGHT_CMD > SELENIUM_CMD > TEST_EXECUTOR (jest|custom-script) > fallback
 */
function resolveExecutorCommand(suite) {
  const envCmdPlaywright = process.env.PLAYWRIGHT_CMD; // e.g., "npx playwright test"
  const envCmdSelenium = process.env.SELENIUM_CMD; // e.g., "npm run selenium:e2e"
  const executor = (process.env.TEST_EXECUTOR || '').toLowerCase();

  // Common working directory for the suite; tests might live under tests/e2e or others.
  const cwd = process.cwd();
  const suiteName = (suite && suite.name) || 'suite';

  if (envCmdPlaywright) {
    return { cmd: envCmdPlaywright, args: [], cwd, label: `playwright:${suiteName}` };
  }
  if (envCmdSelenium) {
    return { cmd: envCmdSelenium, args: [], cwd, label: `selenium:${suiteName}` };
  }
  if (executor === 'jest') {
    return { cmd: 'npm', args: ['test', '--', '--runInBand'], cwd, label: `jest:${suiteName}` };
  }
  if (executor) {
    // Some custom script name
    return { cmd: executor, args: [], cwd, label: `custom:${suiteName}` };
  }
  // Fallback does nothing but immediately pass (demo)
  return { cmd: 'node', args: ['-e', 'console.log("No executor configured, skipping.");'], cwd, label: `noop:${suiteName}` };
}

// PUBLIC_INTERFACE
function executeSuite(suiteId, environment = 'dev') {
  /** Start execution of a test suite using configured executor command. */
  const suite = getSuite(suiteId);
  if (!suite) {
    const err = new Error('Suite not found');
    err.status = 404;
    throw err;
  }

  const result = createResult(suiteId);
  updateStatus(result.id, 'running');

  const { cmd, args, cwd, label } = resolveExecutorCommand(suite);

  appendLog(result.id, `[EXECUTION] Starting ${label} for environment=${environment}`);
  const child = spawn(cmd, args, { cwd, shell: true });

  child.stdout.on('data', (buf) => {
    const line = buf.toString().trimEnd();
    if (line) appendLog(result.id, line);
  });
  child.stderr.on('data', (buf) => {
    const line = buf.toString().trimEnd();
    if (line) appendLog(result.id, `[ERR] ${line}`);
  });
  child.on('error', (err) => {
    appendLog(result.id, `[PROCESS_ERROR] ${err.message}`);
  });
  child.on('close', (code) => {
    const status = code === 0 ? 'passed' : 'failed';
    appendLog(result.id, `[EXECUTION] Finished with exit code ${code}, status=${status}`);
    updateStatus(result.id, status);

    // Generate a simple report file (aggregate from logs)
    const reportFilePath = path.join(REPORTS_DIR, `${result.id}.json`);
    const report = {
      id: result.id,
      suiteId,
      suiteName: suite.name,
      status,
      finishedAt: new Date().toISOString(),
      environment,
    };
    const fs = require('fs');
    fs.writeFileSync(reportFilePath, JSON.stringify(report, null, 2));
    setReportUrl(result.id, `/reports/${result.id}`);
  });

  return { runId: result.id, status: 'running' };
}

module.exports = {
  executeSuite,
};
