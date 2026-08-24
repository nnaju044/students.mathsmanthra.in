import bcrypt from "bcrypt";
import Student from "../models/Student.js";
import Announcement from "../models/Announcement.js";
import Lesson from "../models/Lesson.js";
import Payment from "../models/Payment.js";
import Homework from "../models/Homework.js";
import HomeworkSubmission from "../models/HomeworkSubmission.js";
import Attendance from "../models/Attendance.js";
import { deleteFromCloudinary } from "../config/cloudinary.js";

// ─────────────────────────────────────────────
// Auth — Login / Logout / Change Password
// ─────────────────────────────────────────────

/**
 * GET /login — Render student login page
 */
export const getLoginPage = (req, res) => {
  const flash = req.session.flash || {};
  req.session.flash = {};
  res.render("auth/login", {
    title: "Student Login — Maths Manthra",
    error: flash.error || null,
    success: flash.success || null,
  });
};

/**
 * POST /login — Authenticate student with email + password
 */
export const postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = email ? email.toLowerCase().trim() : "";

    if (!cleanEmail || !password) {
      return res.render("auth/login", {
        title: "Student Login — Maths Manthra",
        error: "Please enter your email address and password.",
        success: null,
      });
    }

    const student = await Student.findOne({ email: cleanEmail }).lean();

    if (!student) {
      return res.render("auth/login", {
        title: "Student Login — Maths Manthra",
        error: "Invalid email address or password.",
        success: null,
      });
    }

    if (!student.password) {
      return res.render("auth/login", {
        title: "Student Login — Maths Manthra",
        error: "Your account has not been activated yet. Please contact your admin.",
        success: null,
      });
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.render("auth/login", {
        title: "Student Login — Maths Manthra",
        error: "Invalid email address or password.",
        success: null,
      });
    }

    // Set student session
    req.session.student = {
      id: student._id,
      name: student.name,
      email: student.email,
      isFirstLogin: student.isFirstLogin,
    };

    console.log(`\n🔑 [Student Login] Login SUCCESSFUL for: ${student.name} (${cleanEmail})`);
    console.log(`   ➜ Student ID: ${student._id}`);
    console.log(`   ➜ isFirstLogin: ${student.isFirstLogin}`);

    // Explicitly save session before redirect to prevent race condition
    // where browser follows redirect before MongoDB session is written
    req.session.save((err) => {
      if (err) {
        console.error('❌ Session save error:', err);
        return res.render('auth/login', {
          title: 'Student Login — Maths Manthra',
          error: 'Session error. Please try again.',
          success: null,
        });
      }
      if (student.isFirstLogin) {
        return res.redirect('/change-password');
      }
      return res.redirect('/dashboard');
    });
  } catch (error) {
    console.error("❌ Student login error:", error);
    return res.render("auth/login", {
      title: "Student Login — Maths Manthra",
      error: "An unexpected error occurred. Please try again.",
      success: null,
    });
  }
};

/**
 * GET /logout — Destroy student session
 */
export const logoutStudent = (req, res) => {
  const studentName = req.session?.student?.name || "Student";
  req.session.destroy((err) => {
    if (err) console.error("❌ Error destroying student session:", err);
    res.clearCookie("connect.sid");
    console.log(`🚪 Student logged out: ${studentName}`);
    res.redirect("/login");
  });
};

/**
 * GET /change-password — Render force password change form
 */
export const getChangePassword = (req, res) => {
  const flash = req.session.flash || {};
  req.session.flash = {};
  res.render("auth/change-password", {
    title: "Change Password — Maths Manthra",
    student: req.session.student,
    error: flash.error || null,
    success: flash.success || null,
  });
};

/**
 * POST /change-password — Validate and save new password
 */
export const postChangePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const studentId = req.session.student?.id;

    if (!currentPassword || !newPassword || !confirmPassword) {
      req.session.flash = { error: "All fields are required." };
      return res.redirect("/change-password");
    }

    if (newPassword !== confirmPassword) {
      req.session.flash = { error: "New passwords do not match." };
      return res.redirect("/change-password");
    }

    if (newPassword.length < 6) {
      req.session.flash = { error: "New password must be at least 6 characters long." };
      return res.redirect("/change-password");
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.redirect("/login");
    }

    const isMatch = await bcrypt.compare(currentPassword, student.password);
    if (!isMatch) {
      req.session.flash = { error: "Current password is incorrect." };
      return res.redirect("/change-password");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await Student.findByIdAndUpdate(studentId, {
      password: hashedPassword,
      isFirstLogin: false,
    });

    // Update session so blockIfPasswordChangeRequired clears
    req.session.student.isFirstLogin = false;

    console.log(`🔑 Student ${student.name} changed their password.`);
    req.session.flash = { success: "Password updated successfully! Welcome to Maths Manthra." };

    // Save session before redirect to persist isFirstLogin: false
    return req.session.save((err) => {
      if (err) {
        console.error('❌ Session save error after password change:', err);
        req.session.flash = { error: "Session error. Please try again." };
        return res.redirect('/change-password');
      }
      return res.redirect('/dashboard');
    });
  } catch (error) {
    console.error("❌ Change password error:", error);
    req.session.flash = { error: "Failed to update password. Please try again." };
    return res.redirect("/change-password");
  }
};

// ─────────────────────────────────────────────
// Student Portal Pages
// ─────────────────────────────────────────────

/**
 * Build announcement filter query for a student (targeting logic)
 */
const buildAnnouncementQuery = (student) => {
  const courseId = student?.course?._id || student?.course;
  const batchId = student?.batch?._id || student?.batch;
  const studentId = student?._id;

  const targetConditions = [
    { targetAudience: "all" },
    { targetType: "all" },
    { targetAudience: { $exists: false }, targetType: { $exists: false } },
  ];

  if (courseId) {
    targetConditions.push(
      { targetAudience: "course", targetCourse: courseId },
      { targetType: "course", targetCourse: courseId }
    );
  }

  if (batchId) {
    targetConditions.push(
      { targetAudience: "batch", targetBatch: batchId },
      { targetType: "batch", targetBatch: batchId }
    );
  }

  if (studentId) {
    targetConditions.push(
      { targetAudience: "student", targetStudent: studentId },
      { targetType: "student", targetStudent: studentId }
    );
  }

  return {
    $and: [
      {
        $or: [
          { status: "published" },
          { status: { $exists: false } },
        ],
      },
      { $or: targetConditions },
    ],
  };
};

/**
 * GET /dashboard — Student dashboard
 */
export const getDashboard = async (req, res) => {
  try {
    const studentId = req.session.student?.id;
    console.log(`\n🎓 [Student Dashboard Debug] Loading dashboard for Student ID: ${studentId}`);

    const rawStudent = await Student.findById(studentId).lean();
    console.log(`   ➜ Raw Student DB batch field: ${rawStudent?.batch || "NULL / Unassigned"}`);

    let student = await Student.findById(studentId)
      .populate("course", "title description duration price")
      .populate("batch", "batchName startDate endDate status mentor")
      .lean();

    if (!student) return res.redirect("/login");

    // Self-Repair Logic: If student.batch is null, check if student exists in any Batch.students array
    if (!student.batch) {
      const parentBatch = await Batch.findOne({ students: studentId }).lean();
      if (parentBatch) {
        console.log(`⚠️ [Dashboard Repair] Student ${studentId} was found in Batch "${parentBatch.batchName}" (${parentBatch._id}) but Student.batch reference was missing. Auto-repairing DB...`);
        await Student.findByIdAndUpdate(studentId, { batch: parentBatch._id });
        student.batch = parentBatch;
      }
    }

    console.log(`   ➜ Populated Student batch: ${student.batch ? JSON.stringify(student.batch) : "NULL / No batch assigned"}\n`);

    const announcementQuery = buildAnnouncementQuery(student);

    const [rawAnnouncements, lessonCount, upcomingHomework, pendingPaymentCount] = await Promise.all([
      Announcement.find(announcementQuery).sort({ createdAt: -1 }).limit(5).lean(),
      student.course
        ? Lesson.countDocuments({ course: student.course._id, batch: student.batch?._id || undefined })
        : 0,
      student.batch
        ? Homework.find({ batch: student.batch._id, status: "active" }).limit(3).lean()
        : [],
      Payment.countDocuments({ student: studentId, status: "pending" }),
    ]);

    const sanitizedAnnouncements = (rawAnnouncements || []).map((a) => ({
      ...a,
      title: a.title || "Untitled Announcement",
      content: a.content || "",
      targetAudience: a.targetAudience || a.targetType || "all",
      targetType: a.targetType || a.targetAudience || "all",
      status: a.status || "published",
      createdAt: a.createdAt || new Date(),
    }));

    const flash = req.session.flash || {};
    req.session.flash = {};

    res.render("students/dashboard", {
      title: "My Dashboard — Maths Manthra",
      student,
      announcements: sanitizedAnnouncements,
      lessonCount: lessonCount || 0,
      upcomingHomework: upcomingHomework || [],
      pendingPaymentCount: pendingPaymentCount || 0,
      activePage: "Dashboard",
      success: flash.success || null,
      error: flash.error || null,
    });
  } catch (error) {
    console.error("❌ Student dashboard error:", error);
    res.status(500).render("error", { message: "Failed to load dashboard", error: { status: 500 } });
  }
};

/**
 * GET /lessons — List lessons in the student's batch/course
 */
export const getLessons = async (req, res) => {
  try {
    const studentId = req.session.student?.id;
    const student = await Student.findById(studentId)
      .populate("course", "title description")
      .populate("batch", "batchName")
      .lean();

    if (!student) return res.redirect("/login");

    const lessonQuery = {};
    if (student.course) lessonQuery.course = student.course._id;
    if (student.batch) lessonQuery.batch = student.batch._id;

    const lessons = await Lesson.find(lessonQuery)
      .sort({ lessonDate: 1, order: 1, createdAt: 1 })
      .lean();

    res.render("students/lessons", {
      title: "My Lessons — Maths Manthra",
      student,
      lessons,
      course: student.course || null,
      activePage: "Lessons",
      error: null,
      success: null,
    });
  } catch (error) {
    console.error("❌ Student lessons error:", error);
    res.status(500).render("error", { message: "Failed to load lessons", error: { status: 500 } });
  }
};

/**
 * GET /homework — List homework assignments for student's batch/course
 */
export const getHomework = async (req, res) => {
  try {
    const studentId = req.session.student?.id;
    const student = await Student.findById(studentId).lean();

    if (!student) return res.redirect("/login");

    const hwQuery = {};
    if (student.batch) hwQuery.batch = student.batch;
    else if (student.course) hwQuery.course = student.course;

    const homework = await Homework.find(hwQuery)
      .populate("lesson", "title lessonDate status")
      .populate("course", "title")
      .populate("batch", "batchName")
      .sort({ dueDate: 1, createdAt: -1 })
      .lean();

    // Fetch this student's submissions for these homework items
    const hwIds = homework.map((h) => h._id);
    const submissions = await HomeworkSubmission.find({
      homework: { $in: hwIds },
      student: studentId,
    }).lean();

    const submissionMap = {};
    submissions.forEach((s) => { submissionMap[s.homework.toString()] = s; });
    homework.forEach((h) => { h.mySubmission = submissionMap[h._id.toString()] || null; });

    const flash = req.session.flash || {};
    req.session.flash = {};

    res.render("students/homework", {
      title: "My Homework — Maths Manthra",
      student,
      homework,
      activePage: "Homework",
      success: flash.success || null,
      error: flash.error || null,
    });
  } catch (error) {
    console.error("❌ Student homework error:", error);
    res.status(500).render("error", { message: "Failed to load homework", error: { status: 500 } });
  }
};

/**
 * GET /homework/:id/submit — View/edit submission for a single homework
 */
export const getSubmitHomework = async (req, res) => {
  try {
    const studentId = req.session.student?.id;
    const student = await Student.findById(studentId).lean();
    if (!student) return res.redirect("/login");

    const [hw, existingSubmission] = await Promise.all([
      Homework.findById(req.params.id)
        .populate("lesson", "title lessonDate")
        .populate("course", "title")
        .populate("batch", "batchName")
        .lean(),
      HomeworkSubmission.findOne({ homework: req.params.id, student: studentId }).lean(),
    ]);

    if (!hw) {
      req.session.flash = { error: "Homework not found." };
      return res.redirect("/homework");
    }

    const flash = req.session.flash || {};
    req.session.flash = {};

    res.render("students/homework-submit", {
      title: `Submit: ${hw.title} — Maths Manthra`,
      student,
      hw,
      existingSubmission,
      activePage: "Homework",
      success: flash.success || null,
      error: flash.error || null,
    });
  } catch (error) {
    console.error("❌ Student submit homework error:", error);
    res.status(500).render("error", { message: "Failed to load submission page", error: { status: 500 } });
  }
};

/**
 * POST /homework/:id/submit — Save multi-link submission
 */
export const postSubmitHomework = async (req, res) => {
  try {
    const studentId = req.session.student?.id;
    const { homeworkId } = req.params;

    // Parse links: links[0][label], links[0][url], links[1][label], links[1][url], ...
    const links = req.body.links || [];
    const submissionLinks = (Array.isArray(links) ? links : [links])
      .filter((l) => l.url && l.url.trim())
      .map((l) => ({ label: l.label?.trim() || "", url: l.url.trim() }));

    if (submissionLinks.length === 0) {
      req.session.flash = { error: "Please add at least one submission link." };
      return res.redirect(`/homework/${homeworkId}/submit`);
    }

    // Upsert submission
    await HomeworkSubmission.findOneAndUpdate(
      { homework: homeworkId, student: studentId },
      {
        homework: homeworkId,
        student: studentId,
        submissionLinks,
        submittedAt: new Date(),
        status: "pending",
      },
      { upsert: true, new: true }
    );

    console.log(`📤 Homework submitted by student: ${studentId}`);
    req.session.flash = { success: "Homework submitted successfully!" };
    res.redirect("/homework");
  } catch (error) {
    console.error("❌ Student homework submit error:", error);
    req.session.flash = { error: "Failed to submit homework. Please try again." };
    res.redirect(`/homework/${req.params.homeworkId}/submit`);
  }
};

/**
 * GET /announcements — Full announcement list for this student
 */
export const getAnnouncements = async (req, res) => {
  try {
    const studentId = req.session.student?.id;
    const student = await Student.findById(studentId).lean();
    if (!student) return res.redirect("/login");

    const announcementQuery = buildAnnouncementQuery(student);
    const rawAnnouncements = await Announcement.find(announcementQuery)
      .sort({ createdAt: -1 })
      .lean();

    const sanitizedAnnouncements = (rawAnnouncements || []).map((a) => ({
      ...a,
      title: a.title || "Untitled Announcement",
      content: a.content || "",
      targetAudience: a.targetAudience || a.targetType || "all",
      targetType: a.targetType || a.targetAudience || "all",
      status: a.status || "published",
      createdAt: a.createdAt || new Date(),
    }));

    res.render("students/announcements", {
      title: "Announcements — Maths Manthra",
      student,
      announcements: sanitizedAnnouncements,
      activePage: "Announcements",
      error: null,
      success: null,
    });
  } catch (error) {
    console.error("❌ Student announcements error:", error);
    res.status(500).render("error", { message: "Failed to load announcements", error: { status: 500 } });
  }
};

/**
 * GET /payments — Student payment history
 */
export const getPayments = async (req, res) => {
  try {
    const studentId = req.session.student?.id;
    const student = await Student.findById(studentId)
      .populate("course", "title")
      .populate("batch", "batchName")
      .lean();
    if (!student) return res.redirect("/login");

    const payments = await Payment.find({ student: studentId })
      .populate("course", "title")
      .populate("batch", "batchName")
      .sort({ paidDate: -1 })
      .lean();

    const totalPaid = payments
      .filter((p) => p.status === "completed")
      .reduce((sum, p) => sum + p.amount, 0);
    const totalPending = payments
      .filter((p) => p.status === "pending" || p.status === "overdue")
      .reduce((sum, p) => sum + p.amount, 0);

    res.render("students/payments", {
      title: "My Payments — Maths Manthra",
      student,
      payments,
      totalPaid,
      totalPending,
      activePage: "Payments",
      error: null,
      success: null,
    });
  } catch (error) {
    console.error("❌ Student payments error:", error);
    res.status(500).render("error", { message: "Failed to load payments", error: { status: 500 } });
  }
};

/**
 * GET /profile — Student profile page
 */
export const getProfile = async (req, res) => {
  try {
    const studentId = req.session.student?.id;
    const student = await Student.findById(studentId)
      .populate("course", "title")
      .populate("batch", "batchName startDate endDate status mentor")
      .lean();

    if (!student) return res.redirect("/login");

    const flash = req.session.flash || {};
    req.session.flash = {};

    res.render("students/profile", {
      title: "My Profile — Maths Manthra",
      student,
      activePage: "Profile",
      success: flash.success || null,
      error: flash.error || null,
    });
  } catch (error) {
    console.error("❌ Student profile error:", error);
    res.status(500).render("error", { message: "Failed to load profile", error: { status: 500 } });
  }
};

/**
 * POST /profile — Update student profile (phone, address, bio, profile photo)
 */
export const postUpdateProfile = async (req, res) => {
  try {
    const studentId = req.session.student?.id;
    const { phone, address, bio } = req.body;

    const existing = await Student.findById(studentId).lean();
    if (!existing) return res.redirect("/login");

    let profileImage = existing.profileImage || "";
    let profileImagePublicId = existing.profileImagePublicId || "";

    if (req.file) {
      // Delete old image from Cloudinary
      if (profileImagePublicId) {
        await deleteFromCloudinary(profileImagePublicId, "image");
      }
      profileImage = req.file.path;
      profileImagePublicId = req.file.filename;
    }

    await Student.findByIdAndUpdate(studentId, {
      phone: phone?.trim() || existing.phone,
      address: address?.trim() || "",
      bio: bio?.trim() || "",
      profileImage,
      profileImagePublicId,
    });

    // Update session name if changed
    req.session.student.name = existing.name;

    console.log(`👤 Student profile updated: ${existing.name}`);
    req.session.flash = { success: "Profile updated successfully!" };
    res.redirect("/profile");
  } catch (error) {
    console.error("❌ Student profile update error:", error);
    req.session.flash = { error: "Failed to update profile." };
    res.redirect("/profile");
  }
};
