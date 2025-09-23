'use strict';

const fetch = require('node-fetch');
const { nowISO } = require('../utils');

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:4003';
const MONITORING_SERVICE_URL = process.env.MONITORING_SERVICE_URL || 'http://monitoring-service:4001';

// PUBLIC_INTERFACE
async function sendNotification(type, recipients, templateId, parameters = {}, scheduleAt = null) {
  /** Send notification via the Notification Service. */
  try {
    const payload = {
      type,
      recipients,
      templateId,
      parameters,
      ...(scheduleAt && { scheduleAt })
    };

    const response = await fetch(`${NOTIFICATION_SERVICE_URL}/notifications/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SERVICE_AUTH_TOKEN || 'service-token'}`
      },
      body: JSON.stringify(payload),
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`Notification service responded with ${response.status}`);
    }

    const result = await response.json();
    return { success: true, notificationId: result.notificationId };
  } catch (error) {
    console.error('Failed to send notification:', error.message);
    return { success: false, error: error.message };
  }
}

// PUBLIC_INTERFACE
async function sendTestResultNotification(result, suite, webhooks = []) {
  /** Send notifications for test execution results. */
  const notifications = [];
  
  try {
    // Send to configured webhooks
    for (const webhook of webhooks) {
      if (webhook.eventTypes.includes('test.completed') || 
          (result.status === 'failed' && webhook.eventTypes.includes('test.failed'))) {
        
        const webhookPayload = {
          event: result.status === 'failed' ? 'test.failed' : 'test.completed',
          timestamp: nowISO(),
          data: {
            resultId: result.id,
            suiteId: suite.id,
            suiteName: suite.name,
            status: result.status,
            startTime: result.startTime,
            endTime: result.endTime,
            summary: result.summary,
            environment: result.environment
          }
        };

        try {
          const webhookResponse = await fetch(webhook.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(webhook.secret && { 'X-Webhook-Signature': webhook.secret })
            },
            body: JSON.stringify(webhookPayload),
            timeout: 10000
          });

          notifications.push({
            type: 'webhook',
            url: webhook.url,
            success: webhookResponse.ok,
            status: webhookResponse.status
          });
        } catch (webhookError) {
          notifications.push({
            type: 'webhook',
            url: webhook.url,
            success: false,
            error: webhookError.message
          });
        }
      }
    }

    // Send email notifications for failures
    if (result.status === 'failed' && process.env.FAILURE_EMAIL_RECIPIENTS) {
      const emailRecipients = process.env.FAILURE_EMAIL_RECIPIENTS.split(',').map(email => ({
        recipientId: email.trim(),
        email: email.trim(),
        type: 'user'
      }));

      const emailResult = await sendNotification(
        'email',
        emailRecipients,
        'test-failure',
        {
          suiteName: suite.name,
          environment: result.environment,
          failureCount: result.summary?.failed || 0,
          resultId: result.id
        }
      );

      notifications.push({
        type: 'email',
        success: emailResult.success,
        notificationId: emailResult.notificationId,
        error: emailResult.error
      });
    }

    return { success: true, notifications };
  } catch (error) {
    return { success: false, error: error.message, notifications };
  }
}

// PUBLIC_INTERFACE
async function logToMonitoring(level, message, source, context = {}) {
  /** Send log entries to the Monitoring Service. */
  try {
    const logEntry = {
      timestamp: nowISO(),
      level: level.toUpperCase(),
      message,
      source,
      context
    };

    const response = await fetch(`${MONITORING_SERVICE_URL}/api/v1/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SERVICE_AUTH_TOKEN || 'service-token'}`
      },
      body: JSON.stringify(logEntry),
      timeout: 5000
    });

    return { success: response.ok, status: response.status };
  } catch (error) {
    // Don't throw errors for logging failures - just return failure status
    return { success: false, error: error.message };
  }
}

// PUBLIC_INTERFACE
async function reportMetric(name, value, labels = {}) {
  /** Report metrics to the Monitoring Service. */
  try {
    const metricEntry = {
      timestamp: nowISO(),
      name,
      value,
      labels
    };

    const response = await fetch(`${MONITORING_SERVICE_URL}/api/v1/metrics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SERVICE_AUTH_TOKEN || 'service-token'}`
      },
      body: JSON.stringify(metricEntry),
      timeout: 5000
    });

    return { success: response.ok, status: response.status };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// PUBLIC_INTERFACE
async function createAlert(message, severity = 'MEDIUM') {
  /** Create an alert in the Monitoring Service. */
  try {
    const alert = {
      id: `test-automation-${Date.now()}`,
      status: 'ACTIVE',
      message,
      severity,
      createdAt: nowISO()
    };

    const response = await fetch(`${MONITORING_SERVICE_URL}/api/v1/alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SERVICE_AUTH_TOKEN || 'service-token'}`
      },
      body: JSON.stringify(alert),
      timeout: 5000
    });

    const result = await response.json();
    return { success: response.ok, alertId: result?.id, status: response.status };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendNotification,
  sendTestResultNotification,
  logToMonitoring,
  reportMetric,
  createAlert
};
