'use strict';

const fetch = require('node-fetch'); // lightweight HTTP client
const { db, generateId } = require('../models/store');

function nowISO() { return new Date().toISOString(); }

function paginate(array, page = 1, size = 20) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const s = Math.max(1, Math.min(100, parseInt(size, 10) || 20));
  const start = (p - 1) * s;
  const end = start + s;
  return {
    page: p,
    size: s,
    total: array.length,
    items: array.slice(start, end),
  };
}

// PUBLIC_INTERFACE
function audit(action, actor = 'system', details = {}) {
  /** Append an audit entry for compliance. */
  const entry = {
    id: generateId('audit'),
    action,
    actor,
    timestamp: nowISO(),
    details,
  };
  db.auditLogs.push(entry);
  return entry;
}

async function safePost(url, body, headers = {}) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      timeout: 10000,
    });
    return { ok: res.ok, status: res.status, data: await res.text() };
  } catch (e) {
    return { ok: false, status: 0, error: e.message };
  }
}

// PUBLIC_INTERFACE
async function notifyWebhooks(eventType, payload) {
  /** Fire-and-forget notifications to registered webhooks by eventType. */
  const deliveries = [];
  for (const [, hook] of db.webhooks) {
    if (hook.eventTypes.includes(eventType)) {
      deliveries.push(
        safePost(hook.url, { event: eventType, payload, sentAt: nowISO() }, hook.secret ? { 'x-webhook-signature': hook.secret } : {})
      );
    }
  }
  // resolve in background without failing main flow
  Promise.allSettled(deliveries).catch(() => {});
}

module.exports = {
  nowISO,
  paginate,
  audit,
  notifyWebhooks,
};
