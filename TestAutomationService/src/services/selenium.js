'use strict';

/**
 * Selenium Grid integration for test automation.
 * Manages browser sessions, test execution, and result collection.
 */

const { Builder, By, until } = require('selenium-webdriver');
const { nowISO } = require('../utils');

const SELENIUM_GRID_URL = process.env.SELENIUM_GRID_URL || 'http://selenium-hub:4444/wd/hub';
const DEFAULT_TIMEOUT = parseInt(process.env.DEFAULT_TEST_TIMEOUT || '30000', 10);

// PUBLIC_INTERFACE
async function createDriver(capabilities = {}) {
  /** Creates a new WebDriver instance connected to Selenium Grid. */
  const defaultCapabilities = {
    browserName: 'chrome',
    version: 'latest',
    platform: 'linux',
    ...capabilities
  };

  try {
    const driver = await new Builder()
      .usingServer(SELENIUM_GRID_URL)
      .withCapabilities(defaultCapabilities)
      .build();

    await driver.manage().setTimeouts({
      implicit: DEFAULT_TIMEOUT,
      pageLoad: DEFAULT_TIMEOUT,
      script: DEFAULT_TIMEOUT
    });

    return driver;
  } catch (error) {
    throw new Error(`Failed to create WebDriver: ${error.message}`);
  }
}

// PUBLIC_INTERFACE
async function executeTestStep(driver, step, context = {}) {
  /** Executes a single test step using the WebDriver. */
  const logs = [];
  const timestamp = nowISO();
  
  try {
    logs.push(`[${timestamp}] Executing step: ${step.action} - ${step.description || step.target || ''}`);
    
    switch (step.action.toLowerCase()) {
      case 'navigate':
      case 'goto':
        await driver.get(step.target);
        logs.push(`[${nowISO()}] Navigated to: ${step.target}`);
        break;
        
      case 'click':
        const clickElement = await driver.findElement(By.css(step.target));
        await clickElement.click();
        logs.push(`[${nowISO()}] Clicked element: ${step.target}`);
        break;
        
      case 'type':
      case 'sendkeys':
        const inputElement = await driver.findElement(By.css(step.target));
        await inputElement.clear();
        await inputElement.sendKeys(step.value || '');
        logs.push(`[${nowISO()}] Typed into element: ${step.target}`);
        break;
        
      case 'wait':
        await driver.wait(until.elementLocated(By.css(step.target)), DEFAULT_TIMEOUT);
        logs.push(`[${nowISO()}] Waited for element: ${step.target}`);
        break;
        
      case 'assert':
      case 'verify':
        const assertElement = await driver.findElement(By.css(step.target));
        const actualText = await assertElement.getText();
        if (step.expected && actualText !== step.expected) {
          throw new Error(`Assertion failed: expected "${step.expected}", got "${actualText}"`);
        }
        logs.push(`[${nowISO()}] Assertion passed for element: ${step.target}`);
        break;
        
      case 'screenshot':
        const screenshot = await driver.takeScreenshot();
        const screenshotPath = `screenshot_${context.suiteId || 'unknown'}_${Date.now()}.png`;
        logs.push(`[${nowISO()}] Screenshot taken: ${screenshotPath}`);
        // Note: In production, save screenshot to storage
        break;
        
      default:
        logs.push(`[${nowISO()}] Unknown step action: ${step.action}`);
        break;
    }
    
    return { success: true, logs };
  } catch (error) {
    logs.push(`[${nowISO()}] Step failed: ${error.message}`);
    return { success: false, error: error.message, logs };
  }
}

// PUBLIC_INTERFACE
async function runTestCase(testCase, environment, context = {}) {
  /** Execute a complete test case and return detailed results. */
  const logs = [];
  const artifacts = [];
  let driver = null;
  
  logs.push(`[${nowISO()}] Starting test: ${testCase.name} on ${environment}`);
  
  try {
    // Create driver for this test case
    const capabilities = {
      browserName: testCase.browser || 'chrome',
      platform: environment || 'linux'
    };
    
    driver = await createDriver(capabilities);
    logs.push(`[${nowISO()}] Created WebDriver session`);
    
    // Execute each step
    for (const [index, step] of (testCase.steps || []).entries()) {
      if (typeof step === 'string') {
        // Handle simple string steps (backward compatibility)
        logs.push(`[${nowISO()}] Step ${index + 1}: ${step}`);
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate execution
      } else {
        // Handle structured step objects
        const stepResult = await executeTestStep(driver, step, context);
        logs.push(...stepResult.logs);
        
        if (!stepResult.success) {
          // Take screenshot on failure
          try {
            const screenshot = await driver.takeScreenshot();
            artifacts.push({
              type: 'screenshot',
              name: `failure_${index + 1}.png`,
              data: screenshot,
              timestamp: nowISO()
            });
          } catch (screenshotError) {
            logs.push(`[${nowISO()}] Failed to capture failure screenshot: ${screenshotError.message}`);
          }
          
          throw new Error(stepResult.error);
        }
      }
    }
    
    // Verify expected result if provided
    if (testCase.expectedResult) {
      logs.push(`[${nowISO()}] Expected: ${testCase.expectedResult}`);
      // In a real implementation, you would verify the expected result
    }
    
    logs.push(`[${nowISO()}] Test completed successfully`);
    
    return {
      status: 'passed',
      logs,
      artifacts,
      reportFragments: [],
      meta: { environment, ...context },
      duration: Date.now() - new Date(logs[0].match(/\[(.*?)\]/)[1]).getTime()
    };
    
  } catch (error) {
    logs.push(`[${nowISO()}] Test failed: ${error.message}`);
    
    return {
      status: 'failed',
      error: error.message,
      logs,
      artifacts,
      reportFragments: [],
      meta: { environment, ...context },
      duration: Date.now() - new Date(logs[0].match(/\[(.*?)\]/)[1]).getTime()
    };
  } finally {
    // Clean up driver
    if (driver) {
      try {
        await driver.quit();
        logs.push(`[${nowISO()}] WebDriver session closed`);
      } catch (quitError) {
        logs.push(`[${nowISO()}] Warning: Failed to quit WebDriver: ${quitError.message}`);
      }
    }
  }
}

// PUBLIC_INTERFACE
async function getGridStatus() {
  /** Get the status of the Selenium Grid. */
  try {
    const fetch = require('node-fetch');
    const response = await fetch(`${SELENIUM_GRID_URL.replace('/wd/hub', '')}/status`);
    const status = await response.json();
    
    return {
      ready: status.ready || false,
      nodes: status.value?.nodes || [],
      gridUrl: SELENIUM_GRID_URL,
      timestamp: nowISO()
    };
  } catch (error) {
    return {
      ready: false,
      error: error.message,
      gridUrl: SELENIUM_GRID_URL,
      timestamp: nowISO()
    };
  }
}

// PUBLIC_INTERFACE
async function cleanupOrphanedSessions() {
  /** Clean up any orphaned browser sessions. */
  try {
    // In a real implementation, you would query the grid for active sessions
    // and close any that are no longer associated with running tests
    return { cleaned: 0, timestamp: nowISO() };
  } catch (error) {
    throw new Error(`Failed to cleanup sessions: ${error.message}`);
  }
}

module.exports = {
  createDriver,
  executeTestStep,
  runTestCase,
  getGridStatus,
  cleanupOrphanedSessions
};
