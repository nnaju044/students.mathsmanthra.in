import webpush from "web-push";
import NotificationSubscription from "../models/NotificationSubscription.js";

// Configure VAPID keys — set these in .env
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:admin@mathsmanthra.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
  console.warn("⚠️ Push notifications disabled: VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY not set in .env");
}

/**
 * Send a push notification to a single subscription.
 * @param {Object} subscription - { endpoint, keys: { auth, p256dh } }
 * @param {Object} payload - { title, body, icon, url }
 */
const sendToSubscription = async (subscription, payload) => {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (err) {
    // Subscription expired or invalid — remove it
    if (err.statusCode === 410 || err.statusCode === 404) {
      await NotificationSubscription.findOneAndDelete({ endpoint: subscription.endpoint });
      console.log(`🗑️ Removed expired push subscription: ${subscription.endpoint.slice(0, 50)}...`);
    } else {
      console.error("⚠️ Push send error:", err.message);
    }
  }
};

/**
 * Send push to a specific student (all their active subscriptions).
 * @param {string} studentId
 * @param {Object} payload
 */
export const sendPushToStudent = async (studentId, payload) => {
  if (!VAPID_PUBLIC_KEY) return;
  const subs = await NotificationSubscription.find({ student: studentId, isActive: true }).lean();
  await Promise.allSettled(subs.map((s) => sendToSubscription(s, payload)));
};

/**
 * Send push to all students in a batch.
 * @param {string} batchId
 * @param {Object} payload
 */
export const sendPushToBatch = async (batchId, payload) => {
  if (!VAPID_PUBLIC_KEY) return;
  // Find students in this batch
  const Student = (await import("../models/Student.js")).default;
  const students = await Student.find({ batch: batchId }).select("_id").lean();
  const studentIds = students.map((s) => s._id);
  const subs = await NotificationSubscription.find({ student: { $in: studentIds }, isActive: true }).lean();
  await Promise.allSettled(subs.map((s) => sendToSubscription(s, payload)));
};

/**
 * Send push to all subscribed students.
 * @param {Object} payload
 */
export const sendPushToAll = async (payload) => {
  if (!VAPID_PUBLIC_KEY) return;
  const subs = await NotificationSubscription.find({ isActive: true }).lean();
  await Promise.allSettled(subs.map((s) => sendToSubscription(s, payload)));
};

/**
 * Get VAPID public key for client SW registration.
 */
export const getVapidPublicKey = () => VAPID_PUBLIC_KEY;
