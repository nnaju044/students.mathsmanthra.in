import Batch from "../models/Batch.js";
import Course from "../models/Course.js";
import Student from "../models/Student.js";

/**
 * GET /admin/batches - List all batches
 */
export const listBatches = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    const query = {};
    if (search) {
      query.batchName = { $regex: search, $options: "i" };
    }

    const [batches, totalCount] = await Promise.all([
      Batch.find(query)
        .populate("course", "title")
        .populate("students", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Batch.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalCount / limit);
    const flash = req.session.flash || {};
    req.session.flash = {};

    res.render("admin/batches/index", {
      admin: req.session.admin,
      batches,
      currentPage: page,
      totalPages,
      totalCount,
      search,
      activePage: "Batches",
      success: flash.success || null,
      error: flash.error || null,
    });
  } catch (error) {
    console.error("❌ Error listing batches:", error);
    res.status(500).render("error", { message: "Failed to load batches", error: { status: 500 } });
  }
};

/**
 * GET /admin/batches/new
 */
export const getAddBatch = async (req, res) => {
  try {
    const [courses, students] = await Promise.all([
      Course.find({ status: "active" }).sort({ title: 1 }).lean(),
      Student.find({ status: "active" }).sort({ name: 1 }).lean(),
    ]);

    res.render("admin/batches/new", {
      admin: req.session.admin,
      courses,
      students,
      activePage: "Batches",
      error: null,
    });
  } catch (error) {
    console.error("❌ Error loading add batch form:", error);
    res.status(500).render("error", { message: "Failed to load form", error: { status: 500 } });
  }
};

/**
 * POST /admin/batches - Create new batch & synchronize Student documents
 */
export const postAddBatch = async (req, res) => {
  try {
    const { batchName, course, startDate, endDate, mentor, students, status } = req.body;

    if (!batchName || !course || !startDate) {
      const [courseList, studentList] = await Promise.all([
        Course.find({ status: "active" }).lean(),
        Student.find({ status: "active" }).lean(),
      ]);
      return res.status(400).render("admin/batches/new", {
        admin: req.session.admin,
        courses: courseList,
        students: studentList,
        activePage: "Batches",
        error: "Batch name, course, and start date are required.",
      });
    }

    const studentIds = Array.isArray(students) ? students : students ? [students] : [];

    console.log(`\n📦 [Batch Create Debug] Creating new Batch: "${batchName}"`);
    console.log(`   ➜ Target Student IDs (${studentIds.length}):`, studentIds);

    const newBatch = await Batch.create({
      batchName: batchName.trim(),
      course,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      mentor: mentor?.trim() || "",
      students: studentIds,
      status: status || "upcoming",
    });

    if (studentIds.length > 0) {
      const assignResult = await Student.updateMany(
        { _id: { $in: studentIds } },
        { $set: { batch: newBatch._id } }
      );
      console.log(`   ➜ Updated ${assignResult.modifiedCount} Student document(s) with batch ID: ${newBatch._id}`);
    }

    console.log(`✅ [Batch Create Debug] Batch created successfully. ID: ${newBatch._id}\n`);
    req.session.flash = { success: `Batch "${batchName}" created successfully.` };
    res.redirect("/admin/batches");
  } catch (error) {
    console.error("❌ Error adding batch:", error);
    req.session.flash = { error: "Failed to create batch." };
    res.redirect("/admin/batches/new");
  }
};

/**
 * GET /admin/batches/:id/edit
 */
export const getEditBatch = async (req, res) => {
  try {
    const [batch, courses, students] = await Promise.all([
      Batch.findById(req.params.id).lean(),
      Course.find({ status: "active" }).sort({ title: 1 }).lean(),
      Student.find({ status: "active" }).sort({ name: 1 }).lean(),
    ]);

    if (!batch) {
      req.session.flash = { error: "Batch not found." };
      return res.redirect("/admin/batches");
    }

    res.render("admin/batches/edit", {
      admin: req.session.admin,
      batch,
      courses,
      students,
      activePage: "Batches",
      error: null,
    });
  } catch (error) {
    console.error("❌ Error loading edit batch:", error);
    req.session.flash = { error: "Failed to load batch data." };
    res.redirect("/admin/batches");
  }
};

/**
 * POST /admin/batches/:id - Update batch & maintain bi-directional synchronization
 */
export const postEditBatch = async (req, res) => {
  try {
    const { batchName, course, startDate, endDate, mentor, students, status } = req.body;
    const studentIds = Array.isArray(students) ? students : students ? [students] : [];
    const batchId = req.params.id;

    console.log(`\n📦 [Batch Update Debug] Editing Batch ID: ${batchId}`);
    console.log(`   ➜ New Batch Name: "${batchName}"`);
    console.log(`   ➜ Selected Student IDs (${studentIds.length}):`, studentIds);

    // 1. Remove batch reference from students previously assigned to this batch
    const unassignResult = await Student.updateMany({ batch: batchId }, { $set: { batch: null } });
    console.log(`   ➜ Unassigned ${unassignResult.modifiedCount} student(s) previously in this batch`);

    // 2. Update Batch document
    await Batch.findByIdAndUpdate(batchId, {
      batchName: batchName?.trim(),
      course,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      mentor: mentor?.trim() || "",
      students: studentIds,
      status: status || "upcoming",
    });

    // 3. Assign batch reference to newly selected students
    if (studentIds.length > 0) {
      const assignResult = await Student.updateMany(
        { _id: { $in: studentIds } },
        { $set: { batch: batchId } }
      );
      console.log(`   ➜ Assigned ${assignResult.modifiedCount} student(s) with batch ID: ${batchId}`);
    }

    console.log(`✅ [Batch Update Debug] Synchronization completed for Batch ID: ${batchId}\n`);
    req.session.flash = { success: `Batch "${batchName}" updated successfully.` };
    res.redirect("/admin/batches");
  } catch (error) {
    console.error("❌ Error updating batch:", error);
    req.session.flash = { error: "Failed to update batch." };
    res.redirect(`/admin/batches/${req.params.id}/edit`);
  }
};

/**
 * POST /admin/batches/:id/delete - Delete batch & clean up references
 */
export const deleteBatch = async (req, res) => {
  try {
    const batchId = req.params.id;
    const batch = await Batch.findByIdAndDelete(batchId);
    if (batch) {
      // Remove batch reference from any assigned students to avoid orphan ObjectIds
      await Student.updateMany({ batch: batchId }, { $set: { batch: null } });
      console.log(`🗑️ [Batch Delete Debug] Batch "${batch.batchName}" deleted. Cleaned references in Student documents.`);
      req.session.flash = { success: `Batch "${batch.batchName}" deleted.` };
    } else {
      req.session.flash = { error: "Batch not found." };
    }
    res.redirect("/admin/batches");
  } catch (error) {
    console.error("❌ Error deleting batch:", error);
    req.session.flash = { error: "Failed to delete batch." };
    res.redirect("/admin/batches");
  }
};
