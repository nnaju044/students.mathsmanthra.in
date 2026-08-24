import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Student from "../models/Student.js";
import Course from "../models/Course.js";
import Batch from "../models/Batch.js";
import Lesson from "../models/Lesson.js";
import Homework from "../models/Homework.js";
import HomeworkSubmission from "../models/HomeworkSubmission.js";
import Payment from "../models/Payment.js";
import Announcement from "../models/Announcement.js";
import Attendance from "../models/Attendance.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUPS_DIR = path.join(__dirname, "../backups");

// Ensure backups directory exists
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

/**
 * Create a full database backup JSON file.
 * @returns {string} filename of the created backup
 */
export const createBackup = async () => {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const filename = `backup-${dateStr}-${now.getTime()}.json`;
  const filepath = path.join(BACKUPS_DIR, filename);

  const [
    students,
    courses,
    batches,
    lessons,
    homeworks,
    submissions,
    payments,
    announcements,
    attendance,
  ] = await Promise.all([
    Student.find().lean(),
    Course.find().lean(),
    Batch.find().lean(),
    Lesson.find().lean(),
    Homework.find().lean(),
    HomeworkSubmission.find().lean(),
    Payment.find().lean(),
    Announcement.find().lean(),
    Attendance.find().lean(),
  ]);

  const backup = {
    meta: {
      createdAt: now.toISOString(),
      version: "1.1",
      collections: {
        students: students.length,
        courses: courses.length,
        batches: batches.length,
        lessons: lessons.length,
        homeworks: homeworks.length,
        submissions: submissions.length,
        payments: payments.length,
        announcements: announcements.length,
        attendance: attendance.length,
      },
    },
    data: {
      students,
      courses,
      batches,
      lessons,
      homeworks,
      submissions,
      payments,
      announcements,
      attendance,
    },
  };

  fs.writeFileSync(filepath, JSON.stringify(backup, null, 2), "utf-8");
  console.log(`💾 Backup created: ${filename}`);
  return filename;
};

/**
 * List all backup files sorted by newest first.
 * @returns {Array<{filename, size, createdAt}>}
 */
export const listBackups = () => {
  if (!fs.existsSync(BACKUPS_DIR)) return [];

  return fs
    .readdirSync(BACKUPS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((filename) => {
      const filepath = path.join(BACKUPS_DIR, filename);
      const stat = fs.statSync(filepath);
      return {
        filename,
        sizeBytes: stat.size,
        sizeFormatted: formatBytes(stat.size),
        createdAt: stat.mtime,
        createdAtFormatted: stat.mtime.toLocaleString("en-IN"),
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
};

/**
 * Get the full path of a backup file (for streaming download).
 * @param {string} filename
 * @returns {string}
 */
export const getBackupPath = (filename) => {
  // Security: prevent path traversal
  const safe = path.basename(filename);
  const filepath = path.join(BACKUPS_DIR, safe);
  if (!fs.existsSync(filepath)) throw new Error("Backup file not found.");
  return filepath;
};

/**
 * Delete a backup file.
 * @param {string} filename
 */
export const deleteBackup = (filename) => {
  const filepath = getBackupPath(filename);
  fs.unlinkSync(filepath);
  console.log(`🗑️ Backup deleted: ${filename}`);
};

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};
