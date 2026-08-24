import express from "express";
import {
  listLessons,
  getAddLesson,
  postAddLesson,
  getEditLesson,
  postEditLesson,
  deleteLesson,
  updateLessonStatus,
} from "../controllers/lesson.controller.js";
import multer from "multer";
import { lessonPdfStorage, lessonVideoStorage } from "../config/cloudinary.js";

const router = express.Router();

// Multer for lesson: handle pdfMaterials + videoMaterials fields
const lessonUpload = multer({ storage: lessonPdfStorage }).fields([
  { name: "pdfMaterials", maxCount: 5 },
  { name: "videoMaterials", maxCount: 3 },
]);

const safeUpload = (req, res, next) => {
  lessonUpload(req, res, (err) => {
    if (err) req.uploadError = err.message;
    next();
  });
};

router.get("/", listLessons);
router.get("/new", getAddLesson);
router.post("/", safeUpload, postAddLesson);
router.get("/:id/edit", getEditLesson);
router.post("/:id", safeUpload, postEditLesson);
router.post("/:id/delete", deleteLesson);
router.post("/:id/status", updateLessonStatus);

export default router;
