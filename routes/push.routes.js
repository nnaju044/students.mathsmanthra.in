import express from "express";
import NotificationSubscription from "../models/NotificationSubscription.js";
import { getVapidPublicKey } from "../services/push.service.js";
import { requireStudentAuth } from "../middleware/studentAuth.js";

const router = express.Router();

/**
 * GET /push/vapid-public-key — Send public key to browser/SW
 */
router.get("/vapid-public-key", (req, res) => {
  const key = getVapidPublicKey();
  if (!key) return res.status(503).json({ error: "Push notifications not configured." });
  res.json({ key });
});

/**
 * POST /push/subscribe — Save subscription from browser
 */
router.post("/subscribe", requireStudentAuth, async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    const studentId = req.session.student?.id;

    if (!endpoint || !keys?.auth || !keys?.p256dh) {
      return res.status(400).json({ error: "Invalid subscription data." });
    }

    await NotificationSubscription.findOneAndUpdate(
      { student: studentId, endpoint },
      {
        student: studentId,
        endpoint,
        keys,
        userAgent: req.headers["user-agent"] || "",
        isActive: true,
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: "Subscribed to push notifications." });
  } catch (error) {
    console.error("❌ Push subscribe error:", error);
    res.status(500).json({ error: "Failed to save subscription." });
  }
});

/**
 * POST /push/unsubscribe — Remove subscription
 */
router.post("/unsubscribe", requireStudentAuth, async (req, res) => {
  try {
    const { endpoint } = req.body;
    const studentId = req.session.student?.id;

    await NotificationSubscription.findOneAndDelete({ student: studentId, endpoint });
    res.json({ success: true, message: "Unsubscribed from push notifications." });
  } catch (error) {
    console.error("❌ Push unsubscribe error:", error);
    res.status(500).json({ error: "Failed to remove subscription." });
  }
});

export default router;
