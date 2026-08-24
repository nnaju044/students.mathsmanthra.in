import express from "express";
import {
  getAttendancePage,
  getMarkAttendance,
  postMarkAttendance,
  getViewAttendance,
} from "../controllers/attendance.controller.js";

const router = express.Router();

// ── Attendance Routes ──────────────────────────────────────────────
router.get("/", getAttendancePage);
router.get("/mark", getMarkAttendance);
router.post("/mark", postMarkAttendance);
router.get("/view", getViewAttendance);

export default router;
