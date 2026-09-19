import { Router } from "express";
import {
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead
} from "../controllers/notifications.controller.js";

const router = Router();

router.get("/", getNotifications);
router.patch("/:id/read", markNotificationAsRead);
router.patch("/read-all", markAllNotificationsAsRead);

export default router;