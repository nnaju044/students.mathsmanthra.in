import Admin from "../models/admin.js";
import bcrypt from "bcrypt";
import {
  getDashboardStats,
  getRecentActivities,
  getMonthlyRevenue,
  getMonthlyEnrollments,
  getAttendanceAnalytics,
} from "../services/dashboardService.js";
import { getAdminHomeworkStats } from "../services/homeworkAnalytics.service.js";

/**
 * Seed default admin user from environment variables if not already present in DB
 */
export const seedAdmin = async () => {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || "admin@mathsmanthra.com").toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    let existingAdmin = await Admin.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      existingAdmin = await Admin.create({
        name: "Maths Manthra Admin",
        email: adminEmail,
        password: hashedPassword,
      });
      console.log(`👤 Admin user seeded in MongoDB: ${adminEmail}`);
    } else {
      console.log(`👤 Admin user verified in MongoDB: ${adminEmail}`);
    }
  } catch (error) {
    console.error("⚠️ Error seeding default admin:", error.message);
  }
};

/**
 * GET /admin/login - Render Admin Login Page
 */
export const getLoginPage = (req, res) => {
  const flash = req.session.flash || {};
  req.session.flash = {};
  res.render("admin/login", {
    error: flash.error || null,
    success: flash.success || null,
  });
};

/**
 * POST /admin/login - Authenticate Admin Credentials
 */
export const postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = email ? email.toLowerCase().trim() : "";

    console.log(`🔑 Admin login attempt for email: "${cleanEmail}"`);

    if (!cleanEmail || !password) {
      console.log("❌ Admin login failed: Email and password are required.");
      return res.status(400).render("admin/login", {
        error: "Please enter both email address and password.",
        success: null,
      });
    }

    const envEmail = (process.env.ADMIN_EMAIL || "admin@mathsmanthra.com").toLowerCase().trim();
    const envPassword = process.env.ADMIN_PASSWORD || "admin123";

    // Search for Admin in MongoDB
    let admin = await Admin.findOne({ email: cleanEmail });

    let isMatch = false;

    if (admin) {
      if (admin.password.startsWith("$2a$") || admin.password.startsWith("$2b$")) {
        isMatch = await bcrypt.compare(password, admin.password);
      } else {
        isMatch = password === admin.password;
      }
    } else if (cleanEmail === envEmail && password === envPassword) {
      const hashedPassword = await bcrypt.hash(envPassword, 10);
      admin = await Admin.create({
        name: "Maths Manthra Admin",
        email: envEmail,
        password: hashedPassword,
      });
      isMatch = true;
    }

    if (isMatch && admin) {
      req.session.admin = {
        id: admin._id,
        email: admin.email,
        name: admin.name || "Maths Manthra Admin",
      };

      console.log(`✅ Admin login SUCCESSFUL for: ${cleanEmail}`);

      // Save session before redirect to prevent race condition with MongoDB store
      return req.session.save((err) => {
        if (err) {
          console.error('❌ Admin session save error:', err);
          return res.status(500).render('admin/login', {
            error: 'Session error. Please try again.',
            success: null,
          });
        }
        return res.redirect('/admin/dashboard');
      });
    } else {
      console.log(`❌ Admin login FAILED: Invalid credentials for ${cleanEmail}`);
      return res.status(401).render("admin/login", {
        error: "Invalid email address or password.",
        success: null,
      });
    }
  } catch (error) {
    console.error("❌ Admin login error:", error);
    return res.status(500).render("admin/login", {
      error: "An unexpected error occurred. Please try again.",
      success: null,
    });
  }
};

/**
 * GET /admin/dashboard - Render Admin Dashboard with DYNAMIC data
 */
export const getDashboard = async (req, res) => {
  try {
    const [stats, activities, revenueChart, enrollmentChart, attendanceAnalytics, homeworkStats] = await Promise.all([
      getDashboardStats(),
      getRecentActivities(8),
      getMonthlyRevenue(),
      getMonthlyEnrollments(),
      getAttendanceAnalytics(),
      getAdminHomeworkStats(),
    ]);

    const flash = req.session.flash || {};
    req.session.flash = {};

    res.render("admin/dashboard", {
      admin: req.session.admin,
      title: "Admin Dashboard - Maths Manthra",
      stats,
      activities,
      revenueChart: JSON.stringify(revenueChart),
      enrollmentChart: JSON.stringify(enrollmentChart),
      attendanceAnalytics,
      homeworkStats,
      activePage: "Dashboard",
      success: flash.success || null,
      error: flash.error || null,
    });
  } catch (error) {
    console.error("❌ Dashboard error:", error);
    res.status(500).render("error", {
      message: "Failed to load dashboard data",
      error: { status: 500 },
    });
  }
};

/**
 * GET/POST /admin/logout - Destroy Session & Redirect
 */
export const logoutAdmin = (req, res) => {
  const adminEmail = req.session?.admin?.email || "Admin";
  req.session.destroy((err) => {
    if (err) {
      console.error("❌ Error destroying session during logout:", err);
    }
    res.clearCookie("connect.sid");
    console.log(`🚪 Admin logged out successfully: ${adminEmail}`);
    res.redirect("/admin/login");
  });
};
