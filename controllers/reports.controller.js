import {
  getRevenueReportData,
  generateRevenueXLSX,
} from "../services/reports/revenueReport.service.js";
import {
  getStudentGrowthData,
  generateStudentGrowthXLSX,
} from "../services/reports/studentGrowth.service.js";
import {
  getAttendanceReportData,
  generateAttendanceXLSX,
} from "../services/reports/attendanceReport.service.js";

// ── Revenue Report ─────────────────────────────────────────────────────────────

export const getRevenueReport = async (req, res) => {
  try {
    const monthsData = await getRevenueReportData();
    res.render("admin/reports/revenue", {
      admin: req.session.admin,
      activePage: "Reports",
      title: "Revenue Report — Maths Manthra",
      monthsData,
      chartLabels: JSON.stringify(monthsData.map((m) => m.month)),
      chartData: JSON.stringify(monthsData.map((m) => m.totalRevenue)),
    });
  } catch (error) {
    console.error("❌ Revenue report error:", error);
    res.status(500).render("error", { message: "Failed to load revenue report", error: { status: 500 } });
  }
};

export const exportRevenueXLSX = async (req, res) => {
  try {
    const monthsData = await getRevenueReportData();
    const buffer = await generateRevenueXLSX(monthsData);
    const now = new Date();
    const filename = `Revenue-${now.toLocaleDateString("en-IN", { month: "short", year: "numeric" }).replace(" ", "-")}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error("❌ Revenue XLSX export error:", error);
    res.status(500).send("Failed to export revenue report.");
  }
};

// ── Student Growth Report ──────────────────────────────────────────────────────

export const getStudentGrowthReport = async (req, res) => {
  try {
    const monthsData = await getStudentGrowthData();
    res.render("admin/reports/student-growth", {
      admin: req.session.admin,
      activePage: "Reports",
      title: "Student Growth Report — Maths Manthra",
      monthsData,
      chartLabels: JSON.stringify(monthsData.map((m) => m.month)),
      newStudentsData: JSON.stringify(monthsData.map((m) => m.newStudents)),
      activeStudentsData: JSON.stringify(monthsData.map((m) => m.activeStudents)),
    });
  } catch (error) {
    console.error("❌ Student growth report error:", error);
    res.status(500).render("error", { message: "Failed to load student growth report", error: { status: 500 } });
  }
};

export const exportStudentGrowthXLSX = async (req, res) => {
  try {
    const monthsData = await getStudentGrowthData();
    const buffer = await generateStudentGrowthXLSX(monthsData);
    const now = new Date();
    const filename = `Student-Growth-${now.toLocaleDateString("en-IN", { month: "short", year: "numeric" }).replace(" ", "-")}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error("❌ Student growth XLSX export error:", error);
    res.status(500).send("Failed to export student growth report.");
  }
};

// ── Attendance Report ──────────────────────────────────────────────────────────

export const getAttendanceReport = async (req, res) => {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const records = await getAttendanceReportData(start, end);
    const monthLabel = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

    res.render("admin/reports/attendance", {
      admin: req.session.admin,
      activePage: "Reports",
      title: "Attendance Report — Maths Manthra",
      records,
      monthLabel,
    });
  } catch (error) {
    console.error("❌ Attendance report error:", error);
    res.status(500).render("error", { message: "Failed to load attendance report", error: { status: 500 } });
  }
};

export const exportAttendanceXLSX = async (req, res) => {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const records = await getAttendanceReportData(start, end);
    const monthLabel = now.toLocaleDateString("en-IN", { month: "short", year: "numeric" }).replace(" ", "-");
    const buffer = await generateAttendanceXLSX(records, monthLabel);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="Attendance-${monthLabel}.xlsx"`);
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error("❌ Attendance XLSX export error:", error);
    res.status(500).send("Failed to export attendance report.");
  }
};
