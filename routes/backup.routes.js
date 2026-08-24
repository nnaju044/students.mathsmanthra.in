import express from "express";
import { createBackup, listBackups, getBackupPath, deleteBackup } from "../services/backup.service.js";

const router = express.Router();

/**
 * GET /admin/system/backups — List all backups
 */
router.get("/backups", async (req, res) => {
  try {
    const backups = listBackups();
    const flash = req.session.flash || {};
    req.session.flash = {};
    res.render("admin/system/backups", {
      admin: req.session.admin,
      activePage: "System",
      title: "System Backups — Maths Manthra",
      backups,
      success: flash.success || null,
      error: flash.error || null,
    });
  } catch (error) {
    console.error("❌ Backup list error:", error);
    res.status(500).render("error", { message: "Failed to load backups", error: { status: 500 } });
  }
});

/**
 * POST /admin/system/backups/create — Trigger a new backup
 */
router.post("/backups/create", async (req, res) => {
  try {
    const filename = await createBackup();
    req.session.flash = { success: `Backup created successfully: ${filename}` };
  } catch (error) {
    console.error("❌ Backup create error:", error);
    req.session.flash = { error: "Failed to create backup: " + error.message };
  }
  res.redirect("/admin/system/backups");
});

/**
 * GET /admin/system/backups/download/:filename — Stream backup file
 */
router.get("/backups/download/:filename", (req, res) => {
  try {
    const filepath = getBackupPath(req.params.filename);
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${req.params.filename}"`);
    res.sendFile(filepath);
  } catch (error) {
    console.error("❌ Backup download error:", error);
    req.session.flash = { error: "Backup file not found." };
    res.redirect("/admin/system/backups");
  }
});

/**
 * POST /admin/system/backups/delete/:filename — Delete a backup
 */
router.post("/backups/delete/:filename", (req, res) => {
  try {
    deleteBackup(req.params.filename);
    req.session.flash = { success: `Backup "${req.params.filename}" deleted.` };
  } catch (error) {
    req.session.flash = { error: "Failed to delete backup: " + error.message };
  }
  res.redirect("/admin/system/backups");
});

export default router;
