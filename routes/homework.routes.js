import express from "express";
import {
  listHomework,
  getAddHomework,
  postAddHomework,
  getEditHomework,
  postEditHomework,
  deleteHomework,
  getHomeworkReview,
  postReviewSubmission,
} from "../controllers/homework.controller.js";
import { wrapUpload, uploadHomeworkFiles } from "../middleware/upload.js";

const router = express.Router();

// ── Homework CRUD ──────────────────────────────────────────────────
router.get("/", listHomework);
router.get("/new", getAddHomework);
router.post("/", wrapUpload(uploadHomeworkFiles), postAddHomework);
router.get("/:id/edit", getEditHomework);
router.post("/:id", wrapUpload(uploadHomeworkFiles), postEditHomework);
router.post("/:id/delete", deleteHomework);

// ── Homework Review Panel ──────────────────────────────────────────
router.get("/:id/review", getHomeworkReview);
router.post("/submissions/:submissionId/review", postReviewSubmission);

export default router;
