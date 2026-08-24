import express from "express";
import {
  listPayments,
  getAddPayment,
  postAddPayment,
  deletePayment,
  downloadInvoice,
} from "../controllers/payment.controller.js";

const router = express.Router();

router.get("/", listPayments);
router.get("/new", getAddPayment);
router.post("/", postAddPayment);
router.get("/:id/invoice", downloadInvoice);
router.post("/:id/delete", deletePayment);

export default router;
