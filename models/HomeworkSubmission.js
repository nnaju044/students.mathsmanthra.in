import mongoose from "mongoose";

const homeworkSubmissionSchema = new mongoose.Schema(
  {
    homework: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Homework",
      required: [true, "Homework reference is required"],
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student reference is required"],
    },
    // Multiple submission links: Instagram, YouTube, Drive, Behance, etc.
    submissionLinks: [
      {
        label: { type: String, trim: true, default: "" },
        url: { type: String, trim: true, required: true },
      },
    ],
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    // Admin review
    status: {
      type: String,
      enum: ["pending", "review", "approved", "rejected"],
      default: "pending",
    },
    marks: {
      type: String,
      trim: true,
      default: "",
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: null,
    },
    feedback: {
      type: String,
      trim: true,
      default: "",
    },
    reviewedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// One submission per student per homework
homeworkSubmissionSchema.index({ homework: 1, student: 1 }, { unique: true });

const HomeworkSubmission = mongoose.model("HomeworkSubmission", homeworkSubmissionSchema);

export default HomeworkSubmission;
