import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Course title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    thumbnail: {
      type: String,
      default: "",
    },
    thumbnailPublicId: {
      type: String,
      default: "",
    },
    duration: {
      type: String,
      trim: true,
      default: "",
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "draft"],
      default: "active",
    },
    lessons: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lesson",
      },
    ],
  },
  { timestamps: true }
);

courseSchema.index({ title: "text", description: "text" });

const Course = mongoose.model("Course", courseSchema);

export default Course;
