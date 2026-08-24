import mongoose from "mongoose";

const batchSchema = new mongoose.Schema(
  {
    batchName: {
      type: String,
      required: [true, "Batch name is required"],
      trim: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course is required for a batch"],
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
    },
    mentor: {
      type: String,
      trim: true,
      default: "",
    },
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
      },
    ],
    status: {
      type: String,
      enum: ["active", "completed", "upcoming"],
      default: "upcoming",
    },
  },
  { timestamps: true }
);

const Batch = mongoose.model("Batch", batchSchema);

export default Batch;
