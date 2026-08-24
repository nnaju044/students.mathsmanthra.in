import express from "express";
import { listAnnouncements, getAddAnnouncement, postAddAnnouncement, getEditAnnouncement, postEditAnnouncement, deleteAnnouncement } from "../controllers/announcement.controller.js";

const router = express.Router();

router.get("/", listAnnouncements);
router.get("/new", getAddAnnouncement);
router.post("/", postAddAnnouncement);
router.get("/:id/edit", getEditAnnouncement);
router.post("/:id", postEditAnnouncement);
router.post("/:id/delete", deleteAnnouncement);

export default router;
