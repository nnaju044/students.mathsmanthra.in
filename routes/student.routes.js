import express from "express";
import { listStudents, getAddStudent, postAddStudent, getEditStudent, postEditStudent, deleteStudent } from "../controllers/student.controller.js";

const router = express.Router();

router.get("/", listStudents);
router.get("/new", getAddStudent);
router.post("/", postAddStudent);
router.get("/:id/edit", getEditStudent);
router.post("/:id", postEditStudent);
router.post("/:id/delete", deleteStudent);

export default router;
