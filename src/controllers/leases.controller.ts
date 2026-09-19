import type { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../database.js";
import { parseId, withId } from "../lib/serialize.js";

function serializeLease(doc: Record<string, unknown>) {
    return withId({
        ...doc,
        propertyId: (doc.propertyId as ObjectId).toString(),
        tenantId: (doc.tenantId as ObjectId).toString(),
        unitId: doc.unitId ? (doc.unitId as ObjectId).toString() : undefined,
    } as never);
}

export async function getLeases(req: Request, res: Response) {
    const database = getDatabase();
    const leases = database.collection("leases");

    const rows = await leases.find({ userId: new ObjectId(req.session.userId) }).toArray();

    res.status(200).json({ leases: rows.map(serializeLease) });
}

export async function insertLease(req: Request, res: Response) {
    const database = getDatabase();
    const leases = database.collection("leases");

    const lease = {
        userId: new ObjectId(req.session.userId),
        propertyId: new ObjectId(req.body.propertyId),
        tenantId: new ObjectId(req.body.tenantId),
        unitId: req.body.unitId ? new ObjectId(req.body.unitId) : undefined,
        start: req.body.start,
        end: req.body.end,
        rent: Number(req.body.rent) || 0,
        deposit: Number(req.body.deposit) || 0,
        status: "Active",
    };

    const result = await leases.insertOne(lease);

    res.status(201).json({
        message: "Lease created successfully",
        lease: serializeLease({ ...lease, _id: result.insertedId }),
    });
}

export async function getLease(req: Request, res: Response) {
    const database = getDatabase();
    const leases = database.collection("leases");

    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid lease id" });

    const lease = await leases.findOne({ _id: id, userId: new ObjectId(req.session.userId) });
    if (!lease) return res.status(404).json({ message: "Lease not found" });

    res.status(200).json({ lease: serializeLease(lease) });
}

export async function updateLease(req: Request, res: Response) {
    const database = getDatabase();
    const leases = database.collection("leases");

    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid lease id" });

    const patch: Record<string, unknown> = {};
    const fields = ["start", "end", "status"] as const;
    for (const f of fields) if (req.body[f] !== undefined) patch[f] = req.body[f];
    if (req.body.rent !== undefined) patch.rent = Number(req.body.rent);
    if (req.body.deposit !== undefined) patch.deposit = Number(req.body.deposit);
    if (req.body.propertyId !== undefined) patch.propertyId = new ObjectId(req.body.propertyId);
    if (req.body.tenantId !== undefined) patch.tenantId = new ObjectId(req.body.tenantId);
    if (req.body.unitId !== undefined) patch.unitId = req.body.unitId ? new ObjectId(req.body.unitId) : undefined;

    const result = await leases.findOneAndUpdate(
        { _id: id, userId: new ObjectId(req.session.userId) },
        { $set: patch },
        { returnDocument: "after" }
    );

    if (!result) return res.status(404).json({ message: "Lease not found" });

    res.status(200).json({ lease: serializeLease(result) });
}

export async function deleteLease(req: Request, res: Response) {
    const database = getDatabase();
    const leases = database.collection("leases");

    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid lease id" });

    const result = await leases.deleteOne({ _id: id, userId: new ObjectId(req.session.userId) });
    if (result.deletedCount === 0) return res.status(404).json({ message: "Lease not found" });

    res.status(200).json({ message: "Lease deleted successfully" });
}
