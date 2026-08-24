import Payment from "../models/Payment.js";
import Student from "../models/Student.js";
import Course from "../models/Course.js";
import Batch from "../models/Batch.js";
import { getOrCreateInvoice } from "../services/invoice.service.js";
import { logAudit } from "../middleware/auditLogger.js";

/**
 * GET /admin/payments - List all payments with filter/search
 */
export const listPayments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const statusFilter = req.query.status || "";
    const methodFilter = req.query.method || "";

    const query = {};
    if (statusFilter) query.status = statusFilter;
    if (methodFilter) query.paymentMethod = methodFilter;

    let studentIds = null;
    if (search) {
      const matchingStudents = await Student.find({
        name: { $regex: search, $options: "i" },
      }).select("_id").lean();
      studentIds = matchingStudents.map((s) => s._id);
      query.student = { $in: studentIds };
    }

    const [payments, totalCount] = await Promise.all([
      Payment.find(query)
        .populate("student", "name phone email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalCount / limit);
    const flash = req.session.flash || {};
    req.session.flash = {};

    res.render("admin/payments/index", {
      admin: req.session.admin,
      payments,
      currentPage: page,
      totalPages,
      totalCount,
      search,
      statusFilter,
      methodFilter,
      activePage: "Payments",
      success: flash.success || null,
      error: flash.error || null,
    });
  } catch (error) {
    console.error("❌ Error listing payments:", error);
    res.status(500).render("error", { message: "Failed to load payments", error: { status: 500 } });
  }
};

/**
 * GET /admin/payments/new
 */
export const getAddPayment = async (req, res) => {
  try {
    const [students, courses, batches] = await Promise.all([
      Student.find({ status: "active" }).sort({ name: 1 }).lean(),
      Course.find({ status: "active" }).sort({ title: 1 }).lean(),
      Batch.find({ status: { $in: ["active", "upcoming"] } }).sort({ batchName: 1 }).lean(),
    ]);
    res.render("admin/payments/new", {
      admin: req.session.admin,
      students,
      courses,
      batches,
      activePage: "Payments",
      error: null,
    });
  } catch (error) {
    console.error("❌ Error loading add payment form:", error);
    res.status(500).render("error", { message: "Failed to load form", error: { status: 500 } });
  }
};

/**
 * POST /admin/payments
 */
export const postAddPayment = async (req, res) => {
  try {
    const { student, course, batch, amount, status, paymentMethod, transactionId, notes, paidDate } = req.body;

    if (!student || !amount) {
      const [students, courses, batches] = await Promise.all([
        Student.find({ status: "active" }).sort({ name: 1 }).lean(),
        Course.find({ status: "active" }).lean(),
        Batch.find().lean(),
      ]);
      return res.status(400).render("admin/payments/new", {
        admin: req.session.admin,
        students,
        courses,
        batches,
        activePage: "Payments",
        error: "Student and amount are required.",
      });
    }

    const newPayment = await Payment.create({
      student,
      course: course || undefined,
      batch: batch || undefined,
      amount: parseFloat(amount),
      status: status || "completed",
      paymentMethod: paymentMethod || "cash",
      transactionId: transactionId?.trim() || "",
      notes: notes?.trim() || "",
      paidDate: paidDate ? new Date(paidDate) : new Date(),
    });

    if (status === "completed") {
      await Student.findByIdAndUpdate(student, { feeStatus: "paid" });
    }

    // Auto-generate invoice number for completed payments
    if (newPayment.status === "completed") {
      try {
        await getOrCreateInvoice(newPayment._id);
      } catch (invoiceErr) {
        console.error("⚠️ Invoice generation failed (non-critical):", invoiceErr.message);
      }
    }

    console.log(`💰 Payment recorded: ₹${amount}`);
    await logAudit(req, 'RECORD_PAYMENT', 'Payment', newPayment._id, `₹${amount} from student`, null, { amount, status, paymentMethod });
    req.session.flash = {
      success: `Payment of ₹${amount} recorded successfully.`,
      paymentId: newPayment._id.toString(),
    };
    res.redirect("/admin/payments");
  } catch (error) {
    console.error("❌ Error recording payment:", error);
    req.session.flash = { error: "Failed to record payment." };
    res.redirect("/admin/payments/new");
  }
};

/**
 * GET /admin/payments/:id/invoice — Generate and download invoice PDF
 */
export const downloadInvoice = async (req, res) => {
  try {
    const { payment, pdfBuffer } = await getOrCreateInvoice(req.params.id);
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Invoice-${payment.invoiceNumber}.pdf`
    );
    return res.send(pdfBuffer);
  } catch (error) {
    console.error("❌ Error downloading invoice:", error);
    req.session.flash = { error: "Failed to download invoice." };
    res.redirect("/admin/payments");
  }
};

/**
 * POST /admin/payments/:id/delete
 */
export const deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (payment) {
      await logAudit(req, 'DELETE_PAYMENT', 'Payment', payment._id, `₹${payment.amount}`, { amount: payment.amount, status: payment.status }, null);
      console.log(`🗑️ Payment deleted: ₹${payment.amount}`);
      req.session.flash = { success: `Payment record deleted.` };
    } else {
      req.session.flash = { error: "Payment not found." };
    }
    res.redirect("/admin/payments");
  } catch (error) {
    console.error("❌ Error deleting payment:", error);
    req.session.flash = { error: "Failed to delete payment." };
    res.redirect("/admin/payments");
  }
};
