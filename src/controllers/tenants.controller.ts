import type { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../database.js";
import { parseId, withId } from "../lib/serialize.js";

function serializeTenant(doc: Record<string, unknown>) {
    return withId({
        ...doc,
        propertyId: (doc.propertyId as ObjectId).toString(),
        unitId: doc.unitId ? (doc.unitId as ObjectId).toString() : undefined,
    } as never);
}

export async function getTenants(req: Request, res: Response) {
    const database = getDatabase();
    const tenants = database.collection("tenants");

    const rows = await tenants.find({ userId: new ObjectId(req.session.userId) }).toArray();

    res.status(200).json({ tenants: rows.map(serializeTenant) });
}

export async function insertTenant(req: Request, res: Response) {
    const database = getDatabase();
    const tenants = database.collection("tenants");
    const notifications = database.collection("notifications");

    const userId = new ObjectId(req.session.userId);
    const today = new Date().toISOString().slice(0, 10);

    const tenant = {
        userId,
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone === "" || req.body.phone === undefined ? "—" : req.body.phone,
        propertyId: new ObjectId(req.body.propertyId),
        unit: req.body.unit,
        unitId: req.body.unitId ? new ObjectId(req.body.unitId) : undefined,
        beds: req.body.beds,
        leaseStart: req.body.leaseStart === "" || req.body.leaseStart === undefined ? today : req.body.leaseStart,
        leaseEnd: req.body.leaseEnd,
        leaseStatus: "Active",
        rent: Number(req.body.rent) || 0,
        paymentStatus: "Paid",
        paymentDate: "—",
        status: req.body.status,
    };

    const result = await tenants.insertOne(tenant);

    await notifications.insertOne({
        userId,
        kind: "tenant",
        title: "New tenant added",
        detail: `${tenant.name} · Unit ${tenant.unit}`,
        time: new Date().toISOString(),
        read: false,
        link: "Tenants",
    });

    res.status(201).json({
        message: "Tenant created successfully",
        tenant: serializeTenant({ ...tenant, _id: result.insertedId }),
    });
}

export async function getTenant(req: Request, res: Response) {
    const database = getDatabase();
    const tenants = database.collection("tenants");

    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid tenant id" });

    const tenant = await tenants.findOne({ _id: id, userId: new ObjectId(req.session.userId) });
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });

    res.status(200).json({ tenant: serializeTenant(tenant) });
}

export async function updateTenant(req: Request, res: Response) {
    const database = getDatabase();
    const tenants = database.collection("tenants");

    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid tenant id" });

    const patch: Record<string, unknown> = {};
    const fields = ["name", "email", "phone", "unit", "beds", "leaseStart", "leaseEnd", "leaseStatus", "paymentStatus", "paymentDate", "status"] as const;
    for (const f of fields) if (req.body[f] !== undefined) patch[f] = req.body[f];
    if (req.body.rent !== undefined) patch.rent = Number(req.body.rent);
    if (req.body.propertyId !== undefined) patch.propertyId = new ObjectId(req.body.propertyId);
    if (req.body.unitId !== undefined) patch.unitId = req.body.unitId ? new ObjectId(req.body.unitId) : undefined;

    const result = await tenants.findOneAndUpdate(
        { _id: id, userId: new ObjectId(req.session.userId) },
        { $set: patch },
        { returnDocument: "after" }
    );

    if (!result) return res.status(404).json({ message: "Tenant not found" });

    res.status(200).json({ tenant: serializeTenant(result) });
}

export async function deleteTenant(req: Request, res: Response) {
    const database = getDatabase();
    const tenants = database.collection("tenants");

    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid tenant id" });

    const result = await tenants.deleteOne({ _id: id, userId: new ObjectId(req.session.userId) });
    if (result.deletedCount === 0) return res.status(404).json({ message: "Tenant not found" });

    res.status(200).json({ message: "Tenant deleted successfully" });
}
