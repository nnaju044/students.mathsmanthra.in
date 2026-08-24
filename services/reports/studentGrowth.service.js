import ExcelJS from "exceljs";
import Student from "../../models/Student.js";

/**
 * Generate student growth data for the last 12 months.
 */
export const getStudentGrowthData = async () => {
  const now = new Date();
  const months = [];

  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const label = start.toLocaleDateString("en-IN", { month: "short", year: "numeric" });

    const [newStudents, activeStudents, inactiveStudents, graduatedStudents] = await Promise.all([
      Student.countDocuments({ joinedDate: { $gte: start, $lte: end } }),
      Student.countDocuments({ status: "active", createdAt: { $lte: end } }),
      Student.countDocuments({ status: "inactive", createdAt: { $lte: end } }),
      Student.countDocuments({ status: "graduated", createdAt: { $lte: end } }),
    ]);

    months.push({ month: label, newStudents, activeStudents, inactiveStudents, graduatedStudents });
  }

  return months;
};

/**
 * Build and return an ExcelJS workbook buffer for the student growth report.
 */
export const generateStudentGrowthXLSX = async (monthsData) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Maths Manthra LMS";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Student Growth", {
    pageSetup: { paperSize: 9, orientation: "landscape" },
  });

  sheet.columns = [
    { header: "Month", key: "month", width: 18 },
    { header: "New Students", key: "newStudents", width: 18 },
    { header: "Active Students", key: "activeStudents", width: 20 },
    { header: "Inactive Students", key: "inactiveStudents", width: 22 },
    { header: "Graduated Students", key: "graduatedStudents", width: 24 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF059669" } }; // Emerald
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 30;

  monthsData.forEach((row, idx) => {
    const excelRow = sheet.addRow(row);
    excelRow.alignment = { horizontal: "center" };
    if (idx % 2 === 0) {
      excelRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } };
    }
    excelRow.getCell("newStudents").font = { bold: true, color: { argb: "FF059669" } };
  });

  // Totals
  const totalsRow = sheet.addRow({
    month: "TOTAL",
    newStudents: monthsData.reduce((s, r) => s + r.newStudents, 0),
    activeStudents: "—",
    inactiveStudents: "—",
    graduatedStudents: "—",
  });
  totalsRow.font = { bold: true };
  totalsRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } };

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
