import { Router } from "express";
import { getNotifications, getUnreadNotificationCount, markNotificationRead, markAllNotificationsRead } from "../controllers/notificationController.js";

const router = Router();

router.get("/notifications", getNotifications);
router.get("/notifications/unread-count", getUnreadNotificationCount);
router.put("/notifications/:notification_id/read", markNotificationRead);
router.patch("/notifications/read-all", markAllNotificationsRead);

export default router;
