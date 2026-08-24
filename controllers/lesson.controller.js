import Lesson from "../models/Lesson.js";
import Course from "../models/Course.js";
import Batch from "../models/Batch.js";

/**
 * GET /admin/lessons - List all lessons with search + filter
 */
export const listLessons = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const statusFilter = req.query.status || "";
    const courseFilter = req.query.course || "";

    const query = {};
    if (search) query.title = { $regex: search, $options: "i" };
    if (statusFilter) query.status = statusFilter;
    if (courseFilter) query.course = courseFilter;

    const [lessons, totalCount, courses] = await Promise.all([
      Lesson.find(query)
        .populate("course", "title")
        .populate("batch", "batchName")
        .sort({ lessonDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Lesson.countDocuments(query),
      Course.find({ status: "active" }).sort({ title: 1 }).lean(),
    ]);

    const totalPages = Math.ceil(totalCount / limit);
    const flash = req.session.flash || {};
    req.session.flash = {};

    res.render("admin/lessons/index", {
      admin: req.session.admin,
      lessons,
      courses,
      currentPage: page,
      totalPages,
      totalCount,
      search,
      statusFilter,
      courseFilter,
      activePage: "Lessons",
      success: flash.success || null,
      error: flash.error || null,
    });
  } catch (error) {
    console.error("❌ Error listing lessons:", error);
    res.status(500).render("error", { message: "Failed to load lessons", error: { status: 500 } });
  }
};

/**
 * GET /admin/lessons/new
 */
export const getAddLesson = async (req, res) => {
  try {
    const [courses, batches] = await Promise.all([
      Course.find({ status: "active" }).sort({ title: 1 }).lean(),
      Batch.find({ status: { $in: ["active", "upcoming"] } }).sort({ batchName: 1 }).lean(),
    ]);
    res.render("admin/lessons/new", {
      admin: req.session.admin,
      courses,
      batches,
      activePage: "Lessons",
      error: null,
    });
  } catch (error) {
    console.error("❌ Error loading add lesson form:", error);
    res.status(500).render("error", { message: "Failed to load form", error: { status: 500 } });
  }
};

/**
 * POST /admin/lessons
 * Handles: text fields + Cloudinary-uploaded PDFs and videos (via multer middleware in route)
 */
export const postAddLesson = async (req, res) => {
  try {
    const {
      title, description, course, batch,
      lessonDate, lessonTime, meetLink,
      homeworkDescription, videoUrl, notes, order, status,
    } = req.body;

    if (!title || !course) {
      const [courses, batches] = await Promise.all([
        Course.find({ status: "active" }).lean(),
        Batch.find({ status: { $in: ["active", "upcoming"] } }).lean(),
      ]);
      return res.status(400).render("admin/lessons/new", {
        admin: req.session.admin,
        courses,
        batches,
        activePage: "Lessons",
        error: "Lesson title and course are required.",
      });
    }

    // Build pdfMaterials from uploaded files
    const pdfMaterials = (req.files?.pdfMaterials || []).map((f) => ({
      url: f.path,
      name: f.originalname,
      publicId: f.filename,
    }));

    // Build videoMaterials from uploaded files
    const videoMaterials = (req.files?.videoMaterials || []).map((f) => ({
      url: f.path,
      name: f.originalname,
      publicId: f.filename,
    }));

    const lesson = await Lesson.create({
      title: title.trim(),
      description: description?.trim() || "",
      course,
      batch: batch || undefined,
      lessonDate: lessonDate ? new Date(lessonDate) : undefined,
      lessonTime: lessonTime?.trim() || "",
      meetLink: meetLink?.trim() || "",
      pdfMaterials,
      videoMaterials,
      homeworkDescription: homeworkDescription?.trim() || "",
      videoUrl: videoUrl?.trim() || "",
      notes: notes || "",
      order: parseInt(order) || 0,
      status: status || "upcoming",
    });

    // Push lesson ID into the course's lessons array
    await Course.findByIdAndUpdate(course, { $push: { lessons: lesson._id } });

    console.log(`📖 New lesson added: ${title}`);
    req.session.flash = { success: `Lesson "${title}" created successfully.` };
    res.redirect("/admin/lessons");
  } catch (error) {
    console.error("❌ Error adding lesson:", error);
    req.session.flash = { error: "Failed to add lesson. " + error.message };
    res.redirect("/admin/lessons/new");
  }
};

/**
 * GET /admin/lessons/:id/edit
 */
export const getEditLesson = async (req, res) => {
  try {
    const [lesson, courses, batches] = await Promise.all([
      Lesson.findById(req.params.id).lean(),
      Course.find({ status: "active" }).sort({ title: 1 }).lean(),
      Batch.find({ status: { $in: ["active", "upcoming"] } }).sort({ batchName: 1 }).lean(),
    ]);

    if (!lesson) {
      req.session.flash = { error: "Lesson not found." };
      return res.redirect("/admin/lessons");
    }

    res.render("admin/lessons/edit", {
      admin: req.session.admin,
      lesson,
      courses,
      batches,
      activePage: "Lessons",
      error: null,
    });
  } catch (error) {
    console.error("❌ Error loading edit lesson:", error);
    req.session.flash = { error: "Failed to load lesson data." };
    res.redirect("/admin/lessons");
  }
};

/**
 * POST /admin/lessons/:id
 */
export const postEditLesson = async (req, res) => {
  try {
    const {
      title, description, course, batch,
      lessonDate, lessonTime, meetLink,
      homeworkDescription, videoUrl, notes, order, status,
    } = req.body;

    const oldLesson = await Lesson.findById(req.params.id).lean();

    // Build new PDF/video materials from uploaded files (append to existing if any)
    const newPdfs = (req.files?.pdfMaterials || []).map((f) => ({
      url: f.path,
      name: f.originalname,
      publicId: f.filename,
    }));
    const newVideos = (req.files?.videoMaterials || []).map((f) => ({
      url: f.path,
      name: f.originalname,
      publicId: f.filename,
    }));

    // Merge new uploads with existing ones
    const existingPdfs = oldLesson?.pdfMaterials || [];
    const existingVideos = oldLesson?.videoMaterials || [];

    await Lesson.findByIdAndUpdate(req.params.id, {
      title: title?.trim(),
      description: description?.trim() || "",
      course,
      batch: batch || undefined,
      lessonDate: lessonDate ? new Date(lessonDate) : undefined,
      lessonTime: lessonTime?.trim() || "",
      meetLink: meetLink?.trim() || "",
      pdfMaterials: [...existingPdfs, ...newPdfs],
      videoMaterials: [...existingVideos, ...newVideos],
      homeworkDescription: homeworkDescription?.trim() || "",
      videoUrl: videoUrl?.trim() || "",
      notes: notes || "",
      order: parseInt(order) || 0,
      status: status || "upcoming",
    });

    // If course changed, update both course lesson arrays
    if (oldLesson && oldLesson.course?.toString() !== course) {
      await Course.findByIdAndUpdate(oldLesson.course, { $pull: { lessons: oldLesson._id } });
      await Course.findByIdAndUpdate(course, { $addToSet: { lessons: oldLesson._id } });
    }

    console.log(`📖 Lesson updated: ${title}`);
    req.session.flash = { success: `Lesson "${title}" updated successfully.` };
    res.redirect("/admin/lessons");
  } catch (error) {
    console.error("❌ Error updating lesson:", error);
    req.session.flash = { error: "Failed to update lesson." };
    res.redirect(`/admin/lessons/${req.params.id}/edit`);
  }
};

/**
 * POST /admin/lessons/:id/delete
 */
export const deleteLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findByIdAndDelete(req.params.id);
    if (lesson) {
      await Course.findByIdAndUpdate(lesson.course, { $pull: { lessons: lesson._id } });
      console.log(`🗑️ Lesson deleted: ${lesson.title}`);
      req.session.flash = { success: `Lesson "${lesson.title}" deleted.` };
    } else {
      req.session.flash = { error: "Lesson not found." };
    }
    res.redirect("/admin/lessons");
  } catch (error) {
    console.error("❌ Error deleting lesson:", error);
    req.session.flash = { error: "Failed to delete lesson." };
    res.redirect("/admin/lessons");
  }
};

/**
 * POST /admin/lessons/:id/status — Quick status toggle from list
 */
export const updateLessonStatus = async (req, res) => {
  try {
    const { status } = req.body;
    await Lesson.findByIdAndUpdate(req.params.id, { status });
    req.session.flash = { success: `Lesson status updated to "${status}".` };
    res.redirect("/admin/lessons");
  } catch (error) {
    console.error("❌ Error updating lesson status:", error);
    req.session.flash = { error: "Failed to update lesson status." };
    res.redirect("/admin/lessons");
  }
};
