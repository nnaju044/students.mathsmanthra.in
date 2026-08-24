import express from "express";
import {
  getLoginPage,
  postLogin,
  getDashboard,
  logoutAdmin,
} from "../controllers/admin.controller.js";
import {
  isAdminAuthenticated,
  requireAdminAuth,
  redirectIfAuthenticated,
} from "../middleware/adminAuth.js";
import { loginRateLimiter } from "../middleware/rateLimiter.js";

// Sub-route modules
import studentRoutes from "./student.routes.js";
import courseRoutes from "./course.routes.js";
import batchRoutes from "./batch.routes.js";
import lessonRoutes from "./lesson.routes.js";
import paymentRoutes from "./payment.routes.js";
import announcementRoutes from "./announcement.routes.js";
import homeworkRoutes from "./homework.routes.js";
import attendanceRoutes from "./attendance.routes.js";
import reportRoutes from "./reports.routes.js";
import backupRoutes from "./backup.routes.js";
import auditRoutes from "./audit.routes.js";

const router = express.Router();

// ── Auth Routes ──────────────────────────────
router.get("/login", redirectIfAuthenticated, getLoginPage);
router.post("/login", loginRateLimiter, redirectIfAuthenticated, postLogin);
router.get("/logout", requireAdminAuth, logoutAdmin);
router.post("/logout", requireAdminAuth, logoutAdmin);

// ── Dashboard ────────────────────────────────
router.get("/dashboard", requireAdminAuth, getDashboard);

// ── CRUD Sub-routes (all protected) ──────────
router.use("/students", requireAdminAuth, studentRoutes);
router.use("/courses", requireAdminAuth, courseRoutes);
router.use("/batches", requireAdminAuth, batchRoutes);
router.use("/lessons", requireAdminAuth, lessonRoutes);
router.use("/payments", requireAdminAuth, paymentRoutes);
router.use("/announcements", requireAdminAuth, announcementRoutes);
router.use("/homework", requireAdminAuth, homeworkRoutes);
router.use("/attendance", requireAdminAuth, attendanceRoutes);
router.use("/reports", requireAdminAuth, reportRoutes);
router.use("/system", requireAdminAuth, backupRoutes);
router.use("/audit-logs", requireAdminAuth, auditRoutes);

export default router;
