import express from "express";
import {
  getLoginPage,
  postLogin,
  logoutStudent,
  getChangePassword,
  postChangePassword,
  getDashboard,
  getLessons,
  getProfile,
  postUpdateProfile,
  getHomework,
  getSubmitHomework,
  postSubmitHomework,
  getAnnouncements,
  getPayments,
} from "../controllers/auth.controller.js";
import {
  isStudentAuthenticated,
  requireStudentAuth,
  redirectIfStudentAuthenticated,
  blockIfPasswordChangeRequired,
} from "../middleware/studentAuth.js";
import { wrapUpload, uploadStudentPhoto } from "../middleware/upload.js";
import { loginRateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// ── Auth Routes ──────────────────────────────────────────────────
router.get("/login", redirectIfStudentAuthenticated, getLoginPage);
router.post("/login", loginRateLimiter, redirectIfStudentAuthenticated, postLogin);
router.get("/logout", requireStudentAuth, logoutStudent);

// ── Force Password Change (first-login only) ─────────────────────
router.get("/change-password", requireStudentAuth, getChangePassword);
router.post("/change-password", requireStudentAuth, postChangePassword);

// ── Protected Student Portal Pages ──────────────────────────────
router.get("/dashboard", requireStudentAuth, blockIfPasswordChangeRequired, getDashboard);
router.get("/lessons", requireStudentAuth, blockIfPasswordChangeRequired, getLessons);
router.get("/homework", requireStudentAuth, blockIfPasswordChangeRequired, getHomework);
router.get("/homework/:homeworkId/submit", requireStudentAuth, blockIfPasswordChangeRequired, getSubmitHomework);
router.post("/homework/:homeworkId/submit", requireStudentAuth, blockIfPasswordChangeRequired, postSubmitHomework);
router.get("/announcements", requireStudentAuth, blockIfPasswordChangeRequired, getAnnouncements);
router.get("/payments", requireStudentAuth, blockIfPasswordChangeRequired, getPayments);
router.get("/profile", requireStudentAuth, blockIfPasswordChangeRequired, getProfile);
router.post("/profile", requireStudentAuth, blockIfPasswordChangeRequired, wrapUpload(uploadStudentPhoto), postUpdateProfile);

export default router;
