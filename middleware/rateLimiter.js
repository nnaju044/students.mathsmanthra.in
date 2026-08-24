import rateLimit from "express-rate-limit";

/**
 * Login rate limiter: 5 attempts per 15 minutes per IP.
 * Applied to all POST /login and POST /admin/login routes.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true, // Return RateLimit-* headers
  legacyHeaders: false,
  message: {
    error: "Too many login attempts. Please try again after 15 minutes.",
  },
  handler: (req, res, next, options) => {
    console.warn(`⚠️ Rate limit hit: ${req.ip} on ${req.path}`);
    // For browser clients, re-render the login page with an error message
    const loginView = req.path.includes("admin") ? "admin/login" : "auth/login";
    res.status(429).render(loginView, {
      error: "Too many login attempts. Please wait 15 minutes and try again.",
      success: null,
    });
  },
});

/**
 * General API rate limiter: 100 requests per 10 minutes per IP.
 * Applied globally for DDoS protection.
 */
export const generalRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "GET", // Only limit state-changing requests
});
