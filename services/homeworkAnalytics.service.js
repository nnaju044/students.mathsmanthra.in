import Homework from "../models/Homework.js";
import HomeworkSubmission from "../models/HomeworkSubmission.js";
import Student from "../models/Student.js";

/**
 * Get admin-level homework analytics (global stats + top/weak performers).
 */
export const getAdminHomeworkStats = async () => {
  try {
    const [totalAssignments, totalSubmissions] = await Promise.all([
      Homework.countDocuments({ status: "active" }),
      HomeworkSubmission.countDocuments(),
    ]);

    const now = new Date();

    // Overdue: homework past dueDate with < total submissions than students in batch
    const overdueHomeworks = await Homework.countDocuments({
      status: "active",
      dueDate: { $lt: now },
    });

    // Average marks and rating across all rated submissions
    const statsAgg = await HomeworkSubmission.aggregate([
      { $match: { marks: { $gt: 0 } } },
      {
        $group: {
          _id: null,
          avgMarks: { $avg: "$marks" },
          avgRating: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]);

    const avgMarks = statsAgg[0]?.avgMarks ? Math.round(statsAgg[0].avgMarks * 10) / 10 : 0;
    const avgRating = statsAgg[0]?.avgRating ? Math.round(statsAgg[0].avgRating * 10) / 10 : 0;

    // Submission rate (%)
    const totalStudents = await Student.countDocuments({ status: "active" });
    const submissionRate = totalStudents > 0 && totalAssignments > 0
      ? Math.round((totalSubmissions / (totalStudents * totalAssignments)) * 100)
      : 0;

    // Top performers: students with highest avg marks
    const topPerformers = await HomeworkSubmission.aggregate([
      { $match: { marks: { $gt: 0 } } },
      { $group: { _id: "$student", avgMarks: { $avg: "$marks" }, submissions: { $sum: 1 } } },
      { $sort: { avgMarks: -1 } },
      { $limit: 5 },
      { $lookup: { from: "students", localField: "_id", foreignField: "_id", as: "studentData" } },
      { $unwind: "$studentData" },
      { $project: { name: "$studentData.name", avgMarks: { $round: ["$avgMarks", 1] }, submissions: 1 } },
    ]);

    // Weak performers: students with lowest avg marks
    const weakPerformers = await HomeworkSubmission.aggregate([
      { $match: { marks: { $gt: 0 } } },
      { $group: { _id: "$student", avgMarks: { $avg: "$marks" }, submissions: { $sum: 1 } } },
      { $sort: { avgMarks: 1 } },
      { $limit: 5 },
      { $lookup: { from: "students", localField: "_id", foreignField: "_id", as: "studentData" } },
      { $unwind: "$studentData" },
      { $project: { name: "$studentData.name", avgMarks: { $round: ["$avgMarks", 1] }, submissions: 1 } },
    ]);

    return {
      totalAssignments,
      totalSubmissions,
      overdueHomeworks,
      avgMarks,
      avgRating,
      submissionRate: Math.min(submissionRate, 100),
      overdueRate: totalAssignments > 0 ? Math.round((overdueHomeworks / totalAssignments) * 100) : 0,
      topPerformers,
      weakPerformers,
    };
  } catch (err) {
    console.error("⚠️ Homework analytics error:", err.message);
    return {
      totalAssignments: 0, totalSubmissions: 0, overdueHomeworks: 0,
      avgMarks: 0, avgRating: 0, submissionRate: 0, overdueRate: 0,
      topPerformers: [], weakPerformers: [],
    };
  }
};

/**
 * Get per-student homework completion stats.
 * @param {string} studentId
 */
export const getStudentHomeworkStats = async (studentId) => {
  try {
    const [total, submitted] = await Promise.all([
      Homework.countDocuments({ status: "active" }),
      HomeworkSubmission.countDocuments({ student: studentId }),
    ]);

    const completionPercent = total > 0 ? Math.round((submitted / total) * 100) : 0;

    const submissions = await HomeworkSubmission.find({ student: studentId })
      .populate("homework", "title dueDate")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return { total, submitted, pending: Math.max(total - submitted, 0), completionPercent, recentSubmissions: submissions };
  } catch (err) {
    console.error("⚠️ Student homework analytics error:", err.message);
    return { total: 0, submitted: 0, pending: 0, completionPercent: 0, recentSubmissions: [] };
  }
};
