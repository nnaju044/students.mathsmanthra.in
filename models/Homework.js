import mongoose from "mongoose";

const homeworkSchema = new mongoose.Schema(
  {
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      required: [true, "Lesson is required for homework"],
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
    },
    title: {
      type: String,
      required: [true, "Homework title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    dueDate: {
      type: Date,
    },
    attachments: [
      {
        url: { type: String },
        name: { type: String, default: "Attachment" },
        publicId: { type: String },
      },
    ],
    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
    },
  },
  { timestamps: true }
);

const Homework = mongoose.model("Homework", homeworkSchema);

export default Homework;
