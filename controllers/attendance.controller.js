import Attendance from "../models/Attendance.js";
import Batch from "../models/Batch.js";
import Student from "../models/Student.js";
import Lesson from "../models/Lesson.js";

/**
 * GET /admin/attendance - Main attendance page (batch + date selector)
 */
export const getAttendancePage = async (req, res) => {
  try {
    const batches = await Batch.find({ status: { $in: ["active", "upcoming"] } })
      .populate("course", "title")
      .sort({ batchName: 1 })
      .lean();

    const flash = req.session.flash || {};
    req.session.flash = {};

    res.render("admin/attendance/index", {
      admin: req.session.admin,
      batches,
      activePage: "Attendance",
      success: flash.success || null,
      error: flash.error || null,
    });
  } catch (error) {
    console.error("❌ Error loading attendance page:", error);
    res.status(500).render("error", { message: "Failed to load attendance", error: { status: 500 } });
  }
};

/**
 * GET /admin/attendance/mark?batchId=&date= - Show student list for marking attendance
 */
export const getMarkAttendance = async (req, res) => {
  try {
    const { batchId, date } = req.query;

    if (!batchId || !date) {
      req.session.flash = { error: "Please select a batch and date." };
      return res.redirect("/admin/attendance");
    }

    const markDate = new Date(date);
    const dayStart = new Date(markDate.getFullYear(), markDate.getMonth(), markDate.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const [batch, existingRecords] = await Promise.all([
      Batch.findById(batchId)
        .populate({ path: "students", select: "name email phone profileImage status" })
        .populate("course", "title")
        .lean(),
      Attendance.find({
        batch: batchId,
        date: { $gte: dayStart, $lt: dayEnd },
      }).lean(),
    ]);

    if (!batch) {
      req.session.flash = { error: "Batch not found." };
      return res.redirect("/admin/attendance");
    }

    // Map existing records by student ID
    const existingMap = {};
    existingRecords.forEach((r) => { existingMap[r.student.toString()] = r.status; });

    const flash = req.session.flash || {};
    req.session.flash = {};

    res.render("admin/attendance/mark", {
      admin: req.session.admin,
      batch,
      date,
      existingMap,
      activePage: "Attendance",
      success: flash.success || null,
      error: flash.error || null,
    });
  } catch (error) {
    console.error("❌ Error loading mark attendance:", error);
    res.status(500).render("error", { message: "Failed to load attendance form", error: { status: 500 } });
  }
};

/**
 * POST /admin/attendance/mark - Save attendance for a batch/date
 */
export const postMarkAttendance = async (req, res) => {
  try {
    const { batchId, date, attendance } = req.body;

    if (!batchId || !date || !attendance) {
      req.session.flash = { error: "Invalid attendance data." };
      return res.redirect("/admin/attendance");
    }

    const markDate = new Date(date);
    const dayStart = new Date(markDate.getFullYear(), markDate.getMonth(), markDate.getDate());

    // attendance is an object: { studentId: 'present'|'absent'|'late' }
    const attendanceEntries = Object.entries(attendance);

    // Upsert each record
    const ops = attendanceEntries.map(([studentId, status]) => ({
      updateOne: {
        filter: {
          student: studentId,
          batch: batchId,
          date: { $gte: dayStart, $lt: new Date(dayStart.getTime() + 24 * 60 * 60 * 1000) },
        },
        update: {
          $set: { student: studentId, batch: batchId, date: dayStart, status },
        },
        upsert: true,
      },
    }));

    if (ops.length > 0) {
      await Attendance.bulkWrite(ops);
    }

    console.log(`✅ Attendance marked for batch ${batchId} on ${date}`);
    req.session.flash = { success: `Attendance marked for ${attendanceEntries.length} students.` };
    res.redirect(`/admin/attendance/mark?batchId=${batchId}&date=${date}`);
  } catch (error) {
    console.error("❌ Error marking attendance:", error);
    req.session.flash = { error: "Failed to save attendance." };
    res.redirect("/admin/attendance");
  }
};

/**
 * GET /admin/attendance/view?batchId=&month= - View attendance records
 */
export const getViewAttendance = async (req, res) => {
  try {
    const { batchId, month } = req.query;
    const batches = await Batch.find().populate("course", "title").sort({ batchName: 1 }).lean();

    let records = [];
    let batch = null;
    let studentStats = [];

    if (batchId) {
      const targetDate = month ? new Date(month) : new Date();
      const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);

      [batch, records] = await Promise.all([
        Batch.findById(batchId).populate("students", "name email phone").lean(),
        Attendance.find({ batch: batchId, date: { $gte: startOfMonth, $lte: endOfMonth } })
          .populate("student", "name")
          .sort({ date: -1 })
          .lean(),
      ]);

      if (batch) {
        // Calculate attendance stats per student
        const totalDays = [...new Set(records.map((r) => r.date.toDateString()))].length;
        const statsMap = {};
        (batch.students || []).forEach((s) => {
          statsMap[s._id.toString()] = { student: s, present: 0, absent: 0, late: 0, total: totalDays };
        });
        records.forEach((r) => {
          const key = r.student?._id?.toString();
          if (key && statsMap[key]) {
            statsMap[key][r.status] = (statsMap[key][r.status] || 0) + 1;
          }
        });
        studentStats = Object.values(statsMap).map((s) => ({
          ...s,
          percentage: totalDays > 0 ? Math.round((s.present / totalDays) * 100) : 0,
        }));
      }
    }

    const flash = req.session.flash || {};
    req.session.flash = {};

    res.render("admin/attendance/view", {
      admin: req.session.admin,
      batches,
      batch,
      records,
      studentStats,
      batchId: batchId || "",
      month: month || "",
      activePage: "Attendance",
      success: flash.success || null,
      error: flash.error || null,
    });
  } catch (error) {
    console.error("❌ Error viewing attendance:", error);
    res.status(500).render("error", { message: "Failed to load attendance records", error: { status: 500 } });
  }
};
