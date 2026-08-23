# Maths Manthra LMS v1.1 — Production Upgrade

A complete, production-ready Learning Management System (LMS) built with the MERN stack (MongoDB, Express.js, EJS, Node.js). This v1.1 release is a major production upgrade adding PDF invoices, XLSX reports, security hardening, push notifications, email notifications, audit logs, database backups, and comprehensive analytics.

This application is a **Progressive Web App (PWA)** — installable on mobile and desktop with offline support.

---

## 🆕 What's New in v1.1

### ✅ Completed Upgrades
- **PDF Invoice System** — Auto-generated professional invoices per payment, stored in Cloudinary
- **Revenue XLSX Export** — 12-month revenue report with Chart.js visualizations
- **Student Growth XLSX Export** — Enrollment trend reports
- **Attendance XLSX Export** — Per-student attendance with color-coded percentage
- **Cloudinary Cleanup** — No more orphan assets; old files deleted on replace/delete
- **Attendance Analytics** — Top/low attendance students, overall % on admin dashboard
- **Homework Analytics** — Submission rate, overdue rate, top/weak performers
- **Security Hardening** — Helmet, Rate Limiting (5 login attempts/15 min), MongoSanitize, XSS-Clean
- **Push Notifications (PWA)** — Web Push API with VAPID keys, sw.js push + notificationclick handlers
- **Email Notification System** — 6 email templates (Welcome, Password Changed, Homework, Announcement, Payment Receipt, Lesson Reminder)
- **Automated Backup System** — Full JSON database backups, downloadable from Admin > System > Backups
- **Audit Log System** — Every admin action (create/edit/delete) tracked with IP, entity, old/new data
- **Dashboard Enhancements** — New KPIs: Revenue This Month, Overdue Fees, Lessons This Month, Attendance %, Homework Completion %

---

## 🌟 Key Features

### 👨‍💼 Admin Portal
- **Interactive Dashboard Analytics**: Real-time KPIs — total revenue, this month's revenue, pending/overdue fees, attendance rate, homework completion rate, lesson count
- **Student Lifecycle Management**: Full CRUD with Cloudinary cleanup on delete, audit logging on all operations
- **Course & Batch Management**: Thumbnail management with Cloudinary replace (no orphan files)
- **Advanced Lesson Management**: Schedule lessons with dates, times, Google Meet links, statuses (Upcoming / 🔴 Live / Completed), and study materials
- **Homework & Submissions System**: Assign homework, review submissions, give marks, star ratings (out of 5), and text feedback
- **Attendance Tracking**: Daily attendance (Present/Late/Absent) per batch + Analytics dashboard
- **Financial Tracking**: Log payments with receipt generation + PDF invoice auto-generation
- **PDF Invoice System**: Every completed payment auto-generates `INV-YYYYMM-NNNN` invoice, stored in Cloudinary
- **Targeted Announcements**: Target everyone, specific course, batch, or individual student
- **Reports Module** (`/admin/reports`):
  - Revenue Report (last 12 months) + XLSX export
  - Student Growth Report + XLSX export
  - Attendance Report + XLSX export
- **Audit Logs** (`/admin/audit-logs`): Filterable log of all admin actions
- **System Backups** (`/admin/system/backups`): Create/download/delete JSON database backups

### 🎓 Student Portal
- **Personalized Dashboard**: Upcoming lessons, unsubmitted homework, announcements, pending dues
- **Live Lessons Integration**: Join Google Meet from portal; access study materials post-lesson
- **Homework Submission**: Submit multiple portfolio links; view marks, ratings, and feedback
- **Payments History**: Transaction history with payment receipt emails
- **Profile Management**: Update photo, bio, address; enable/disable push notifications
- **Security**: Mandatory first-login password change (default = phone number)

### 📱 Progressive Web App (PWA)
- **Installable**: Add to home screen on iOS, Android, Chrome/Edge desktop
- **Offline Support**: Service Worker v2 with cache-first for static assets, offline fallback page
- **Push Notifications**: Web Push API — announcements, homework, live class alerts
- **App Manifest**: Full `manifest.json` with icons, theme colors, display modes

---

## 🔒 Security Features (v1.1)

| Feature | Implementation |
|---|---|
| HTTP Security Headers | `helmet` with custom CSP |
| Login Brute Force | `express-rate-limit` — 5 attempts / 15 min |
| NoSQL Injection | `express-mongo-sanitize` |
| XSS Protection | `xss-clean` on all request bodies |
| Session Security | `httpOnly: true`, `secure: true` (prod), `sameSite: strict` |
| Route Protection | `requireAdminAuth` / `requireStudentAuth` middleware |
| Upload Validation | Multer MIME-type + size limits |
| Cloudinary Cleanup | Orphan file prevention on all replace/delete ops |
| Audit Trail | Full admin action log with IP address |

---

## 🛠️ Tech Stack

### Backend
- **Node.js & Express.js 5**: Fast, scalable server (ES Modules, `async/await`)
- **MongoDB & Mongoose 9**: Flexible NoSQL with strict schema validation
- **express-session & connect-mongo**: Secure, persistent MongoDB session storage
- **bcrypt**: Password hashing (10 salt rounds)

### Frontend
- **EJS + express-ejs-layouts**: Server-side HTML with reusable layouts
- **Tailwind CSS v4**: Utility-first responsive design
- **Chart.js**: Interactive dashboard charts

### Storage & Media
- **Cloudinary**: Cloud storage for all media (profiles, thumbnails, lessons, invoices)
- **Multer + multer-storage-cloudinary**: Direct Cloudinary streaming uploads

### New in v1.1
- **PDFKit**: PDF invoice generation
- **ExcelJS**: XLSX report generation
- **Nodemailer**: Transactional email
- **web-push**: PWA push notifications (VAPID)
- **helmet**: HTTP security headers
- **express-rate-limit**: API/login rate limiting
- **express-mongo-sanitize**: NoSQL injection protection
- **xss-clean**: XSS input sanitization

---

## 🏗️ Project Structure

```
├── config/
│   ├── cloudinary.js        # Cloudinary v2 config + storage buckets
│   ├── db.js                # MongoDB connection
│   └── session.js           # Session config (MongoDB store)
│
├── controllers/
│   ├── admin.controller.js  # Dashboard, login, logout
│   ├── reports.controller.js# Revenue/Student Growth/Attendance reports
│   ├── audit.controller.js  # Audit log listing
│   ├── payment.controller.js# Payment CRUD + invoice generation
│   ├── student.controller.js# Student CRUD + Cloudinary cleanup
│   ├── course.controller.js # Course CRUD + thumbnail cleanup
│   ├── lesson.controller.js # Lesson CRUD + material cleanup
│   ├── homework.controller.js# Homework CRUD
│   ├── attendance.controller.js# Attendance marking
│   ├── announcement.controller.js# Announcements
│   └── auth.controller.js   # Student portal + profile + dashboard
│
├── middleware/
│   ├── adminAuth.js         # Admin auth guards
│   ├── studentAuth.js       # Student auth guards + first-login check
│   ├── upload.js            # Multer upload factories
│   ├── rateLimiter.js       # Login + general rate limiters (NEW)
│   └── auditLogger.js       # logAudit() helper (NEW)
│
├── models/
│   ├── Student.js           # Student schema
│   ├── Course.js            # Course schema
│   ├── Batch.js             # Batch schema
│   ├── Lesson.js            # Lesson schema
│   ├── Homework.js          # Homework schema
│   ├── HomeworkSubmission.js# Submission schema
│   ├── Payment.js           # Payment + invoiceNumber/invoiceUrl (UPDATED)
│   ├── Attendance.js        # Attendance schema
│   ├── Announcement.js      # Announcement schema
│   ├── AuditLog.js          # Admin audit trail (NEW)
│   └── NotificationSubscription.js # PWA push subscriptions (NEW)
│
├── routes/
│   ├── admin.routes.js      # All admin routes (dashboard, CRUD, reports, audit, backup)
│   ├── auth.routes.js       # Student login + portal routes (rate-limited)
│   ├── student.routes.js    # Student CRUD
│   ├── course.routes.js     # Course CRUD
│   ├── batch.routes.js      # Batch CRUD
│   ├── lesson.routes.js     # Lesson CRUD
│   ├── payment.routes.js    # Payment CRUD + invoice routes (UPDATED)
│   ├── homework.routes.js   # Homework CRUD
│   ├── attendance.routes.js # Attendance marking
│   ├── announcement.routes.js# Announcements
│   ├── reports.routes.js    # Revenue/Growth/Attendance reports (NEW)
│   ├── backup.routes.js     # System backup CRUD (NEW)
│   ├── audit.routes.js      # Audit log routes (NEW)
│   └── push.routes.js       # PWA push subscribe/unsubscribe (NEW)
│
├── services/
│   ├── dashboardService.js  # Dashboard stats + analytics (EXPANDED)
│   ├── invoice.service.js   # PDF invoice generation + Cloudinary upload (NEW)
│   ├── cloudinary.service.js# Cloudinary cleanup helpers (NEW)
│   ├── email.service.js     # Nodemailer email templates (NEW)
│   ├── push.service.js      # Web Push notifications (NEW)
│   ├── backup.service.js    # Database backup system (NEW)
│   ├── homeworkAnalytics.service.js # Homework stats + performers (NEW)
│   └── reports/
│       ├── revenueReport.service.js    # Revenue aggregation + XLSX (NEW)
│       ├── studentGrowth.service.js    # Growth aggregation + XLSX (NEW)
│       └── attendanceReport.service.js # Attendance aggregation + XLSX (NEW)
│
├── public/
│   ├── css/                 # Compiled styles
│   ├── js/                  # Client-side scripts
│   ├── icons/               # PWA icons
│   ├── manifest.json        # Web App Manifest
│   ├── offline.html         # Offline fallback page
│   └── sw.js                # Service Worker v2 + Push Notifications (UPDATED)
│
├── views/
│   ├── admin/
│   │   ├── dashboard.ejs    # Admin dashboard with new KPIs + charts
│   │   ├── payments/
│   │   │   ├── index.ejs    # Payments list with invoice links (UPDATED)
│   │   │   ├── new.ejs      # Add payment form
│   │   │   └── invoice.ejs  # Invoice detail view (NEW)
│   │   ├── reports/
│   │   │   ├── revenue.ejs       # Revenue report (NEW)
│   │   │   ├── student-growth.ejs# Student growth (NEW)
│   │   │   └── attendance.ejs    # Attendance report (NEW)
│   │   ├── system/
│   │   │   └── backups.ejs  # Database backup management (NEW)
│   │   └── audit/
│   │       └── index.ejs    # Audit log viewer (NEW)
│   ├── auth/                # Login, password reset
│   ├── layouts/             # Shared layouts
│   ├── partials/            # EJS partials
│   └── students/            # Student portal views
│
├── backups/                 # Local backup JSON files (auto-created)
├── app.js                   # Entry point + security middleware (UPDATED)
├── package.json             # Dependencies
└── .env                     # Environment variables
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [MongoDB](https://www.mongodb.com/) (local or Atlas)
- A [Cloudinary](https://cloudinary.com/) Account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd students.mathsmanthra
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables** — create `.env` in the root:
   ```env
   # Server
   PORT=8000
   NODE_ENV=development

   # Database
   MONGO_URI=mongodb://localhost:27017/mathsmanthra

   # Session
   SESSION_SECRET=your_super_secret_session_key_here

   # Admin
   ADMIN_EMAIL=admin@mathsmanthra.com
   ADMIN_PASSWORD=admin123

   # Cloudinary (required for uploads)
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret

   # Email (optional — emails silently skipped if not set)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your@gmail.com
   EMAIL_PASS=your_app_password

   # Push Notifications (optional — generate with: npx web-push generate-vapid-keys)
   VAPID_PUBLIC_KEY=your_vapid_public_key
   VAPID_PRIVATE_KEY=your_vapid_private_key
   VAPID_EMAIL=mailto:admin@mathsmanthra.com
   ```

4. **Generate VAPID Keys** (for push notifications):
   ```bash
   npx web-push generate-vapid-keys
   # Copy the output to your .env
   ```

5. **Start the Application**
   ```bash
   # Development (with Nodemon auto-reload)
   npm run dev

   # Production
   npm start
   ```

6. **Access the Portals**
   - Student Portal: `http://localhost:8000/login`
   - Admin Portal: `http://localhost:8000/admin/login`

---

## 🔒 Security Architecture

- **Helmet**: Full HTTP header suite (CSP, HSTS, X-Frame-Options, etc.)
- **Rate Limiting**: 5 login attempts per 15 minutes per IP
- **MongoDB Sanitization**: `express-mongo-sanitize` strips `$` and `.` from query inputs
- **XSS Clean**: Sanitizes all request body strings
- **Session Security**: `httpOnly: true`, `secure: true` (production), `sameSite: strict`
- **Audit Trail**: Every admin create/edit/delete logged with timestamp + IP address
- **Cloudinary Cleanup**: No orphan files — old assets always deleted before replacement

---

## 💡 Future Roadmap
- [ ] Automated scheduled backups via cron
- [ ] Push Notification center in admin (broadcast to specific batches)
- [ ] Fee reminder automation (cron-based overdue alerts)
- [ ] Student progress reports (PDF) per batch/course
- [ ] Multi-admin support with role-based permissions
- [ ] Export attendance CSV/Excel by custom date range
