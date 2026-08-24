import nodemailer from "nodemailer";

// ── Transporter Setup ──────────────────────────────────────────────────────────
let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_SECURE } = process.env;

  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
    console.warn("⚠️ Email service disabled: EMAIL_HOST, EMAIL_USER, EMAIL_PASS not configured in .env");
    return null;
  }

  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: parseInt(EMAIL_PORT) || 587,
    secure: EMAIL_SECURE === "true",
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });

  return transporter;
};

// ── Core Send Function ─────────────────────────────────────────────────────────

/**
 * Send an email. Silently skips if email is not configured.
 * @param {string} to
 * @param {string} subject
 * @param {string} html
 */
export const sendEmail = async (to, subject, html) => {
  const transport = getTransporter();
  if (!transport || !to) return;

  try {
    await transport.sendMail({
      from: `"Maths Manthra Academy" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`📧 Email sent to: ${to} — "${subject}"`);
  } catch (err) {
    console.error(`⚠️ Email send failed to ${to}:`, err.message);
    // Non-critical: log and continue
  }
};

// ── HTML Template Helper ───────────────────────────────────────────────────────
const emailWrapper = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; margin: 0; padding: 20px; color: #334155; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%); padding: 32px 40px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
    .header p { color: rgba(255,255,255,0.7); margin: 6px 0 0; font-size: 13px; }
    .body { padding: 32px 40px; }
    .body h2 { color: #1e1b4b; margin: 0 0 16px; font-size: 18px; }
    .body p { color: #64748b; line-height: 1.7; margin: 0 0 12px; font-size: 14px; }
    .detail-box { background: #f1f5f9; border-radius: 10px; padding: 16px 20px; margin: 16px 0; }
    .detail-box .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
    .detail-box .row:last-child { border-bottom: none; }
    .detail-box .label { color: #94a3b8; font-weight: 500; }
    .detail-box .value { color: #1e293b; font-weight: 600; }
    .btn { display: inline-block; background: #6366f1; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 16px 0; }
    .footer { background: #f8fafc; padding: 20px 40px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎓 Maths Manthra Academy</h1>
      <p>Premium Mathematics Education</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Maths Manthra Academy. All rights reserved.</p>
      <p>This is an automated email. Please do not reply directly.</p>
    </div>
  </div>
</body>
</html>`;

// ── Email Templates ────────────────────────────────────────────────────────────

/**
 * Welcome email when admin creates a student account.
 */
export const sendWelcomeEmail = async (student) => {
  if (!student?.email) return;
  const html = emailWrapper(`
    <h2>Welcome to Maths Manthra, ${student.name}! 🎉</h2>
    <p>Your student account has been created. Here are your login credentials:</p>
    <div class="detail-box">
      <div class="row"><span class="label">Login URL</span><span class="value">Your school's portal URL</span></div>
      <div class="row"><span class="label">Phone (Username)</span><span class="value">${student.phone}</span></div>
      <div class="row"><span class="label">Default Password</span><span class="value">${student.phone} (your phone number)</span></div>
    </div>
    <p>⚠️ <strong>Important:</strong> You will be asked to change your password on your first login.</p>
    <p>Welcome aboard, and let's achieve great things together! 🚀</p>
  `);
  await sendEmail(student.email, "Welcome to Maths Manthra Academy — Account Created", html);
};

/**
 * Password changed confirmation email.
 */
export const sendPasswordChangedEmail = async (student) => {
  if (!student?.email) return;
  const html = emailWrapper(`
    <h2>Password Changed Successfully 🔒</h2>
    <p>Hi ${student.name}, your Maths Manthra portal password has been updated successfully.</p>
    <p>If you did not make this change, please contact your administrator immediately.</p>
    <div class="detail-box">
      <div class="row"><span class="label">Date & Time</span><span class="value">${new Date().toLocaleString('en-IN')}</span></div>
    </div>
  `);
  await sendEmail(student.email, "Password Changed — Maths Manthra", html);
};

/**
 * Homework assigned notification.
 * @param {Array} students - Array of student objects with email
 * @param {Object} homework - Homework document
 */
export const sendHomeworkAssignedEmail = async (students, homework) => {
  const recipients = students.filter((s) => s?.email);
  if (!recipients.length) return;

  const html = emailWrapper(`
    <h2>New Homework Assigned 📚</h2>
    <p>A new homework assignment has been posted for you:</p>
    <div class="detail-box">
      <div class="row"><span class="label">Title</span><span class="value">${homework.title}</span></div>
      <div class="row"><span class="label">Description</span><span class="value">${homework.description || '—'}</span></div>
      <div class="row"><span class="label">Due Date</span><span class="value">${homework.dueDate ? new Date(homework.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'No deadline'}</span></div>
    </div>
    <p>Please log in to your student portal to view and submit this homework.</p>
  `);

  await Promise.allSettled(
    recipients.map((s) => sendEmail(s.email, `New Homework: ${homework.title} — Maths Manthra`, html))
  );
};

/**
 * Announcement notification.
 */
export const sendAnnouncementEmail = async (students, announcement) => {
  const recipients = students.filter((s) => s?.email);
  if (!recipients.length) return;

  const html = emailWrapper(`
    <h2>📢 New Announcement</h2>
    <h3 style="color:#6366f1;">${announcement.title}</h3>
    <div class="detail-box">
      <p style="margin:0; color:#334155;">${announcement.content || announcement.message || ''}</p>
    </div>
  `);

  await Promise.allSettled(
    recipients.map((s) => sendEmail(s.email, `Announcement: ${announcement.title} — Maths Manthra`, html))
  );
};

/**
 * Payment receipt email.
 */
export const sendPaymentReceiptEmail = async (student, payment) => {
  if (!student?.email) return;
  const html = emailWrapper(`
    <h2>Payment Receipt 🧾</h2>
    <p>Hi ${student.name}, your payment has been recorded successfully.</p>
    <div class="detail-box">
      <div class="row"><span class="label">Invoice Number</span><span class="value">${payment.invoiceNumber || '—'}</span></div>
      <div class="row"><span class="label">Amount Paid</span><span class="value">₹${(payment.amount || 0).toLocaleString('en-IN')}</span></div>
      <div class="row"><span class="label">Payment Method</span><span class="value">${(payment.paymentMethod || 'cash').replace('_', ' ').toUpperCase()}</span></div>
      <div class="row"><span class="label">Date</span><span class="value">${new Date(payment.paidDate || payment.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
      <div class="row"><span class="label">Status</span><span class="value">${(payment.status || 'completed').toUpperCase()}</span></div>
    </div>
    <p>Thank you for your payment! Keep up the great work. 🎓</p>
  `);
  await sendEmail(student.email, `Payment Receipt: ₹${payment.amount} — Maths Manthra`, html);
};

/**
 * Lesson reminder email sent to students before a class.
 */
export const sendLessonReminderEmail = async (students, lesson) => {
  const recipients = students.filter((s) => s?.email);
  if (!recipients.length) return;

  const html = emailWrapper(`
    <h2>⏰ Upcoming Class Reminder</h2>
    <p>Your class is starting soon. Don't be late!</p>
    <div class="detail-box">
      <div class="row"><span class="label">Lesson</span><span class="value">${lesson.title}</span></div>
      <div class="row"><span class="label">Date</span><span class="value">${lesson.lessonDate ? new Date(lesson.lessonDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</span></div>
      <div class="row"><span class="label">Time</span><span class="value">${lesson.lessonTime || '—'}</span></div>
      <div class="row"><span class="label">Meet Link</span><span class="value">${lesson.meetLink ? `<a href="${lesson.meetLink}">Join Google Meet</a>` : 'Will be shared soon'}</span></div>
    </div>
    ${lesson.meetLink ? `<a href="${lesson.meetLink}" class="btn">Join Class Now</a>` : ''}
  `);

  await Promise.allSettled(
    recipients.map((s) => sendEmail(s.email, `Class Reminder: ${lesson.title} — Maths Manthra`, html))
  );
};
