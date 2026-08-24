import express from "express";
import { listBatches, getAddBatch, postAddBatch, getEditBatch, postEditBatch, deleteBatch } from "../controllers/batch.controller.js";

const router = express.Router();

router.get("/", listBatches);
router.get("/new", getAddBatch);
router.post("/", postAddBatch);
router.get("/:id/edit", getEditBatch);
router.post("/:id", postEditBatch);
router.post("/:id/delete", deleteBatch);

export default router;
