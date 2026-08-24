import ExcelJS from "exceljs";
import Attendance from "../../models/Attendance.js";
import Student from "../../models/Student.js";

/**
 * Generate per-student attendance report for a given month (default: current month).
 * @param {Date} startDate
 * @param {Date} endDate
 */
export const getAttendanceReportData = async (startDate, endDate) => {
  const now = new Date();
  const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
  const end = endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Aggregate attendance per student for the date range
  const records = await Attendance.aggregate([
    { $match: { date: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: "$student",
        present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
        absent: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } },
        late: { $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] } },
        total: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: "students",
        localField: "_id",
        foreignField: "_id",
        as: "studentData",
      },
    },
    { $unwind: "$studentData" },
    {
      $lookup: {
        from: "courses",
        localField: "studentData.course",
        foreignField: "_id",
        as: "courseData",
      },
    },
    {
      $lookup: {
        from: "batches",
        localField: "studentData.batch",
        foreignField: "_id",
        as: "batchData",
      },
    },
    {
      $project: {
        studentName: "$studentData.name",
        course: { $ifNull: [{ $arrayElemAt: ["$courseData.title", 0] }, "—"] },
        batch: { $ifNull: [{ $arrayElemAt: ["$batchData.batchName", 0] }, "—"] },
        present: 1,
        absent: 1,
        late: 1,
        total: 1,
        attendancePercent: {
          $round: [{ $multiply: [{ $divide: ["$present", { $max: ["$total", 1] }] }, 100] }, 1],
        },
      },
    },
    { $sort: { attendancePercent: -1 } },
  ]);

  return records;
};

/**
 * Build and return an ExcelJS workbook buffer for the attendance report.
 */
export const generateAttendanceXLSX = async (records, monthLabel) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Maths Manthra LMS";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(`Attendance ${monthLabel}`, {
    pageSetup: { paperSize: 9, orientation: "landscape" },
  });

  sheet.columns = [
    { header: "Student Name", key: "studentName", width: 25 },
    { header: "Course", key: "course", width: 22 },
    { header: "Batch", key: "batch", width: 20 },
    { header: "Present Days", key: "present", width: 16 },
    { header: "Absent Days", key: "absent", width: 16 },
    { header: "Late Days", key: "late", width: 16 },
    { header: "Attendance %", key: "attendancePercent", width: 18 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0EA5E9" } }; // Sky blue
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 30;

  records.forEach((row, idx) => {
    const excelRow = sheet.addRow({
      studentName: row.studentName,
      course: row.course,
      batch: row.batch,
      present: row.present,
      absent: row.absent,
      late: row.late,
      attendancePercent: `${row.attendancePercent}%`,
    });
    excelRow.alignment = { horizontal: "center" };
    if (idx % 2 === 0) {
      excelRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F9FF" } };
    }
    // Color-code attendance % cell
    const pctCell = excelRow.getCell("attendancePercent");
    pctCell.font = {
      bold: true,
      color: {
        argb: row.attendancePercent >= 75 ? "FF16A34A" : row.attendancePercent >= 50 ? "FFD97706" : "FFDC2626",
      },
    };
    excelRow.getCell("studentName").alignment = { horizontal: "left" };
  });

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
