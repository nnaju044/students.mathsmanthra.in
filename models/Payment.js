import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student is required"],
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: 0,
    },
    status: {
      type: String,
      enum: ["completed", "pending", "failed", "overdue"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "bank_transfer", "card", "other"],
      default: "cash",
    },
    transactionId: {
      type: String,
      trim: true,
      default: "",
    },
    paidDate: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    invoiceNumber: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
