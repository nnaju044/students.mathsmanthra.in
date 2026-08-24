import Student from "../models/Student.js";
import Course from "../models/Course.js";
import Batch from "../models/Batch.js";
import Lesson from "../models/Lesson.js";
import Payment from "../models/Payment.js";
import Announcement from "../models/Announcement.js";
import Attendance from "../models/Attendance.js";
import HomeworkSubmission from "../models/HomeworkSubmission.js";
import Homework from "../models/Homework.js";

/**
 * Fetch all dashboard statistics dynamically from MongoDB
 */
export const getDashboardStats = async () => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [
    totalStudents,
    activeStudents,
    newStudentsThisWeek,
    newStudentsThisMonth,
    totalCourses,
    runningCourses,
    totalBatches,
    totalLessons,
    lessonsThisMonth,
    revenueAgg,
    revenueThisMonthAgg,
    pendingPayments,
    overduePayments,
    totalAnnouncements,
    todayAttendance,
    totalAttendance,
    presentAttendance,
    totalHomework,
    totalSubmissions,
  ] = await Promise.all([
    Student.countDocuments(),
    Student.countDocuments({ status: "active" }),
    Student.countDocuments({ joinedDate: { $gte: startOfWeek } }),
    Student.countDocuments({ joinedDate: { $gte: startOfMonth } }),
    Course.countDocuments(),
    Course.countDocuments({ status: "active" }),
    Batch.countDocuments(),
    Lesson.countDocuments(),
    Lesson.countDocuments({ lessonDate: { $gte: startOfMonth, $lte: endOfMonth } }),
    Payment.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Payment.aggregate([
      { $match: { status: "completed", paidDate: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Payment.countDocuments({ status: "pending" }),
    Payment.countDocuments({ status: "overdue" }),
    Announcement.countDocuments(),
    Attendance.countDocuments({ date: { $gte: startOfToday } }),
    Attendance.countDocuments(),
    Attendance.countDocuments({ status: "present" }),
    Homework.countDocuments({ status: "active" }),
    HomeworkSubmission.countDocuments(),
  ]);

  const revenueCollected = revenueAgg.length > 0 ? revenueAgg[0].total : 0;
  const revenueThisMonth = revenueThisMonthAgg.length > 0 ? revenueThisMonthAgg[0].total : 0;
  const engagementRate = totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;
  const attendanceRate = totalAttendance > 0 ? Math.round((presentAttendance / totalAttendance) * 100) : 0;
  const homeworkCompletionRate = totalHomework > 0 && totalStudents > 0
    ? Math.min(Math.round((totalSubmissions / (totalHomework * totalStudents)) * 100), 100)
    : 0;

  // Format revenue for display
  const formatRevenue = (amount) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  return {
    totalStudents,
    activeStudents,
    newStudentsThisWeek,
    newStudentsThisMonth,
    totalCourses,
    runningCourses,
    totalBatches,
    totalLessons,
    lessonsThisMonth,
    revenueCollected: formatRevenue(revenueCollected),
    revenueRaw: revenueCollected,
    revenueThisMonth: formatRevenue(revenueThisMonth),
    revenueThisMonthRaw: revenueThisMonth,
    pendingPayments,
    overduePayments,
    totalAnnouncements,
    todayAttendance,
    engagementRate,
    attendanceRate,
    homeworkCompletionRate,
  };
};

/**
 * Get attendance analytics for admin dashboard.
 */
export const getAttendanceAnalytics = async () => {
  try {
    // Overall stats
    const [totalRecords, presentCount, absentCount, lateCount] = await Promise.all([
      Attendance.countDocuments(),
      Attendance.countDocuments({ status: "present" }),
      Attendance.countDocuments({ status: "absent" }),
      Attendance.countDocuments({ status: "late" }),
    ]);

    const overallRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

    // Top students by attendance %
    const topStudents = await Attendance.aggregate([
      { $group: { _id: "$student", present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } }, total: { $sum: 1 } } },
      { $match: { total: { $gte: 3 } } },
      { $addFields: { rate: { $multiply: [{ $divide: ["$present", "$total"] }, 100] } } },
      { $sort: { rate: -1 } },
      { $limit: 5 },
      { $lookup: { from: "students", localField: "_id", foreignField: "_id", as: "s" } },
      { $unwind: "$s" },
      { $project: { name: "$s.name", rate: { $round: ["$rate", 0] }, present: 1, total: 1 } },
    ]);

    // Low attendance students
    const lowStudents = await Attendance.aggregate([
      { $group: { _id: "$student", present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } }, total: { $sum: 1 } } },
      { $match: { total: { $gte: 3 } } },
      { $addFields: { rate: { $multiply: [{ $divide: ["$present", "$total"] }, 100] } } },
      { $sort: { rate: 1 } },
      { $limit: 5 },
      { $lookup: { from: "students", localField: "_id", foreignField: "_id", as: "s" } },
      { $unwind: "$s" },
      { $project: { name: "$s.name", rate: { $round: ["$rate", 0] }, present: 1, total: 1 } },
    ]);

    return { overallRate, totalRecords, presentCount, absentCount, lateCount, topStudents, lowStudents };
  } catch (err) {
    console.error("⚠️ Attendance analytics error:", err.message);
    return { overallRate: 0, totalRecords: 0, presentCount: 0, absentCount: 0, lateCount: 0, topStudents: [], lowStudents: [] };
  }
};

/**
 * Get recent activities (latest students + payments combined, sorted by date)
 */
export const getRecentActivities = async (limit = 8) => {
  const [recentStudents, recentPayments, recentLessons] = await Promise.all([
    Student.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("course", "title")
      .lean(),
    Payment.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("student", "name")
      .lean(),
    Lesson.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("course", "title")
      .lean(),
  ]);

  const activities = [];

  recentStudents.forEach((s) => {
    activities.push({
      icon: "student",
      color: "indigo",
      text: `<strong>${s?.name || "Student"}</strong> enrolled${s?.course ? ` in <strong>${s.course.title}</strong>` : ""}.`,
      time: timeAgo(s?.createdAt || new Date()),
      date: s?.createdAt || new Date(),
    });
  });

  recentPayments.forEach((p) => {
    activities.push({
      icon: "payment",
      color: "amber",
      text: `Payment of <strong>₹${(p?.amount || 0).toLocaleString("en-IN")}</strong> ${p?.status === "completed" ? "received" : "recorded"} from <strong>${p?.student?.name || "Student"}</strong>.`,
      time: timeAgo(p?.createdAt || new Date()),
      date: p?.createdAt || new Date(),
    });
  });

  recentLessons.forEach((l) => {
    activities.push({
      icon: "lesson",
      color: "blue",
      text: `New lesson <strong>${l?.title || "Lesson"}</strong> added${l?.course ? ` to <strong>${l.course.title}</strong>` : ""}.`,
      time: timeAgo(l?.createdAt || new Date()),
      date: l?.createdAt || new Date(),
    });
  });

  // Sort by date descending and limit
  activities.sort((a, b) => new Date(b.date) - new Date(a.date));
  return activities.slice(0, limit);
};

/**
 * Get monthly revenue data for chart (last 12 months)
 */
export const getMonthlyRevenue = async () => {
  const now = new Date();

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const payments = await Payment.find({
    status: "completed",
    paidDate: { $gte: startOfMonth, $lte: endOfMonth },
  }).lean();

  // Group payments into 4 weekly buckets by day of month
  const weeklyRevenue = [0, 0, 0, 0];
  payments.forEach((p) => {
    const day = new Date(p.paidDate).getDate();
    if (day <= 7) {
      weeklyRevenue[0] += p.amount;
    } else if (day <= 14) {
      weeklyRevenue[1] += p.amount;
    } else if (day <= 21) {
      weeklyRevenue[2] += p.amount;
    } else {
      weeklyRevenue[3] += p.amount;
    }
  });

  return {
    labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
    data: weeklyRevenue,
  };
};

/**
 * Get monthly enrollments data for chart (last 12 months)
 */
export const getMonthlyEnrollments = async () => {
  const now = new Date();

  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59
  );

  const students = await Student.find({
    joinedDate: {
      $gte: startOfMonth,
      $lte: endOfMonth,
    },
  });

  const weeklyCounts = [0, 0, 0, 0];

  students.forEach((student) => {
    const day = new Date(student.joinedDate).getDate();

    if (day <= 7) {
      weeklyCounts[0]++;
    } else if (day <= 14) {
      weeklyCounts[1]++;
    } else if (day <= 21) {
      weeklyCounts[2]++;
    } else {
      weeklyCounts[3]++;
    }
  });

  return {
    labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
    data: weeklyCounts,
  };
};

/**
 * Human-readable "time ago" helper
 */
function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes > 1 ? "s" : ""} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
