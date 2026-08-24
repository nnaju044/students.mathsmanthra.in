import mongoose from "mongoose";

const notificationSubscriptionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student is required"],
    },
    endpoint: {
      type: String,
      required: [true, "Endpoint is required"],
      trim: true,
    },
    keys: {
      auth: { type: String, required: true },
      p256dh: { type: String, required: true },
    },
    userAgent: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Compound index: one subscription per student per endpoint
notificationSubscriptionSchema.index({ student: 1, endpoint: 1 }, { unique: true });

const NotificationSubscription = mongoose.model("NotificationSubscription", notificationSubscriptionSchema);

export default NotificationSubscription;
