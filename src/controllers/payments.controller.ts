import type { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../database.js";
import { parseId, withId } from "../lib/serialize.js";

function serializePayment(doc: Record<string, unknown>) {
    return withId({
        ...doc,
        tenantId: (doc.tenantId as ObjectId).toString(),
        propertyId: (doc.propertyId as ObjectId).toString(),
        date: (doc.date as Date).toISOString().slice(0, 10),
    } as never);
}

export async function getPayments(req: Request, res: Response) {
    const database = getDatabase();
    const payments = database.collection("payments");

    const rows = await payments.find({ userId: new ObjectId(req.session.userId) }).toArray();

    res.status(200).json({ payments: rows.map(serializePayment) });
}

export async function insertPayment(req: Request, res: Response) {
    const database = getDatabase();
    const payments = database.collection("payments");

    const payment = {
        userId: new ObjectId(req.session.userId),
        tenantId: new ObjectId(req.body.tenantId),
        propertyId: new ObjectId(req.body.propertyId),
        amount: Number(req.body.amount) || 0,
        date: new Date(req.body.date),
        method: req.body.method,
        status: req.body.status,
        leaseId: req.body.leaseId,
        period: req.body.period,
    };

    const result = await payments.insertOne(payment);

    res.status(201).json({
        message: "Payment created successfully",
        payment: serializePayment({ ...payment, _id: result.insertedId }),
    });
}

export async function getPayment(req: Request, res: Response) {
    const database = getDatabase();
    const payments = database.collection("payments");

    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid payment id" });

    const payment = await payments.findOne({ _id: id, userId: new ObjectId(req.session.userId) });
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    res.status(200).json({ payment: serializePayment(payment) });
}

export async function updatePayment(req: Request, res: Response) {
    const database = getDatabase();
    const payments = database.collection("payments");
    const notifications = database.collection("notifications");

    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid payment id" });

    const userId = new ObjectId(req.session.userId);

    const patch: Record<string, unknown> = {};
    if (req.body.method !== undefined) patch.method = req.body.method;
    if (req.body.status !== undefined) patch.status = req.body.status;
    if (req.body.amount !== undefined) patch.amount = Number(req.body.amount);
    if (req.body.date !== undefined) patch.date = new Date(req.body.date);
    if (req.body.tenantId !== undefined) patch.tenantId = new ObjectId(req.body.tenantId);
    if (req.body.propertyId !== undefined) patch.propertyId = new ObjectId(req.body.propertyId);

    const result = await payments.findOneAndUpdate(
        { _id: id, userId },
        { $set: patch },
        { returnDocument: "after" }
    );

    if (!result) return res.status(404).json({ message: "Payment not found" });

    if (patch.status === "Overdue") {
        await notifications.insertOne({
            userId,
            kind: "payment",
            title: "Overdue payment",
            detail: `Payment ${result._id.toString()} · $${(result.amount as number).toLocaleString("en-US")} is overdue`,
            time: new Date().toISOString(),
            read: false,
            link: "Payments",
        });
    }

    res.status(200).json({ payment: serializePayment(result) });
}

export async function deletePayment(req: Request, res: Response) {
    const database = getDatabase();
    const payments = database.collection("payments");

    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid payment id" });

    const result = await payments.deleteOne({ _id: id, userId: new ObjectId(req.session.userId) });
    if (result.deletedCount === 0) return res.status(404).json({ message: "Payment not found" });

    res.status(200).json({ message: "Payment deleted successfully" });
}
