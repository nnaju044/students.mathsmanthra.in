import express from "express";
import { listAuditLogs } from "../controllers/audit.controller.js";

const router = express.Router();

router.get("/", listAuditLogs);

export default router;
