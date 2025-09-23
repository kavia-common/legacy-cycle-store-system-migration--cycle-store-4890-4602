'use strict';

/**
 * Basic JSON schema-like validators for payloads.
 * For brevity we implement minimal checks. Replace with zod/joi if needed.
 */

function isString(v) { return typeof v === 'string' && v.length > 0; }
function isArray(v) { return Array.isArray(v); }
function isUrl(v) {
  try { const u = new URL(v); return !!u; } catch { return false; }
}

function validateTestCase(obj) {
  const errors = [];
  if (!obj || typeof obj !== 'object') errors.push('TestCase must be object.');
  if (!isString(obj.id)) errors.push('TestCase.id is required string.');
  if (!isString(obj.name)) errors.push('TestCase.name is required string.');
  if (!isArray(obj.steps)) errors.push('TestCase.steps must be array.');
  if (!isString(obj.expectedResult)) errors.push('TestCase.expectedResult is required string.');
  if (obj.status && !['active', 'inactive'].includes(obj.status)) errors.push('TestCase.status invalid.');
  return errors;
}

function validateSuite(obj) {
  const errors = [];
  if (!obj || typeof obj !== 'object') errors.push('TestSuite must be object.');
  if (!isString(obj.id)) errors.push('TestSuite.id is required string.');
  if (!isString(obj.name)) errors.push('TestSuite.name is required string.');
  if (!isArray(obj.testCases)) errors.push('TestSuite.testCases must be array.');
  if (!isString(obj.environment)) errors.push('TestSuite.environment is required string.');
  return errors;
}

function validateWebhook(obj) {
  const errors = [];
  if (!obj || typeof obj !== 'object') errors.push('Webhook must be object.');
  if (!isString(obj.id)) errors.push('Webhook.id is required string.');
  if (!isUrl(obj.url)) errors.push('Webhook.url must be a valid URL.');
  if (!isArray(obj.eventTypes)) errors.push('Webhook.eventTypes must be array.');
  return errors;
}

module.exports = {
  validateTestCase,
  validateSuite,
  validateWebhook,
};
