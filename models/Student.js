import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Student name is required"],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    parentName: {
      type: String,
      trim: true,
    },
    parentPhone: {
      type: String,
      trim: true,
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "graduated"],
      default: "active",
    },
    feeStatus: {
      type: String,
      enum: ["paid", "pending", "overdue"],
      default: "pending",
    },
    joinedDate: {
      type: Date,
      default: Date.now,
    },
    profileImage: {
      type: String,
      default: "",
    },
    profileImagePublicId: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    bio: {
      type: String,
      trim: true,
      default: "",
    },
    // Authentication fields — auto-set when admin creates student
    password: {
      type: String,
      default: "",
    },
    isFirstLogin: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Index for search
studentSchema.index({ name: "text", email: "text", phone: "text" });

const Student = mongoose.model("Student", studentSchema);

export default Student;
