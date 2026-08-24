import ExcelJS from "exceljs";
import Payment from "../../models/Payment.js";
import Student from "../../models/Student.js";

/**
 * Generate revenue analytics data for the last 12 months.
 * Returns an array of monthly objects.
 */
export const getRevenueReportData = async () => {
  const now = new Date();
  const months = [];

  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const label = start.toLocaleDateString("en-IN", { month: "short", year: "numeric" });

    const [revenueAgg, paidCount, pendingCount, overdueCount] = await Promise.all([
      Payment.aggregate([
        { $match: { status: "completed", paidDate: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
      Payment.countDocuments({ status: "completed", paidDate: { $gte: start, $lte: end } }),
      Payment.countDocuments({ status: "pending", createdAt: { $gte: start, $lte: end } }),
      Payment.countDocuments({ status: "overdue", createdAt: { $gte: start, $lte: end } }),
    ]);

    const totalRevenue = revenueAgg[0]?.total || 0;
    const paidStudents = paidCount;

    months.push({
      month: label,
      totalRevenue,
      paidStudents,
      pendingStudents: pendingCount,
      overdueStudents: overdueCount,
      avgRevenuePerStudent: paidStudents > 0 ? Math.round(totalRevenue / paidStudents) : 0,
    });
  }

  return months;
};

/**
 * Build and return an ExcelJS workbook buffer for the revenue report.
 */
export const generateRevenueXLSX = async (monthsData) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Maths Manthra LMS";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Revenue Report", {
    pageSetup: { paperSize: 9, orientation: "landscape" },
  });

  // ── Column definitions ──────────────────────────────────────────────────────
  sheet.columns = [
    { header: "Month", key: "month", width: 18 },
    { header: "Total Revenue (₹)", key: "totalRevenue", width: 22 },
    { header: "Paid Students", key: "paidStudents", width: 18 },
    { header: "Pending Students", key: "pendingStudents", width: 20 },
    { header: "Overdue Students", key: "overdueStudents", width: 20 },
    { header: "Avg Revenue / Student (₹)", key: "avgRevenuePerStudent", width: 28 },
  ];

  // ── Header row styling ──────────────────────────────────────────────────────
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 30;

  // ── Data rows ──────────────────────────────────────────────────────────────
  monthsData.forEach((row, idx) => {
    const excelRow = sheet.addRow(row);
    excelRow.alignment = { horizontal: "center" };
    // Alternating row background
    if (idx % 2 === 0) {
      excelRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    }
    // Highlight revenue column
    excelRow.getCell("totalRevenue").font = { bold: true, color: { argb: "FF4F46E5" } };
  });

  // ── Totals row ─────────────────────────────────────────────────────────────
  const totalRevenue = monthsData.reduce((sum, r) => sum + r.totalRevenue, 0);
  const totalPaid = monthsData.reduce((sum, r) => sum + r.paidStudents, 0);
  const totalsRow = sheet.addRow({
    month: "TOTAL",
    totalRevenue,
    paidStudents: totalPaid,
    pendingStudents: monthsData.reduce((s, r) => s + r.pendingStudents, 0),
    overdueStudents: monthsData.reduce((s, r) => s + r.overdueStudents, 0),
    avgRevenuePerStudent: totalPaid > 0 ? Math.round(totalRevenue / totalPaid) : 0,
  });
  totalsRow.font = { bold: true };
  totalsRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDE9FE" } };

  // ── Borders ────────────────────────────────────────────────────────────────
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    });
  });

  return workbook.xlsx.writeBuffer();
};
