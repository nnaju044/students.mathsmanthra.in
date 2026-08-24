import multer from "multer";
import {
  studentStorage,
  courseStorage,
  lessonPdfStorage,
  lessonVideoStorage,
  homeworkStorage,
} from "../config/cloudinary.js";

/**
 * Factory: creates a multer upload middleware for the given Cloudinary storage.
 * @param {object} storage - CloudinaryStorage instance
 * @param {object} opts    - optional: { maxSizeMB, fields }
 */
const makeUploader = (storage, opts = {}) => {
  const maxSize = (opts.maxSizeMB || 20) * 1024 * 1024;
  return multer({
    storage,
    limits: { fileSize: maxSize },
    fileFilter: (_req, file, cb) => {
      // Accept all files that pass CloudinaryStorage format filter
      cb(null, true);
    },
  });
};

// ── Specific upload middleware instances ─────────────────────────────────────

/** Single profile image upload (field name: "profileImage") */
export const uploadStudentPhoto = makeUploader(studentStorage, { maxSizeMB: 5 }).single("profileImage");

/** Single course thumbnail upload (field name: "thumbnail") */
export const uploadCourseThumbnail = makeUploader(courseStorage, { maxSizeMB: 5 }).single("thumbnail");

/** Multiple lesson PDF uploads (field name: "pdfMaterials", max 5 files) */
export const uploadLessonPdfs = makeUploader(lessonPdfStorage, { maxSizeMB: 30 }).array("pdfMaterials", 5);

/** Multiple lesson video uploads (field name: "videoMaterials", max 3 files) */
export const uploadLessonVideos = makeUploader(lessonVideoStorage, { maxSizeMB: 200 }).array("videoMaterials", 3);

/** Multiple homework attachment uploads (field name: "attachments", max 5 files) */
export const uploadHomeworkFiles = makeUploader(homeworkStorage, { maxSizeMB: 20 }).array("attachments", 5);

/**
 * Middleware wrapper that catches multer errors and passes them gracefully.
 * Usage: wrapUpload(uploadStudentPhoto)(req, res, next)
 */
export const wrapUpload = (uploadFn) => (req, res, next) => {
  uploadFn(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      req.uploadError = `File upload error: ${err.message}`;
    } else if (err) {
      req.uploadError = `Upload failed: ${err.message}`;
    }
    next();
  });
};
