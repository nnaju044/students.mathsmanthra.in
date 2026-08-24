import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    adminName: {
      type: String,
      default: "System",
    },
    action: {
      type: String,
      required: [true, "Action is required"],
      enum: [
        "CREATE_STUDENT", "EDIT_STUDENT", "DELETE_STUDENT",
        "CREATE_COURSE", "EDIT_COURSE", "DELETE_COURSE",
        "CREATE_BATCH", "EDIT_BATCH", "DELETE_BATCH",
        "CREATE_LESSON", "EDIT_LESSON", "DELETE_LESSON",
        "RECORD_PAYMENT", "DELETE_PAYMENT",
        "CREATE_HOMEWORK", "EDIT_HOMEWORK",
        "CREATE_ANNOUNCEMENT", "EDIT_ANNOUNCEMENT", "DELETE_ANNOUNCEMENT",
        "MARK_ATTENDANCE",
        "ADMIN_LOGIN", "ADMIN_LOGOUT",
      ],
    },
    entityType: {
      type: String,
      enum: ["Student", "Course", "Batch", "Lesson", "Payment", "Homework", "Announcement", "Attendance", "Admin"],
      default: null,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    entityName: {
      type: String,
      default: "",
    },
    oldData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    ipAddress: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Indexes for filtered queries
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ entityType: 1 });
auditLogSchema.index({ adminId: 1 });
auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;
