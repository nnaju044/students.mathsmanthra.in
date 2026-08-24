import express from "express";
import {
  listCourses,
  getAddCourse,
  postAddCourse,
  getEditCourse,
  postEditCourse,
  deleteCourse,
} from "../controllers/course.controller.js";
import { wrapUpload, uploadCourseThumbnail } from "../middleware/upload.js";

const router = express.Router();

router.get("/", listCourses);
router.get("/new", getAddCourse);
router.post("/", wrapUpload(uploadCourseThumbnail), postAddCourse);
router.get("/:id/edit", getEditCourse);
router.post("/:id", wrapUpload(uploadCourseThumbnail), postEditCourse);
router.post("/:id/delete", deleteCourse);

export default router;
