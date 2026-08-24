import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Lesson title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course is required for a lesson"],
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
    },
    lessonDate: {
      type: Date,
    },
    lessonTime: {
      type: String,
      trim: true,
      default: "",
    },
    meetLink: {
      type: String,
      trim: true,
      default: "",
    },
    pdfMaterials: [
      {
        url: { type: String },
        name: { type: String, default: "Material" },
        publicId: { type: String },
      },
    ],
    videoMaterials: [
      {
        url: { type: String },
        name: { type: String, default: "Video" },
        publicId: { type: String },
      },
    ],
    homeworkDescription: {
      type: String,
      default: "",
    },
    // Legacy fields — kept for backward compatibility
    videoUrl: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
    order: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["upcoming", "live", "completed"],
      default: "upcoming",
    },
  },
  { timestamps: true }
);

const Lesson = mongoose.model("Lesson", lessonSchema);

export default Lesson;
