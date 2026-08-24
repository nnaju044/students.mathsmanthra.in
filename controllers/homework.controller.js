import Homework from "../models/Homework.js";
import HomeworkSubmission from "../models/HomeworkSubmission.js";
import Lesson from "../models/Lesson.js";
import Course from "../models/Course.js";
import Batch from "../models/Batch.js";
import Student from "../models/Student.js";

// ─────────────────────────────────────────────
// Admin — Homework CRUD
// ─────────────────────────────────────────────

/**
 * GET /admin/homework - List all homework assignments
 */
export const listHomework = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const courseFilter = req.query.course || "";

    const query = {};
    if (search) query.title = { $regex: search, $options: "i" };
    if (courseFilter) query.course = courseFilter;

    const [homework, totalCount, courses] = await Promise.all([
      Homework.find(query)
        .populate("lesson", "title lessonDate")
        .populate("course", "title")
        .populate("batch", "batchName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Homework.countDocuments(query),
      Course.find({ status: "active" }).sort({ title: 1 }).lean(),
    ]);

    const totalPages = Math.ceil(totalCount / limit);
    const flash = req.session.flash || {};
    req.session.flash = {};

    // Get submission count per homework
    const hwIds = homework.map((h) => h._id);
    const submissionCounts = await HomeworkSubmission.aggregate([
      { $match: { homework: { $in: hwIds } } },
      { $group: { _id: "$homework", count: { $sum: 1 } } },
    ]);
    const countMap = {};
    submissionCounts.forEach((s) => { countMap[s._id.toString()] = s.count; });
    homework.forEach((h) => { h.submissionCount = countMap[h._id.toString()] || 0; });

    res.render("admin/homework/index", {
      admin: req.session.admin,
      homework,
      courses,
      currentPage: page,
      totalPages,
      totalCount,
      search,
      courseFilter,
      activePage: "Homework",
      success: flash.success || null,
      error: flash.error || null,
    });
  } catch (error) {
    console.error("❌ Error listing homework:", error);
    res.status(500).render("error", { message: "Failed to load homework", error: { status: 500 } });
  }
};

/**
 * GET /admin/homework/new
 */
export const getAddHomework = async (req, res) => {
  try {
    const [lessons, courses, batches] = await Promise.all([
      Lesson.find().populate("course", "title").sort({ lessonDate: -1, createdAt: -1 }).lean(),
      Course.find({ status: "active" }).sort({ title: 1 }).lean(),
      Batch.find({ status: { $in: ["active", "upcoming"] } }).sort({ batchName: 1 }).lean(),
    ]);

    res.render("admin/homework/new", {
      admin: req.session.admin,
      lessons,
      courses,
      batches,
      activePage: "Homework",
      error: null,
    });
  } catch (error) {
    console.error("❌ Error loading add homework form:", error);
    res.status(500).render("error", { message: "Failed to load form", error: { status: 500 } });
  }
};

/**
 * POST /admin/homework
 */
export const postAddHomework = async (req, res) => {
  try {
    const { lesson, course, batch, title, description, dueDate, status } = req.body;

    if (!lesson || !title) {
      req.session.flash = { error: "Lesson and title are required." };
      return res.redirect("/admin/homework/new");
    }

    // Build attachments from uploaded files
    const attachments = (req.files || []).map((f) => ({
      url: f.path,
      name: f.originalname,
      publicId: f.filename,
    }));

    await Homework.create({
      lesson,
      course: course || undefined,
      batch: batch || undefined,
      title: title.trim(),
      description: description?.trim() || "",
      dueDate: dueDate ? new Date(dueDate) : undefined,
      attachments,
      status: status || "active",
    });

    console.log(`📝 New homework created: ${title}`);
    req.session.flash = { success: `Homework "${title}" created.` };
    res.redirect("/admin/homework");
  } catch (error) {
    console.error("❌ Error adding homework:", error);
    req.session.flash = { error: "Failed to create homework. " + error.message };
    res.redirect("/admin/homework/new");
  }
};

/**
 * GET /admin/homework/:id/edit
 */
export const getEditHomework = async (req, res) => {
  try {
    const [hw, lessons, courses, batches] = await Promise.all([
      Homework.findById(req.params.id).lean(),
      Lesson.find().populate("course", "title").sort({ lessonDate: -1, createdAt: -1 }).lean(),
      Course.find({ status: "active" }).sort({ title: 1 }).lean(),
      Batch.find({ status: { $in: ["active", "upcoming"] } }).sort({ batchName: 1 }).lean(),
    ]);

    if (!hw) {
      req.session.flash = { error: "Homework not found." };
      return res.redirect("/admin/homework");
    }

    res.render("admin/homework/edit", {
      admin: req.session.admin,
      hw,
      lessons,
      courses,
      batches,
      activePage: "Homework",
      error: null,
    });
  } catch (error) {
    console.error("❌ Error loading edit homework:", error);
    req.session.flash = { error: "Failed to load homework." };
    res.redirect("/admin/homework");
  }
};

/**
 * POST /admin/homework/:id
 */
export const postEditHomework = async (req, res) => {
  try {
    const { lesson, course, batch, title, description, dueDate, status } = req.body;
    const existing = await Homework.findById(req.params.id).lean();

    const newAttachments = (req.files || []).map((f) => ({
      url: f.path,
      name: f.originalname,
      publicId: f.filename,
    }));
    const existingAttachments = existing?.attachments || [];

    await Homework.findByIdAndUpdate(req.params.id, {
      lesson,
      course: course || undefined,
      batch: batch || undefined,
      title: title?.trim(),
      description: description?.trim() || "",
      dueDate: dueDate ? new Date(dueDate) : undefined,
      attachments: [...existingAttachments, ...newAttachments],
      status: status || "active",
    });

    req.session.flash = { success: `Homework "${title}" updated.` };
    res.redirect("/admin/homework");
  } catch (error) {
    console.error("❌ Error updating homework:", error);
    req.session.flash = { error: "Failed to update homework." };
    res.redirect(`/admin/homework/${req.params.id}/edit`);
  }
};

/**
 * POST /admin/homework/:id/delete
 */
export const deleteHomework = async (req, res) => {
  try {
    const hw = await Homework.findByIdAndDelete(req.params.id);
    if (hw) {
      // Also delete all submissions for this homework
      await HomeworkSubmission.deleteMany({ homework: req.params.id });
      req.session.flash = { success: `Homework "${hw.title}" deleted.` };
    } else {
      req.session.flash = { error: "Homework not found." };
    }
    res.redirect("/admin/homework");
  } catch (error) {
    console.error("❌ Error deleting homework:", error);
    req.session.flash = { error: "Failed to delete homework." };
    res.redirect("/admin/homework");
  }
};

// ─────────────────────────────────────────────
// Admin — Homework Review Panel
// ─────────────────────────────────────────────

/**
 * GET /admin/homework/:id/review - Show all submissions for a homework
 */
export const getHomeworkReview = async (req, res) => {
  try {
    const [hw, submissions] = await Promise.all([
      Homework.findById(req.params.id)
        .populate("lesson", "title lessonDate")
        .populate("course", "title")
        .populate("batch", "batchName")
        .lean(),
      HomeworkSubmission.find({ homework: req.params.id })
        .populate("student", "name phone email course batch")
        .sort({ submittedAt: -1 })
        .lean(),
    ]);

    if (!hw) {
      req.session.flash = { error: "Homework not found." };
      return res.redirect("/admin/homework");
    }

    const flash = req.session.flash || {};
    req.session.flash = {};

    res.render("admin/homework/review", {
      admin: req.session.admin,
      hw,
      submissions,
      activePage: "Homework",
      success: flash.success || null,
      error: flash.error || null,
    });
  } catch (error) {
    console.error("❌ Error loading homework review:", error);
    res.status(500).render("error", { message: "Failed to load review panel", error: { status: 500 } });
  }
};

/**
 * POST /admin/homework/submissions/:submissionId/review - Save review (marks, rating, feedback, status)
 */
export const postReviewSubmission = async (req, res) => {
  try {
    const { status, marks, rating, feedback, homeworkId } = req.body;

    await HomeworkSubmission.findByIdAndUpdate(req.params.submissionId, {
      status: status || "review",
      marks: marks?.trim() || "",
      rating: rating ? parseFloat(rating) : null,
      feedback: feedback?.trim() || "",
      reviewedAt: new Date(),
    });

    console.log(`📋 Homework submission reviewed: ${req.params.submissionId}`);
    req.session.flash = { success: "Submission reviewed successfully." };
    res.redirect(`/admin/homework/${homeworkId}/review`);
  } catch (error) {
    console.error("❌ Error reviewing submission:", error);
    req.session.flash = { error: "Failed to save review." };
    res.redirect("/admin/homework");
  }
};
