import PDFDocument from "pdfkit";
import cloudinary from "../config/cloudinary.js";
import Payment from "../models/Payment.js";

/**
 * Generate a unique invoice number in the format INV-YYYYMM-NNNN
 * Counts existing invoices this month and increments.
 */
export const generateInvoiceNumber = async () => {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prefix = `INV-${yyyymm}-`;

  // Count invoices created this month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const count = await Payment.countDocuments({
    invoiceNumber: { $regex: `^${prefix}` },
    createdAt: { $gte: startOfMonth },
  });

  const seq = String(count + 1).padStart(4, "0");
  return `${prefix}${seq}`;
};

/**
 * Generate a professional invoice PDF buffer using PDFKit.
 * @param {Object} payment - Fully populated payment document
 * @returns {Buffer}
 */
export const generateInvoicePDF = (payment) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const buffers = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const colors = { primary: "#6366f1", dark: "#1e1b4b", gray: "#6b7280", light: "#f8fafc", border: "#e2e8f0" };

    // ── Header Background ──────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 120).fill(colors.primary);

    // Academy Name
    doc.font("Helvetica-Bold").fontSize(26).fillColor("#ffffff").text("Maths Manthra Academy", 50, 35);
    doc.font("Helvetica").fontSize(11).fillColor("rgba(255,255,255,0.8)").text("Premium Mathematics Education", 50, 68);

    // INVOICE label
    doc.font("Helvetica-Bold").fontSize(20).fillColor("#ffffff").text("INVOICE", doc.page.width - 160, 42);

    // ── Invoice Meta Box ───────────────────────────────────────────────────────
    doc.rect(50, 140, doc.page.width - 100, 80).fill(colors.light).stroke(colors.border);

    doc.font("Helvetica-Bold").fontSize(10).fillColor(colors.dark);
    doc.text("INVOICE NUMBER", 65, 155);
    doc.font("Helvetica").fontSize(13).fillColor(colors.primary).text(payment.invoiceNumber || "N/A", 65, 170);

    doc.font("Helvetica-Bold").fontSize(10).fillColor(colors.dark);
    doc.text("INVOICE DATE", 250, 155);
    doc.font("Helvetica").fontSize(11).fillColor(colors.dark);
    const invoiceDate = new Date(payment.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
    doc.text(invoiceDate, 250, 170);

    doc.font("Helvetica-Bold").fontSize(10).fillColor(colors.dark);
    doc.text("STATUS", 430, 155);
    const statusColor = payment.status === "completed" ? "#16a34a" : "#dc2626";
    doc.font("Helvetica-Bold").fontSize(11).fillColor(statusColor);
    doc.text(payment.status?.toUpperCase() || "PENDING", 430, 170);

    // ── Student Info ───────────────────────────────────────────────────────────
    doc.moveDown(5.5);
    doc.font("Helvetica-Bold").fontSize(11).fillColor(colors.primary).text("BILLED TO");
    doc.moveTo(50, doc.y + 3).lineTo(doc.page.width - 50, doc.y + 3).stroke(colors.border);
    doc.moveDown(0.5);

    const student = payment.student;
    doc.font("Helvetica-Bold").fontSize(13).fillColor(colors.dark).text(student?.name || "—");
    doc.font("Helvetica").fontSize(10).fillColor(colors.gray);
    if (student?.phone) doc.text(`📞 ${student.phone}`);
    if (student?.email) doc.text(`✉️  ${student.email}`);

    // ── Course/Batch Info ──────────────────────────────────────────────────────
    doc.moveDown(1.5);
    doc.font("Helvetica-Bold").fontSize(11).fillColor(colors.primary).text("COURSE DETAILS");
    doc.moveTo(50, doc.y + 3).lineTo(doc.page.width - 50, doc.y + 3).stroke(colors.border);
    doc.moveDown(0.5);

    doc.font("Helvetica").fontSize(10).fillColor(colors.gray);
    doc.text(`Course   :  ${payment.course?.title || "—"}`, { continued: false });
    doc.text(`Batch    :  ${payment.batch?.batchName || "—"}`);

    // ── Payment Details Table ──────────────────────────────────────────────────
    doc.moveDown(1.5);
    doc.font("Helvetica-Bold").fontSize(11).fillColor(colors.primary).text("PAYMENT DETAILS");
    doc.moveTo(50, doc.y + 3).lineTo(doc.page.width - 50, doc.y + 3).stroke(colors.border);
    doc.moveDown(0.5);

    const tableY = doc.y;
    const col1 = 50, col2 = 300;

    // Row helper
    const row = (label, value, y) => {
      doc.font("Helvetica-Bold").fontSize(10).fillColor(colors.gray).text(label, col1, y);
      doc.font("Helvetica").fontSize(10).fillColor(colors.dark).text(value, col2, y);
    };

    const paidDate = payment.paidDate
      ? new Date(payment.paidDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
      : "—";

    row("Amount Paid", `₹${(payment.amount || 0).toLocaleString("en-IN")}`, tableY);
    row("Payment Method", (payment.paymentMethod || "cash").replace("_", " ").toUpperCase(), tableY + 22);
    row("Transaction ID", payment.transactionId || "N/A", tableY + 44);
    row("Payment Date", paidDate, tableY + 66);

    // ── Amount Highlight Box ───────────────────────────────────────────────────
    doc.moveDown(5.5);
    doc.rect(doc.page.width - 220, doc.y - 5, 170, 50).fill(colors.primary);
    doc.font("Helvetica").fontSize(9).fillColor("#ffffff").text("TOTAL AMOUNT PAID", doc.page.width - 210, doc.y - 2);
    doc.font("Helvetica-Bold").fontSize(18).fillColor("#ffffff")
      .text(`₹${(payment.amount || 0).toLocaleString("en-IN")}`, doc.page.width - 210, doc.y + 2);

    // Notes
    if (payment.notes) {
      doc.moveDown(5);
      doc.font("Helvetica-Bold").fontSize(10).fillColor(colors.gray).text("Notes:");
      doc.font("Helvetica").fontSize(10).fillColor(colors.gray).text(payment.notes);
    }

    // ── Footer ─────────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 100;
    doc.moveTo(50, footerY).lineTo(doc.page.width - 50, footerY).stroke(colors.border);

    doc.font("Helvetica-Bold").fontSize(10).fillColor(colors.dark).text("Authorized Signatory", 50, footerY + 10);
    doc.font("Helvetica").fontSize(10).fillColor(colors.gray).text("Maths Manthra Academy", 50, footerY + 25);

    doc.font("Helvetica").fontSize(9).fillColor(colors.gray)
      .text("This is a computer-generated invoice and does not require a physical signature.", 50, footerY + 45, { align: "center" });

    doc.end();
  });
};

/**
 * Idempotent: Generates an invoice number if missing, and generates the PDF buffer in-memory.
 * @param {string} paymentId
 * @returns {Promise<{payment: Object, pdfBuffer: Buffer}>}
 */
export const getOrCreateInvoice = async (paymentId) => {
  const payment = await Payment.findById(paymentId)
    .populate("student", "name email phone")
    .populate("course", "title")
    .populate("batch", "batchName");

  if (!payment) throw new Error("Payment not found");

  // Generate invoice number if missing
  let invoiceNumber = payment.invoiceNumber;
  if (!invoiceNumber) {
    invoiceNumber = await generateInvoiceNumber();
    payment.invoiceNumber = invoiceNumber;
    await Payment.findByIdAndUpdate(paymentId, { invoiceNumber });
  }

  // Generate PDF buffer in memory
  const buffer = await generateInvoicePDF(payment);

  return { payment, pdfBuffer: buffer };
};
