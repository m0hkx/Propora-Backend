import type { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../database.js";
import { parseId, withId } from "../lib/serialize.js";

export async function getMaintenanceStaff(req: Request, res: Response) {
    const database = getDatabase();
    const staff = database.collection("staff");

    const rows = await staff.find({ userId: new ObjectId(req.session.userId) }).toArray();

    res.status(200).json({ staff: rows.map(withId) });
}

export async function insertMaintenanceStaff(req: Request, res: Response) {
    const database = getDatabase();
    const staff = database.collection("staff");

    const member = {
        userId: new ObjectId(req.session.userId),
        name: req.body.name,
        phone: req.body.phone ?? "",
        email: req.body.email,
        specialty: req.body.specialty,
        status: req.body.status ?? "Active",
    };

    const result = await staff.insertOne(member);

    res.status(201).json({
        message: "Staff member created successfully",
        staff: withId({ ...member, _id: result.insertedId }),
    });
}

export async function getMaintenanceStaffMember(req: Request, res: Response) {
    const database = getDatabase();
    const staff = database.collection("staff");

    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid staff id" });

    const member = await staff.findOne({ _id: id, userId: new ObjectId(req.session.userId) });
    if (!member) return res.status(404).json({ message: "Staff member not found" });

    res.status(200).json({ staff: withId(member) });
}

export async function updateMaintenanceStaff(req: Request, res: Response) {
    const database = getDatabase();
    const staff = database.collection("staff");

    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid staff id" });

    const patch: Record<string, unknown> = {};
    const fields = ["name", "phone", "email", "specialty", "status"] as const;
    for (const f of fields) if (req.body[f] !== undefined) patch[f] = req.body[f];

    const result = await staff.findOneAndUpdate(
        { _id: id, userId: new ObjectId(req.session.userId) },
        { $set: patch },
        { returnDocument: "after" }
    );

    if (!result) return res.status(404).json({ message: "Staff member not found" });

    res.status(200).json({ staff: withId(result) });
}

export async function deleteMaintenanceStaff(req: Request, res: Response) {
    const database = getDatabase();
    const staff = database.collection("staff");

    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid staff id" });

    const result = await staff.deleteOne({ _id: id, userId: new ObjectId(req.session.userId) });
    if (result.deletedCount === 0) return res.status(404).json({ message: "Staff member not found" });

    res.status(200).json({ message: "Staff member deleted successfully" });
}

export async function updateMaintenanceStaffStatus(req: Request, res: Response) {
    const database = getDatabase();
    const staff = database.collection("staff");

    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid staff id" });

    const result = await staff.findOneAndUpdate(
        { _id: id, userId: new ObjectId(req.session.userId) },
        { $set: { status: req.body.status } },
        { returnDocument: "after" }
    );

    if (!result) return res.status(404).json({ message: "Staff member not found" });

    res.status(200).json({ staff: withId(result) });
}
