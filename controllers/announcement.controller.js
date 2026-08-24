import Announcement from "../models/Announcement.js";
import Course from "../models/Course.js";
import Batch from "../models/Batch.js";
import Student from "../models/Student.js";

/**
 * GET /admin/announcements - List all announcements with defensive sanitization
 */
export const listAnnouncements = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    const query = {};
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }

    const [announcements, totalCount] = await Promise.all([
      Announcement.find(query)
        .populate("createdBy", "name")
        .populate("targetCourse", "title")
        .populate("targetBatch", "batchName")
        .populate("targetStudent", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Announcement.countDocuments(query),
    ]);

    // Defensive mapping to ensure EJS never crashes on missing/null fields
    const sanitizedAnnouncements = (announcements || []).map((a) => {
      const audience = a.targetAudience || a.targetType || "all";
      const status = a.status || "draft";
      return {
        ...a,
        title: a.title || "Untitled Announcement",
        content: a.content || "",
        targetAudience: audience,
        targetType: audience,
        status: status,
        createdAt: a.createdAt || new Date(),
        updatedAt: a.updatedAt || new Date(),
      };
    });

    const totalPages = Math.ceil((totalCount || 0) / limit) || 1;
    const flash = req.session.flash || {};
    req.session.flash = {};

    res.render("admin/announcements/index", {
      admin: req.session.admin,
      announcements: sanitizedAnnouncements,
      currentPage: page,
      totalPages,
      totalCount: totalCount || 0,
      search,
      activePage: "Announcements",
      success: flash.success || null,
      error: flash.error || null,
    });
  } catch (error) {
    console.error("❌ Error listing announcements:", error);
    res.status(500).render("error", { message: "Failed to load announcements", error: { status: 500 } });
  }
};

/**
 * GET /admin/announcements/new
 */
export const getAddAnnouncement = async (req, res) => {
  try {
    const [courses, batches, students] = await Promise.all([
      Course.find({ status: "active" }).sort({ title: 1 }).lean(),
      Batch.find({ status: { $in: ["active", "upcoming"] } }).sort({ batchName: 1 }).lean(),
      Student.find({ status: "active" }).sort({ name: 1 }).lean(),
    ]);

    res.render("admin/announcements/new", {
      admin: req.session.admin,
      courses: courses || [],
      batches: batches || [],
      students: students || [],
      activePage: "Announcements",
      error: null,
    });
  } catch (error) {
    console.error("❌ Error loading add announcement form:", error);
    res.status(500).render("error", { message: "Failed to load form", error: { status: 500 } });
  }
};

/**
 * POST /admin/announcements
 */
export const postAddAnnouncement = async (req, res) => {
  try {
    const { title, content, targetAudience, targetType, targetCourse, targetBatch, targetStudent, status } = req.body;
    const audience = targetAudience || targetType || "all";

    if (!title || !content) {
      const [courses, batches, students] = await Promise.all([
        Course.find({ status: "active" }).lean(),
        Batch.find().lean(),
        Student.find({ status: "active" }).lean(),
      ]);
      return res.status(400).render("admin/announcements/new", {
        admin: req.session.admin,
        courses: courses || [],
        batches: batches || [],
        students: students || [],
        activePage: "Announcements",
        error: "Title and content are required.",
      });
    }

    await Announcement.create({
      title: title.trim(),
      content: content.trim(),
      targetAudience: audience,
      targetType: audience,
      targetCourse: audience === "course" ? targetCourse || null : null,
      targetBatch: audience === "batch" ? targetBatch || null : null,
      targetStudent: audience === "student" ? targetStudent || null : null,
      status: status || "draft",
      createdBy: req.session.admin?.id || null,
    });

    console.log(`📢 New announcement created: ${title}`);
    req.session.flash = { success: `Announcement "${title}" created.` };
    res.redirect("/admin/announcements");
  } catch (error) {
    console.error("❌ Error adding announcement:", error);
    req.session.flash = { error: "Failed to create announcement." };
    res.redirect("/admin/announcements/new");
  }
};

/**
 * GET /admin/announcements/:id/edit
 */
export const getEditAnnouncement = async (req, res) => {
  try {
    const [announcement, courses, batches, students] = await Promise.all([
      Announcement.findById(req.params.id).lean(),
      Course.find({ status: "active" }).sort({ title: 1 }).lean(),
      Batch.find({ status: { $in: ["active", "upcoming"] } }).sort({ batchName: 1 }).lean(),
      Student.find({ status: "active" }).sort({ name: 1 }).lean(),
    ]);

    if (!announcement) {
      req.session.flash = { error: "Announcement not found." };
      return res.redirect("/admin/announcements");
    }

    const safeAnnouncement = {
      ...announcement,
      title: announcement.title || "Untitled Announcement",
      content: announcement.content || "",
      targetAudience: announcement.targetAudience || announcement.targetType || "all",
      targetType: announcement.targetType || announcement.targetAudience || "all",
      status: announcement.status || "draft",
      createdAt: announcement.createdAt || new Date(),
      updatedAt: announcement.updatedAt || new Date(),
    };

    res.render("admin/announcements/edit", {
      admin: req.session.admin,
      announcement: safeAnnouncement,
      courses: courses || [],
      batches: batches || [],
      students: students || [],
      activePage: "Announcements",
      error: null,
    });
  } catch (error) {
    console.error("❌ Error loading edit announcement:", error);
    req.session.flash = { error: "Failed to load announcement." };
    res.redirect("/admin/announcements");
  }
};

/**
 * POST /admin/announcements/:id
 */
export const postEditAnnouncement = async (req, res) => {
  try {
    const { title, content, targetAudience, targetType, targetCourse, targetBatch, targetStudent, status } = req.body;
    const audience = targetAudience || targetType || "all";

    await Announcement.findByIdAndUpdate(req.params.id, {
      title: title?.trim() || "Untitled Announcement",
      content: content?.trim() || "",
      targetAudience: audience,
      targetType: audience,
      targetCourse: audience === "course" ? targetCourse || null : null,
      targetBatch: audience === "batch" ? targetBatch || null : null,
      targetStudent: audience === "student" ? targetStudent || null : null,
      status: status || "draft",
    });

    console.log(`📢 Announcement updated: ${title}`);
    req.session.flash = { success: `Announcement "${title}" updated.` };
    res.redirect("/admin/announcements");
  } catch (error) {
    console.error("❌ Error updating announcement:", error);
    req.session.flash = { error: "Failed to update announcement." };
    res.redirect(`/admin/announcements/${req.params.id}/edit`);
  }
};

/**
 * POST /admin/announcements/:id/delete
 */
export const deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (announcement) {
      console.log(`🗑️ Announcement deleted: ${announcement.title}`);
      req.session.flash = { success: `Announcement "${announcement.title}" deleted.` };
    } else {
      req.session.flash = { error: "Announcement not found." };
    }
    res.redirect("/admin/announcements");
  } catch (error) {
    console.error("❌ Error deleting announcement:", error);
    req.session.flash = { error: "Failed to delete announcement." };
    res.redirect("/admin/announcements");
  }
};
