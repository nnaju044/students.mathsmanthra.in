import AuditLog from "../models/AuditLog.js";

/**
 * GET /admin/audit-logs — Paginated audit log view with filters
 */
export const listAuditLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const { action, entityType, date } = req.query;

    const query = {};
    if (action) query.action = action;
    if (entityType) query.entityType = entityType;
    if (date) {
      const d = new Date(date);
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);
      query.createdAt = { $gte: d, $lt: nextDay };
    }

    const [logs, totalCount] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    // Unique action types for filter dropdown
    const actionTypes = AuditLog.schema.path("action").enumValues;
    const entityTypes = AuditLog.schema.path("entityType").enumValues;

    res.render("admin/audit/index", {
      admin: req.session.admin,
      activePage: "Audit",
      title: "Audit Logs — Maths Manthra",
      logs,
      currentPage: page,
      totalPages,
      totalCount,
      filters: { action, entityType, date },
      actionTypes,
      entityTypes,
    });
  } catch (error) {
    console.error("❌ Audit log list error:", error);
    res.status(500).render("error", { message: "Failed to load audit logs", error: { status: 500 } });
  }
};
