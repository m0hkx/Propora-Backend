import type { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../database.js";
import { parseId, withId } from "../lib/serialize.js";

export async function getNotifications(req: Request, res: Response) {
    const database = getDatabase();
    const notifications = database.collection("notifications");

    const rows = await notifications
        .find({ userId: new ObjectId(req.session.userId) })
        .sort({ time: -1 })
        .toArray();

    res.status(200).json({ notifications: rows.map(withId) });
}

export async function markNotificationAsRead(req: Request, res: Response) {
    const database = getDatabase();
    const notifications = database.collection("notifications");

    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid notification id" });

    const result = await notifications.findOneAndUpdate(
        { _id: id, userId: new ObjectId(req.session.userId) },
        { $set: { read: true } },
        { returnDocument: "after" }
    );

    if (!result) return res.status(404).json({ message: "Notification not found" });

    res.status(200).json({ notification: withId(result) });
}

export async function markAllNotificationsAsRead(req: Request, res: Response) {
    const database = getDatabase();
    const notifications = database.collection("notifications");

    await notifications.updateMany(
        { userId: new ObjectId(req.session.userId), read: false },
        { $set: { read: true } }
    );

    res.status(200).json({ message: "All notifications marked as read" });
}
