/**
 * middleware/adminAuth.js — Admin Authentication & Authorization Middleware
 *
 * Protects admin portal routes (/admin/*).
 * Ensures only users with an active req.session.admin can proceed.
 */

/**
 * Protect admin routes — requires active admin session.
 * Redirects to /admin/login if not authenticated.
 */
export const isAdminAuthenticated = (req, res, next) => {
  if (req.session && req.session.admin) {
    return next();
  }
  return res.redirect("/admin/login");
};

// Backward compatibility alias
export const requireAdminAuth = isAdminAuthenticated;

/**
 * Redirect already-authenticated admins away from the login page to the admin dashboard.
 */
export const redirectIfAdminAuthenticated = (req, res, next) => {
  if (req.session && req.session.admin) {
    return res.redirect("/admin/dashboard");
  }
  return next();
};

// Backward compatibility alias
export const redirectIfAuthenticated = redirectIfAdminAuthenticated;

export default {
  isAdminAuthenticated,
  requireAdminAuth,
  redirectIfAdminAuthenticated,
  redirectIfAuthenticated,
};
