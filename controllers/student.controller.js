import bcrypt from "bcrypt";
import Student from "../models/Student.js";
import Course from "../models/Course.js";
import Batch from "../models/Batch.js";
import { deleteFile } from "../services/cloudinary.service.js";
import { logAudit } from "../middleware/auditLogger.js";

/**
 * GET /admin/students - List students with pagination, search, filter
 */
export const listStudents = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const statusFilter = req.query.status || "";
    const feeFilter = req.query.feeStatus || "";

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }
    if (statusFilter) query.status = statusFilter;
    if (feeFilter) query.feeStatus = feeFilter;

    const [students, totalCount] = await Promise.all([
      Student.find(query)
        .populate("course", "title")
        .populate("batch", "batchName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Student.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    const flash = req.session.flash || {};
    req.session.flash = {};

    res.render("admin/students/index", {
      admin: req.session.admin,
      students,
      currentPage: page,
      totalPages,
      totalCount,
      search,
      statusFilter,
      feeFilter,
      activePage: "Students",
      success: flash.success || null,
      error: flash.error || null,
    });
  } catch (error) {
    console.error("❌ Error listing students:", error);
    res.status(500).render("error", { message: "Failed to load students", error: { status: 500 } });
  }
};

/**
 * GET /admin/students/new - Render Add Student form
 */
export const getAddStudent = async (req, res) => {
  try {
    const [courses, batches] = await Promise.all([
      Course.find({ status: "active" }).sort({ title: 1 }).lean(),
      Batch.find({ status: { $in: ["active", "upcoming"] } }).sort({ batchName: 1 }).lean(),
    ]);

    res.render("admin/students/new", {
      admin: req.session.admin,
      courses,
      batches,
      activePage: "Students",
      error: null,
    });
  } catch (error) {
    console.error("❌ Error loading add student form:", error);
    res.status(500).render("error", { message: "Failed to load form", error: { status: 500 } });
  }
};

/**
 * POST /admin/students - Create new student
 */
export const postAddStudent = async (req, res) => {
  try {
    const { name, email, phone, parentName, parentPhone, course, batch, status, feeStatus } = req.body;

    if (!name || !phone) {
      const [courses, batches] = await Promise.all([
        Course.find({ status: "active" }).lean(),
        Batch.find({ status: { $in: ["active", "upcoming"] } }).lean(),
      ]);
      return res.status(400).render("admin/students/new", {
        admin: req.session.admin,
        courses,
        batches,
        activePage: "Students",
        error: "Name and phone number are required.",
      });
    }

    // Auto-create student login account — password = hashed phone number
    const initialPassword = await bcrypt.hash(phone.trim(), 10);

    const newStudent = await Student.create({
      name: name.trim(),
      email: email ? email.trim().toLowerCase() : "",
      phone: phone.trim(),
      parentName: parentName ? parentName.trim() : "",
      parentPhone: parentPhone ? parentPhone.trim() : "",
      course: course || undefined,
      batch: batch || undefined,
      status: status || "active",
      feeStatus: feeStatus || "pending",
      joinedDate: new Date(),
      password: initialPassword,
      isFirstLogin: true,
    });

    // Sync: push new student into Batch.students[] if a batch was assigned
    if (batch) {
      await Batch.findByIdAndUpdate(batch, { $addToSet: { students: newStudent._id } });
    }

    console.log(`🔑 Student account created for: ${name} (login: ${email || 'no email'})`);
    await logAudit(req, 'CREATE_STUDENT', 'Student', newStudent._id, name, null, { name, email, phone, course, batch, status, feeStatus });
    console.log(`📝 New student added: ${name}`);
    req.session.flash = { success: `Student "${name}" added successfully.` };
    res.redirect("/admin/students");
  } catch (error) {
    console.error("❌ Error adding student:", error);
    req.session.flash = { error: "Failed to add student. " + error.message };
    res.redirect("/admin/students/new");
  }
};

/**
 * GET /admin/students/:id/edit - Render Edit Student form
 */
export const getEditStudent = async (req, res) => {
  try {
    const [student, courses, batches] = await Promise.all([
      Student.findById(req.params.id).lean(),
      Course.find({ status: "active" }).sort({ title: 1 }).lean(),
      Batch.find({ status: { $in: ["active", "upcoming"] } }).sort({ batchName: 1 }).lean(),
    ]);

    if (!student) {
      req.session.flash = { error: "Student not found." };
      return res.redirect("/admin/students");
    }

    res.render("admin/students/edit", {
      admin: req.session.admin,
      student,
      courses,
      batches,
      activePage: "Students",
      error: null,
    });
  } catch (error) {
    console.error("❌ Error loading edit student:", error);
    req.session.flash = { error: "Failed to load student data." };
    res.redirect("/admin/students");
  }
};

/**
 * POST /admin/students/:id - Update student
 */
export const postEditStudent = async (req, res) => {
  try {
    const { name, email, phone, parentName, parentPhone, course, batch, status, feeStatus } = req.body;

    // Fetch existing student to detect batch change
    const existingStudent = await Student.findById(req.params.id).lean();

    const targetBatchId = batch ? batch : null;
    const targetCourseId = course ? course : null;

    await Student.findByIdAndUpdate(req.params.id, {
      name: name?.trim(),
      email: email ? email.trim().toLowerCase() : "",
      phone: phone?.trim(),
      parentName: parentName?.trim() || "",
      parentPhone: parentPhone?.trim() || "",
      course: targetCourseId,
      batch: targetBatchId,
      status: status || "active",
      feeStatus: feeStatus || "pending",
    });

    // Sync: update Batch.students[] if batch changed
    const oldBatchId = existingStudent?.batch?.toString();
    const newBatchId = batch || null;

    if (oldBatchId !== newBatchId) {
      // Remove from old batch
      if (oldBatchId) {
        await Batch.findByIdAndUpdate(oldBatchId, { $pull: { students: existingStudent._id } });
      }
      // Add to new batch
      if (newBatchId) {
        await Batch.findByIdAndUpdate(newBatchId, { $addToSet: { students: existingStudent._id } });
      }
    }

    console.log(`📝 Student updated: ${name}`);
    await logAudit(req, 'EDIT_STUDENT', 'Student', req.params.id, name, null, { name, email, phone, status, feeStatus });
    req.session.flash = { success: `Student "${name}" updated successfully.` };
    res.redirect("/admin/students");
  } catch (error) {
    console.error("❌ Error updating student:", error);
    req.session.flash = { error: "Failed to update student." };
    res.redirect(`/admin/students/${req.params.id}/edit`);
  }
};

/**
 * POST /admin/students/:id/delete - Delete student
 */
export const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (student) {
      // Sync: remove student from their batch's students[] array
      if (student.batch) {
        await Batch.findByIdAndUpdate(student.batch, { $pull: { students: student._id } });
      }
      // Cloudinary cleanup: delete profile image if exists
      if (student.profileImagePublicId) {
        await deleteFile(student.profileImagePublicId, "image");
      }
      await logAudit(req, 'DELETE_STUDENT', 'Student', student._id, student.name, { name: student.name, phone: student.phone }, null);
      console.log(`🗑️ Student deleted: ${student.name}`);
      req.session.flash = { success: `Student "${student.name}" deleted successfully.` };
    } else {
      req.session.flash = { error: "Student not found." };
    }
    res.redirect("/admin/students");
  } catch (error) {
    console.error("❌ Error deleting student:", error);
    req.session.flash = { error: "Failed to delete student." };
    res.redirect("/admin/students");
  }
};
