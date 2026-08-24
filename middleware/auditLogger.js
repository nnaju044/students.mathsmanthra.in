import AuditLog from "../models/AuditLog.js";

/**
 * Log an admin action to the AuditLog collection.
 * Non-blocking — errors are caught and logged but don't interrupt the request.
 *
 * @param {Object} req - Express request (for session admin + IP)
 * @param {string} action - One of the AuditLog.action enum values
 * @param {string} entityType - e.g., "Student", "Course"
 * @param {string|null} entityId - MongoDB ObjectId as string
 * @param {string} entityName - Human-readable name for the entity
 * @param {Object|null} oldData - Previous state (for edits/deletes)
 * @param {Object|null} newData - New state (for creates/edits)
 */
export const logAudit = async (req, action, entityType, entityId = null, entityName = "", oldData = null, newData = null) => {
  try {
    const admin = req.session?.admin;
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
      req.socket?.remoteAddress ||
      req.ip ||
      "";

    await AuditLog.create({
      adminId: admin?.id || null,
      adminName: admin?.name || "System",
      action,
      entityType,
      entityId: entityId || null,
      entityName,
      oldData,
      newData,
      ipAddress: ip,
    });
  } catch (err) {
    console.error("⚠️ Audit log failed (non-critical):", err.message);
  }
};
