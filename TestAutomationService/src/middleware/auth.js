'use strict';

const jwt = require('jsonwebtoken');
const passport = require('passport');
const OAuth2Strategy = require('passport-oauth2');

const JWT_SECRET = process.env.JWT_SECRET || 'test-automation-secret-key';
const OAUTH2_CLIENT_ID = process.env.OAUTH2_CLIENT_ID;
const OAUTH2_CLIENT_SECRET = process.env.OAUTH2_CLIENT_SECRET;
const OAUTH2_AUTH_URL = process.env.OAUTH2_AUTH_URL || 'https://auth.cyclestore.com/oauth/authorize';
const OAUTH2_TOKEN_URL = process.env.OAUTH2_TOKEN_URL || 'https://auth.cyclestore.com/oauth/token';

// Configure OAuth2 strategy if credentials are provided
if (OAUTH2_CLIENT_ID && OAUTH2_CLIENT_SECRET) {
  passport.use('oauth2', new OAuth2Strategy({
    authorizationURL: OAUTH2_AUTH_URL,
    tokenURL: OAUTH2_TOKEN_URL,
    clientID: OAUTH2_CLIENT_ID,
    clientSecret: OAUTH2_CLIENT_SECRET,
    callbackURL: '/auth/oauth2/callback'
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // In a real implementation, you would:
      // 1. Fetch user info using the access token
      // 2. Create or update user record in database
      // 3. Return user object with roles
      
      const user = {
        id: profile.id || 'oauth-user',
        roles: profile.roles || ['viewer'],
        accessToken,
        refreshToken
      };
      
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
}

// PUBLIC_INTERFACE
function generateToken(user) {
  /** Generate a JWT token for the user. */
  return jwt.sign(
    { 
      id: user.id, 
      roles: user.roles || ['viewer'],
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    },
    JWT_SECRET
  );
}

// PUBLIC_INTERFACE
function verifyToken(token) {
  /** Verify and decode a JWT token. */
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// PUBLIC_INTERFACE
function authenticate(req, res, next) {
  /** Middleware to authenticate requests using JWT tokens. */
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      code: '401',
      message: 'Authentication required',
      details: 'Please provide a valid Bearer token'
    });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      code: '401',
      message: 'Invalid token',
      details: error.message
    });
  }
}

// PUBLIC_INTERFACE
function authorize(requiredRoles = []) {
  /** Middleware to authorize requests based on user roles. */
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        code: '401',
        message: 'Authentication required'
      });
    }
    
    const userRoles = req.user.roles || [];
    const hasRequiredRole = requiredRoles.length === 0 || 
                           requiredRoles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      return res.status(403).json({
        code: '403',
        message: 'Insufficient permissions',
        details: `Required roles: ${requiredRoles.join(', ')}`
      });
    }
    
    next();
  };
}

// PUBLIC_INTERFACE
function optionalAuth(req, res, next) {
  /** Optional authentication middleware - sets user if token is valid, but doesn't require it. */
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    try {
      const decoded = verifyToken(token);
      req.user = decoded;
    } catch (error) {
      // Token is invalid, but we continue without authentication
      req.user = null;
    }
  } else {
    req.user = null;
  }
  
  next();
}

// Rate limiting storage (in production, use Redis)
const rateLimitStore = new Map();

// PUBLIC_INTERFACE
function rateLimit(windowMs = 15 * 60 * 1000, maxRequests = 100) {
  /** Rate limiting middleware. */
  return (req, res, next) => {
    const clientId = req.user?.id || req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old entries
    const requests = rateLimitStore.get(clientId) || [];
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    
    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        code: '429',
        message: 'Rate limit exceeded',
        details: `Maximum ${maxRequests} requests per ${windowMs / 1000} seconds`
      });
    }
    
    validRequests.push(now);
    rateLimitStore.set(clientId, validRequests);
    
    next();
  };
}

module.exports = {
  generateToken,
  verifyToken,
  authenticate,
  authorize,
  optionalAuth,
  rateLimit,
  passport
};
