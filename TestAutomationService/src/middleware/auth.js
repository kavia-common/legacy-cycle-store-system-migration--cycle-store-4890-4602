'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');
const { hasRequiredRole } = require('../utils/roles');

/**
 * Extracts bearer token from Authorization header.
 */
function getTokenFromHeader(req) {
  const auth = req.headers['authorization'] || '';
  const [type, token] = auth.split(' ');
  if (type && type.toLowerCase() === 'bearer' && token) return token.trim();
  return null;
}

/**
 * Verify JWT. Supports symmetric secret for local and public key for prod.
 */
function verifyJwt(token) {
  const opts = {
    audience: config.authAud,
    issuer: config.authIssuer,
    ignoreExpiration: false,
  };

  // Prefer public key if provided (RS256), else fallback to shared secret (HS256)
  if (config.jwtPublicKey) {
    return jwt.verify(token, config.jwtPublicKey, { ...opts, algorithms: ['RS256'] });
  }
  if (config.jwtSecret) {
    return jwt.verify(token, config.jwtSecret, { ...opts, algorithms: ['HS256'] });
  }
  // If no keys configured, treat as unauthenticated environment.
  throw new Error('Auth not configured: missing JWT_PUBLIC_KEY or JWT_SECRET');
}

/**
 * Middleware: authenticate and attach user to request.
 */
function authenticate(req, res, next) {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      return res.status(401).json({ error: 'unauthorized', message: 'Missing bearer token' });
    }
    const payload = verifyJwt(token);
    req.user = {
      sub: payload.sub,
      roles: payload.roles || payload.scope?.split(' ') || [],
      raw: payload,
    };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'unauthorized', message: err.message });
  }
}

/**
 * Middleware factory: authorize by roles.
 */
function authorize(requiredRoles = []) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'unauthorized', message: 'Not authenticated' });
    }
    const userRoles = req.user.roles || [];
    if (!hasRequiredRole(userRoles, requiredRoles)) {
      return res.status(403).json({ error: 'forbidden', message: 'Insufficient role' });
    }
    return next();
  };
}

module.exports = { authenticate, authorize };
