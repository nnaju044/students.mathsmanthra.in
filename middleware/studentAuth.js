/**
 * middleware/studentAuth.js — Student Authentication & Authorization Middleware
 *
 * Protects student portal routes (/dashboard, /lessons, /homework, /payments, /announcements, /profile).
 * Ensures only users with an active req.session.student can proceed.
 */

/**
 * Protect student routes — requires an active student session.
 * Redirects to /login if not authenticated.
 */
export const isStudentAuthenticated = (req, res, next) => {
  if (req.session && req.session.student) {
    return next();
  }
  return res.redirect("/login");
};

// Backward compatibility alias
export const requireStudentAuth = isStudentAuthenticated;

/**
 * Redirect already-authenticated students away from the login page.
 * If isFirstLogin is true, redirects to /change-password; otherwise /dashboard.
 */
export const redirectIfStudentAuthenticated = (req, res, next) => {
  if (req.session && req.session.student) {
    if (req.session.student.isFirstLogin) {
      return res.redirect("/change-password");
    }
    return res.redirect("/dashboard");
  }
  return next();
};

/**
 * Block access to main portal pages until the student completes first-login password change.
 */
export const blockIfPasswordChangeRequired = (req, res, next) => {
  if (req.session && req.session.student && req.session.student.isFirstLogin) {
    return res.redirect("/change-password");
  }
  return next();
};

export default {
  isStudentAuthenticated,
  requireStudentAuth,
  redirectIfStudentAuthenticated,
  blockIfPasswordChangeRequired,
};
