import type { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../database.js";
import { parseId, withId } from "../lib/serialize.js";

function serializeRequest(doc: Record<string, unknown>) {
    return withId({
        ...doc,
        propertyId: (doc.propertyId as ObjectId).toString(),
        unitIds: ((doc.unitIds as ObjectId[]) ?? []).map((id) => id.toString()),
        tenantIds: ((doc.tenantIds as ObjectId[]) ?? []).map((id) => id.toString()),
        assigneeId: doc.assigneeId ? (doc.assigneeId as ObjectId).toString() : undefined,
    } as never);
}

const today = () => new Date().toISOString().slice(0, 10);

export async function getMaintenanceRequests(req: Request, res: Response) {
    const database = getDatabase();
    const maintenance = database.collection("maintenance");

    const rows = await maintenance.find({ userId: new ObjectId(req.session.userId) }).toArray();

    res.status(200).json({ maintenance: rows.map(serializeRequest) });
}

export async function insertMaintenanceRequest(req: Request, res: Response) {
    const database = getDatabase();
    const maintenance = database.collection("maintenance");
    const staff = database.collection("staff");
    const notifications = database.collection("notifications");

    const userId = new ObjectId(req.session.userId);
    const reported = today();
    const assigneeId = req.body.assigneeId ? new ObjectId(req.body.assigneeId) : undefined;

    const history: { date: string; text: string }[] = [{ date: reported, text: "Request created" }];
    if (assigneeId) {
        const assignee = await staff.findOne({ _id: assigneeId });
        history.push({ date: reported, text: `Assigned to ${assignee?.name ?? "staff"}` });
    }

    const request = {
        userId,
        propertyId: new ObjectId(req.body.propertyId),
        scope: req.body.scope,
        unitIds: (req.body.unitIds ?? []).map((id: string) => new ObjectId(id)),
        tenantIds: (req.body.tenantIds ?? []).map((id: string) => new ObjectId(id)),
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        priority: req.body.priority,
        status: "Open",
        reported,
        scheduledDate: req.body.scheduledDate,
        assigneeId,
        estimatedCost: Number(req.body.estimatedCost) || 0,
        history,
    };

    const result = await maintenance.insertOne(request);

    await notifications.insertOne({
        userId,
        kind: "maintenance",
        title: "New maintenance request",
        detail: request.title,
        time: new Date().toISOString(),
        read: false,
        link: "Maintenance",
    });

    res.status(201).json({
        message: "Maintenance request created successfully",
        request: serializeRequest({ ...request, _id: result.insertedId }),
    });
}

export async function getMaintenanceRequest(req: Request, res: Response) {
    const database = getDatabase();
    const maintenance = database.collection("maintenance");

    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid maintenance request id" });

    const request = await maintenance.findOne({ _id: id, userId: new ObjectId(req.session.userId) });
    if (!request) return res.status(404).json({ message: "Maintenance request not found" });

    res.status(200).json({ request: serializeRequest(request) });
}

export async function updateMaintenanceRequest(req: Request, res: Response) {
    const database = getDatabase();
    const maintenance = database.collection("maintenance");

    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid maintenance request id" });

    const patch: Record<string, unknown> = {};
    const fields = ["scope", "title", "description", "category", "priority", "status", "scheduledDate", "completedDate"] as const;
    for (const f of fields) if (req.body[f] !== undefined) patch[f] = req.body[f];
    if (req.body.estimatedCost !== undefined) patch.estimatedCost = Number(req.body.estimatedCost);
    if (req.body.actualCost !== undefined) patch.actualCost = Number(req.body.actualCost);
    if (req.body.propertyId !== undefined) patch.propertyId = new ObjectId(req.body.propertyId);
    if (req.body.unitIds !== undefined) patch.unitIds = req.body.unitIds.map((v: string) => new ObjectId(v));
    if (req.body.tenantIds !== undefined) patch.tenantIds = req.body.tenantIds.map((v: string) => new ObjectId(v));

    const result = await maintenance.findOneAndUpdate(
        { _id: id, userId: new ObjectId(req.session.userId) },
        { $set: patch },
        { returnDocument: "after" }
    );

    if (!result) return res.status(404).json({ message: "Maintenance request not found" });

    res.status(200).json({ request: serializeRequest(result) });
}

export async function updateMaintenanceAssignee(req: Request, res: Response) {
    const database = getDatabase();
    const maintenance = database.collection("maintenance");
    const staff = database.collection("staff");

    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid maintenance request id" });

    const assigneeId = req.body.assigneeId ? new ObjectId(req.body.assigneeId) : undefined;
    const text = assigneeId
        ? `Reassigned to ${(await staff.findOne({ _id: assigneeId }))?.name ?? "staff"}`
        : "Unassigned";

    const result = await maintenance.findOneAndUpdate(
        { _id: id, userId: new ObjectId(req.session.userId) },
        {
            $set: { assigneeId },
            $push: { history: { date: today(), text } } as never,
        },
        { returnDocument: "after" }
    );

    if (!result) return res.status(404).json({ message: "Maintenance request not found" });

    res.status(200).json({ request: serializeRequest(result) });
}

async function setStatus(req: Request, res: Response, status: string) {
    const database = getDatabase();
    const maintenance = database.collection("maintenance");

    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid maintenance request id" });

    const existing = await maintenance.findOne({ _id: id, userId: new ObjectId(req.session.userId) });
    if (!existing) return res.status(404).json({ message: "Maintenance request not found" });

    const day = today();
    const patch: Record<string, unknown> = {
        status,
        scheduledDate: existing.scheduledDate ?? (status !== "Open" ? day : undefined),
    };
    if (status === "Completed") {
        patch.completedDate = day;
        patch.actualCost = existing.actualCost ?? existing.estimatedCost;
    }

    const result = await maintenance.findOneAndUpdate(
        { _id: id, userId: new ObjectId(req.session.userId) },
        {
            $set: patch,
            $push: { history: { date: day, text: `Status changed to ${status}` } } as never,
        },
        { returnDocument: "after" }
    );

    res.status(200).json({ request: serializeRequest(result!) });
}

export function updateMaintenanceStatus(req: Request, res: Response) {
    return setStatus(req, res, req.body.status);
}

export function pauseMaintenanceRequest(req: Request, res: Response) {
    return setStatus(req, res, "Paused");
}

export function resumeMaintenanceRequest(req: Request, res: Response) {
    return setStatus(req, res, "In Progress");
}

export function completeMaintenanceRequest(req: Request, res: Response) {
    return setStatus(req, res, "Completed");
}

export async function deleteMaintenanceRequest(req: Request, res: Response) {
    const database = getDatabase();
    const maintenance = database.collection("maintenance");

    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid maintenance request id" });

    const result = await maintenance.deleteOne({ _id: id, userId: new ObjectId(req.session.userId) });
    if (result.deletedCount === 0) return res.status(404).json({ message: "Maintenance request not found" });

    res.status(200).json({ message: "Maintenance request deleted successfully" });
}
