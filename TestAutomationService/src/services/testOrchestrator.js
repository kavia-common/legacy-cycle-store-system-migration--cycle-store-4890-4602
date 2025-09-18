'use strict';

const { Builder, By, until } = require('selenium-webdriver');
const config = require('../config');
const store = require('./store');
const { notifyEvent, sendLog } = require('./integrations');

/**
 * Very lightweight step interpreter for UI flows.
 * Steps are simple commands like:
 * - navigate:<path or url>
 * - click:css=<selector>
 * - type:css=<selector>|<text>
 * - wait:css=<selector>
 * - assert:text=<expected>
 * Extend as needed for richer capabilities.
 */

async function runSteps(driver, baseUrl, steps = [], resultId) {
  const logs = [];
  function log(line) {
    logs.push(line);
  }
  for (const raw of steps) {
    const step = String(raw || '');
    if (!step) continue;
    try {
      if (step.startsWith('navigate:')) {
        const target = step.substring('navigate:'.length).trim();
        const url = target.startsWith('http') ? target : `${baseUrl}${target}`;
        await driver.get(url);
        log(`navigate -> ${url}`);
      } else if (step.startsWith('click:')) {
        const sel = step.substring('click:'.length).trim();
        const locator = parseLocator(sel);
        const elem = await driver.wait(until.elementLocated(locator), 10000);
        await elem.click();
        log(`click -> ${sel}`);
      } else if (step.startsWith('type:')) {
        const rest = step.substring('type:'.length).trim();
        const [sel, text] = rest.split('|');
        const locator = parseLocator(sel.trim());
        const elem = await driver.wait(until.elementLocated(locator), 10000);
        await elem.clear();
        await elem.sendKeys(text || '');
        log(`type -> ${sel} | ${text}`);
      } else if (step.startsWith('wait:')) {
        const sel = step.substring('wait:'.length).trim();
        const locator = parseLocator(sel);
        await driver.wait(until.elementLocated(locator), 10000);
        log(`wait -> ${sel}`);
      } else if (step.startsWith('assert:text=')) {
        const expected = step.substring('assert:text='.length);
        const body = await driver.findElement(By.css('body')).getText();
        if (!body.includes(expected)) throw new Error(`Expected text not found: ${expected}`);
        log(`assert:text -> found "${expected}"`);
      } else {
        log(`unknown step -> ${step}`);
      }
    } catch (e) {
      log(`ERROR in step "${step}": ${e.message}`);
      // Persist logs incrementally
      store.updateResult(resultId, { logs: (store.getResult(resultId)?.logs || []).concat(logs) });
      throw e;
    }
  }
  // Update logs at the end
  store.updateResult(resultId, { logs: (store.getResult(resultId)?.logs || []).concat(logs) });
}

function parseLocator(def) {
  // Accepted formats: css=<selector>, id=<id>, name=<name>, xpath=<xpath>
  const [strategy, value] = def.split('=');
  switch ((strategy || '').toLowerCase()) {
    case 'css': return By.css(value);
    case 'id': return By.id(value);
    case 'name': return By.name(value);
    case 'xpath': return By.xpath(value);
    default: return By.css(def); // fallback
  }
}

/**
 * Setup test environment and data; integrate with DataService as needed.
 * This is a stub for now; extend for real environment provisioning.
 */
async function environmentSetup(envName) {
  await sendLog('INFO', 'Environment setup start', { env: envName });
  // Potentially call DataService to seed data for tests.
  return { seeded: true, env: envName };
}

/**
 * Teardown and cleanup any temp data/resources.
 */
async function environmentTeardown(context) {
  await sendLog('INFO', 'Environment teardown', { context });
}

/**
 * Execute a test suite by id asynchronously; returns the created result record.
 */
// PUBLIC_INTERFACE
async function executeSuite(suiteId, options = {}) {
  /** Orchestrate Selenium UI suite execution for given suiteId. */
  const suite = store.getSuite(suiteId);
  if (!suite) throw new Error('Suite not found');
  const result = store.createResult({ suiteId, status: 'running' });
  const resultId = result.id;

  try {
    const envCtx = await environmentSetup(options.environment || suite.environment);
    const driver = await new Builder()
      .usingServer(config.seleniumUrl)
      .forBrowser(config.defaultBrowser)
      .build();

    try {
      for (const testCase of suite.testCases) {
        await runSteps(driver, config.defaultBaseUrl, testCase.steps || [], resultId);
      }
      await driver.quit();
      await environmentTeardown(envCtx);
      const final = store.updateResult(resultId, { status: 'passed', endTime: new Date().toISOString() });
      await notifyEvent('suite_passed', { suiteId, resultId });
      await sendLog('INFO', 'Suite passed', { suiteId, resultId });
      return final;
    } catch (e) {
      try { await driver.quit(); } catch (_) {}
      await environmentTeardown(envCtx);
      const final = store.updateResult(resultId, { status: 'failed', endTime: new Date().toISOString() });
      await notifyEvent('suite_failed', { suiteId, resultId, error: e.message });
      await sendLog('ERROR', 'Suite failed', { suiteId, resultId, error: e.message });
      return final;
    }
  } catch (e) {
    const final = store.updateResult(resultId, { status: 'failed', endTime: new Date().toISOString(), logs: (store.getResult(resultId)?.logs || []).concat([`FATAL: ${e.message}`]) });
    await sendLog('ERROR', 'Suite orchestration error', { suiteId, resultId, error: e.message });
    return final;
  }
}

module.exports = { executeSuite };
