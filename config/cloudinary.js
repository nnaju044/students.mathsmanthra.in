import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

/**
 * Configure Cloudinary v2 using environment variables.
 * Required env vars:
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Storage Buckets ──────────────────────────────────────────────────────────

/**
 * Student profile images → mathsmanthra/students
 */
export const studentStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "mathsmanthra/students",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 400, height: 400, crop: "fill" }],
  },
});

/**
 * Course thumbnails → mathsmanthra/courses
 */
export const courseStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "mathsmanthra/courses",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 800, height: 450, crop: "fill" }],
  },
});

/**
 * Lesson PDF materials → mathsmanthra/lessons/pdfs
 */
export const lessonPdfStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "mathsmanthra/lessons/pdfs",
    allowed_formats: ["pdf", "doc", "docx", "ppt", "pptx"],
    resource_type: "raw",
  },
});

/**
 * Lesson video materials → mathsmanthra/lessons/videos
 */
export const lessonVideoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "mathsmanthra/lessons/videos",
    allowed_formats: ["mp4", "mov", "avi", "mkv", "webm"],
    resource_type: "video",
  },
});

/**
 * Homework attachment files → mathsmanthra/homework
 */
export const homeworkStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "mathsmanthra/homework",
    allowed_formats: ["pdf", "jpg", "jpeg", "png", "webp", "doc", "docx"],
    resource_type: "auto",
  },
});

/**
 * Delete a file from Cloudinary by public_id
 * @param {string} publicId
 * @param {string} resourceType - 'image' | 'video' | 'raw'
 */
export const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.error("⚠️ Cloudinary delete error:", err.message);
  }
};

export default cloudinary;
