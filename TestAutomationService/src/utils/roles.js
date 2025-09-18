'use strict';

/**
 * Simple role and scope helpers.
 */

// PUBLIC_INTERFACE
function hasRequiredRole(userRoles = [], required = []) {
  /** Determine if user roles satisfy any of the required roles (OR). */
  if (!Array.isArray(userRoles)) return false;
  if (!required || required.length === 0) return true;
  return userRoles.some((r) => required.includes(r));
}

module.exports = { hasRequiredRole };
