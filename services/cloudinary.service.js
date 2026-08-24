import cloudinary from "../config/cloudinary.js";

/**
 * Delete a file from Cloudinary by its public ID.
 * Safely handles empty/null IDs and resource type mapping.
 * @param {string} publicId
 * @param {string} resourceType - 'image' | 'video' | 'raw'
 */
export const deleteFile = async (publicId, resourceType = "image") => {
  if (!publicId || publicId.trim() === "") return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    console.log(`🗑️ Cloudinary: deleted ${resourceType}/${publicId}`);
  } catch (err) {
    console.error(`⚠️ Cloudinary delete failed for ${publicId}:`, err.message);
    // Non-critical: log and continue
  }
};

/**
 * Determine resource type from file extension or publicId path.
 * @param {string} publicId
 */
export const inferResourceType = (publicId) => {
  if (!publicId) return "image";
  const lc = publicId.toLowerCase();
  if (lc.includes("/videos/") || lc.match(/\.(mp4|mov|avi|mkv|webm)$/)) return "video";
  if (lc.includes("/pdfs/") || lc.match(/\.(pdf|doc|docx|ppt|pptx)$/) || lc.includes("/raw/")) return "raw";
  return "image";
};

/**
 * Replace an old file with a new one: deletes old if it exists.
 * Call BEFORE uploading the new file; the upload happens via multer independently.
 * @param {string} oldPublicId
 * @param {string} resourceType
 */
export const deleteOldFile = async (oldPublicId, resourceType) => {
  const rt = resourceType || inferResourceType(oldPublicId);
  await deleteFile(oldPublicId, rt);
};

/**
 * Delete multiple files (e.g. an array of lesson materials).
 * @param {Array<{publicId: string, resourceType?: string}>} files
 */
export const deleteFiles = async (files = []) => {
  await Promise.allSettled(
    files
      .filter((f) => f?.publicId || f?.public_id)
      .map((f) => {
        const pid = f.publicId || f.public_id;
        const rt = f.resourceType || inferResourceType(pid);
        return deleteFile(pid, rt);
      })
  );
};
