import express from "express";
import {
  getRevenueReport,
  exportRevenueXLSX,
  getStudentGrowthReport,
  exportStudentGrowthXLSX,
  getAttendanceReport,
  exportAttendanceXLSX,
} from "../controllers/reports.controller.js";

const router = express.Router();

router.get("/revenue", getRevenueReport);
router.get("/revenue/export", exportRevenueXLSX);

router.get("/student-growth", getStudentGrowthReport);
router.get("/student-growth/export", exportStudentGrowthXLSX);

router.get("/attendance", getAttendanceReport);
router.get("/attendance/export", exportAttendanceXLSX);

export default router;
