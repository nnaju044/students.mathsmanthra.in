import dotenv from "dotenv";

// Initialize environment variables FIRST before database connection
dotenv.config();
console.log("✅ Environment loaded successfully");

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import connectDB from "./config/db.js";
import { getSessionMiddleware } from "./config/session.js";
import adminRoutes from "./routes/admin.routes.js";
import authRoutes from "./routes/auth.routes.js";
import pushRoutes from "./routes/push.routes.js";
import { seedAdmin } from "./controllers/admin.controller.js";
import { generalRateLimiter } from "./middleware/rateLimiter.js";

// Setup ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express Application
const app = express();

// ── Security Middleware ────────────────────────────────────────────────────────

// Helmet: sets comprehensive HTTP security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "cdn.jsdelivr.net",
          "cdn.tailwindcss.com",
          "cdnjs.cloudflare.com",
        ],

        scriptSrcAttr: ["'unsafe-inline'"],

        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "fonts.googleapis.com",
          "cdn.tailwindcss.com",
          "cdn.jsdelivr.net",
        ],

        fontSrc: [
          "'self'",
          "fonts.gstatic.com",
          "fonts.googleapis.com",
        ],

        imgSrc: [
          "'self'",
          "data:",
          "res.cloudinary.com",
          "*.cloudinary.com",
        ],

        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// General rate limiter (non-GET requests)
app.use(generalRateLimiter);


// Database Connection & Admin Seeding
const initializeDatabase = async () => {
  try {
    await connectDB();
    await seedAdmin();
  } catch (err) {
    console.error("❌ Failed to initialize database:", err.message);
  }
};
initializeDatabase();

// Configure View Engine (EJS)
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.set("trust proxy", 1);

// Configure Static Files
app.use(express.static(path.join(__dirname, "public")));

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom MongoDB query injection sanitization (avoids Express 5 TypeError)
app.use((req, res, next) => {
  if (req.body) mongoSanitize.sanitize(req.body, { replaceWith: '_' });
  if (req.query) mongoSanitize.sanitize(req.query, { replaceWith: '_' });
  if (req.params) mongoSanitize.sanitize(req.params, { replaceWith: '_' });
  next();
});

// Production Session Middleware with MongoDB Store (connect-mongo, 24h, rolling: true)
app.use(getSessionMiddleware());

// Dynamic session cookie secure flag based on request protocol/hostname (enables HTTP testing on localhost)
app.use((req, res, next) => {
  if (req.session && req.session.cookie) {
    if (req.hostname === "localhost" || req.hostname === "127.0.0.1" || req.protocol === "http") {
      req.session.cookie.secure = false;
    } else {
      req.session.cookie.secure = process.env.NODE_ENV === "production";
    }
  }
  next();
});

// Global View Variables Middleware (res.locals.admin, res.locals.student, flash messages)
app.use((req, res, next) => {
  res.locals.admin = req.session?.admin || null;
  res.locals.student = req.session?.student || null;

  // Flash message helpers — consume session flash on each request
  const flash = req.session?.flash || {};
  res.locals.success = flash.success || null;
  res.locals.error = flash.error || null;

  // Clear flash after reading only if we just served it
  if (flash.success || flash.error) {
    if (req.session) req.session.flash = {};
  }

  next();
});

// PWA Push Notification Routes (subscribe/unsubscribe/vapid)
app.use("/push", pushRoutes);

// Admin Routes (all admin portal routes with separate admin authentication)
app.use("/admin", adminRoutes);

// Student Auth & Portal Routes (/login, /logout, /change-password, /dashboard, /lessons, /profile, etc.)
app.use("/", authRoutes);

// Root Route — smart redirect based on active session
app.get("/", (req, res) => {
  if (req.session && req.session.admin) {
    return res.redirect("/admin/dashboard");
  }
  if (req.session && req.session.student) {
    return res.redirect("/dashboard");
  }
  res.render("auth/login", {
    title: "Student Login — Maths Manthra",
    error: null,
    success: null,
  });
});

// PWA Offline Fallback Route
app.get("/offline", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "offline.html"));
});

// 404 Route Handler
app.use((req, res) => {
  res.status(404).render("error", {
    message: "Page Not Found",
    error: { status: 404 },
  });
});

// Start Express Server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 Server started successfully! Listening on http://localhost:${PORT}`);
});

export default app;