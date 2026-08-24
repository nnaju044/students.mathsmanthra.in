import Course from "../models/Course.js";
import { deleteFromCloudinary } from "../config/cloudinary.js";

/**
 * GET /admin/courses - List all courses with search
 */
export const listCourses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const statusFilter = req.query.status || "";

    const query = {};
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
    if (statusFilter) query.status = statusFilter;

    const [courses, totalCount] = await Promise.all([
      Course.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Course.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalCount / limit);
    const flash = req.session.flash || {};
    req.session.flash = {};

    res.render("admin/courses/index", {
      admin: req.session.admin,
      courses,
      currentPage: page,
      totalPages,
      totalCount,
      search,
      statusFilter,
      activePage: "Courses",
      success: flash.success || null,
      error: flash.error || null,
    });
  } catch (error) {
    console.error("❌ Error listing courses:", error);
    res.status(500).render("error", { message: "Failed to load courses", error: { status: 500 } });
  }
};

/**
 * GET /admin/courses/new
 */
export const getAddCourse = (req, res) => {
  res.render("admin/courses/new", {
    admin: req.session.admin,
    activePage: "Courses",
    error: null,
  });
};

/**
 * POST /admin/courses — with optional thumbnail upload
 */
export const postAddCourse = async (req, res) => {
  try {
    const { title, description, duration, price, status } = req.body;

    if (!title) {
      return res.status(400).render("admin/courses/new", {
        admin: req.session.admin,
        activePage: "Courses",
        error: "Course title is required.",
      });
    }

    // Handle Cloudinary thumbnail upload
    const thumbnail = req.file ? req.file.path : "";
    const thumbnailPublicId = req.file ? req.file.filename : "";

    await Course.create({
      title: title.trim(),
      description: description?.trim() || "",
      thumbnail,
      thumbnailPublicId,
      duration: duration?.trim() || "",
      price: parseFloat(price) || 0,
      status: status || "active",
    });

    console.log(`📚 New course added: ${title}`);
    req.session.flash = { success: `Course "${title}" created successfully.` };
    res.redirect("/admin/courses");
  } catch (error) {
    console.error("❌ Error adding course:", error);
    req.session.flash = { error: "Failed to add course." };
    res.redirect("/admin/courses/new");
  }
};

/**
 * GET /admin/courses/:id/edit
 */
export const getEditCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).lean();
    if (!course) {
      req.session.flash = { error: "Course not found." };
      return res.redirect("/admin/courses");
    }

    res.render("admin/courses/edit", {
      admin: req.session.admin,
      course,
      activePage: "Courses",
      error: null,
    });
  } catch (error) {
    console.error("❌ Error loading edit course:", error);
    req.session.flash = { error: "Failed to load course data." };
    res.redirect("/admin/courses");
  }
};

/**
 * POST /admin/courses/:id — with optional new thumbnail upload
 */
export const postEditCourse = async (req, res) => {
  try {
    const { title, description, duration, price, status } = req.body;
    const existing = await Course.findById(req.params.id).lean();

    let thumbnail = existing?.thumbnail || "";
    let thumbnailPublicId = existing?.thumbnailPublicId || "";

    // If a new thumbnail was uploaded, delete the old one and use the new one
    if (req.file) {
      if (thumbnailPublicId) {
        await deleteFromCloudinary(thumbnailPublicId, "image");
      }
      thumbnail = req.file.path;
      thumbnailPublicId = req.file.filename;
    }

    await Course.findByIdAndUpdate(req.params.id, {
      title: title?.trim(),
      description: description?.trim() || "",
      thumbnail,
      thumbnailPublicId,
      duration: duration?.trim() || "",
      price: parseFloat(price) || 0,
      status: status || "active",
    });

    console.log(`📚 Course updated: ${title}`);
    req.session.flash = { success: `Course "${title}" updated successfully.` };
    res.redirect("/admin/courses");
  } catch (error) {
    console.error("❌ Error updating course:", error);
    req.session.flash = { error: "Failed to update course." };
    res.redirect(`/admin/courses/${req.params.id}/edit`);
  }
};

/**
 * POST /admin/courses/:id/delete
 */
export const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (course) {
      if (course.thumbnailPublicId) {
        await deleteFromCloudinary(course.thumbnailPublicId, "image");
      }
      console.log(`🗑️ Course deleted: ${course.title}`);
      req.session.flash = { success: `Course "${course.title}" deleted.` };
    } else {
      req.session.flash = { error: "Course not found." };
    }
    res.redirect("/admin/courses");
  } catch (error) {
    console.error("❌ Error deleting course:", error);
    req.session.flash = { error: "Failed to delete course." };
    res.redirect("/admin/courses");
  }
};
