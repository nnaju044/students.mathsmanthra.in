import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Announcement title is required"],
      trim: true,
      default: "Untitled Announcement",
    },
    content: {
      type: String,
      required: [true, "Announcement content is required"],
      default: "",
    },
    // targetAudience: all | course | batch | student
    targetAudience: {
      type: String,
      enum: ["all", "course", "batch", "student"],
      default: "all",
    },
    // targetType kept synchronized for dual compatibility
    targetType: {
      type: String,
      enum: ["all", "course", "batch", "student"],
      default: "all",
    },
    targetCourse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
    },
    targetBatch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      default: null,
    },
    targetStudent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  { timestamps: true }
);

// Pre-save hook to synchronize targetAudience and targetType, and enforce defaults
announcementSchema.pre("save", function (next) {
  if (!this.targetAudience && this.targetType) {
    this.targetAudience = this.targetType;
  } else if (!this.targetType && this.targetAudience) {
    this.targetType = this.targetAudience;
  }
  if (!this.targetAudience) this.targetAudience = "all";
  if (!this.targetType) this.targetType = "all";
  if (!this.status) this.status = "draft";
  if (!this.title) this.title = "Untitled Announcement";
  if (!this.content) this.content = "";
  next();
});

const Announcement = mongoose.model("Announcement", announcementSchema);

export default Announcement;
