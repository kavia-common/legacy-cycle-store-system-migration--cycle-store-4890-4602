'use strict';

const axios = require('axios');
const config = require('../config');

/**
 * Notify internal NotificationService about test events.
 * Non-blocking; logs errors but does not fail the main flow.
 */
async function notifyEvent(eventType, payload) {
  if (!config.notificationServiceUrl) return;
  try {
    await axios.post(`${config.notificationServiceUrl}/notifications`, {
      type: 'email',
      recipients: [],
      templateId: `test-${eventType}`,
      parameters: payload,
    }, { timeout: 5000 });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('NotificationService call failed:', e.message);
  }
}

/**
 * Send logs/metrics to MonitoringandLoggingService.
 */
async function sendLog(level, message, context = {}) {
  if (!config.monitoringServiceUrl) return;
  try {
    await axios.post(`${config.monitoringServiceUrl}/logs`, {
      timestamp: new Date().toISOString(),
      level: level?.toUpperCase() || 'INFO',
      message,
      source: 'TestAutomationService',
      context,
    }, { timeout: 5000 });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('MonitoringService log failed:', e.message);
  }
}

module.exports = { notifyEvent, sendLog };
