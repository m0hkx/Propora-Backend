import type { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../database.js";
import { parseId, withId } from "../lib/serialize.js";

export async function getPropertyUnits(req: Request, res: Response) {
    const database = getDatabase();
    const units = database.collection("units");

    const propertyId = parseId(req.params.propertyId);
    if (!propertyId) return res.status(400).json({ message: "Invalid property id" });

    const rows = await units.find({ propertyId, userId: new ObjectId(req.session.userId) }).toArray();

    res.status(200).json({
        units: rows.map((u) => withId({ ...u, propertyId: u.propertyId.toString() })),
    });
}

export async function insertUnit(req: Request, res: Response) {
    const database = getDatabase();
    const properties = database.collection("properties");
    const units = database.collection("units");

    const propertyId = parseId(req.params.propertyId);
    if (!propertyId) return res.status(400).json({ message: "Invalid property id" });

    const userId = new ObjectId(req.session.userId);
    const property = await properties.findOne({ _id: propertyId, userId });
    if (!property) return res.status(404).json({ message: "Property not found" });

    const unit = {
        propertyId,
        userId,
        name: req.body.name,
        floor: req.body.floor !== undefined ? Number(req.body.floor) : undefined,
        type: req.body.type,
        bedrooms: Number(req.body.bedrooms) || 0,
        bathrooms: Number(req.body.bathrooms) || 0,
        size: req.body.size !== undefined ? Number(req.body.size) : undefined,
        rent: Number(req.body.rent) || 0,
        status: req.body.status,
        notes: req.body.notes,
    };

    const result = await units.insertOne(unit);

    res.status(201).json({
        message: "Unit created successfully",
        unit: withId({ ...unit, _id: result.insertedId, propertyId: propertyId.toString() }),
    });
}

export async function getUnit(req: Request, res: Response) {
    const database = getDatabase();
    const units = database.collection("units");

    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid unit id" });

    const unit = await units.findOne({ _id: id, userId: new ObjectId(req.session.userId) });
    if (!unit) return res.status(404).json({ message: "Unit not found" });

    res.status(200).json({ unit: withId({ ...unit, propertyId: unit.propertyId.toString() }) });
}

export async function updateUnit(req: Request, res: Response) {
    const database = getDatabase();
    const units = database.collection("units");

    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid unit id" });

    const patch: Record<string, unknown> = {};
    const fields = ["name", "type", "status", "notes"] as const;
    for (const f of fields) if (req.body[f] !== undefined) patch[f] = req.body[f];

    const numericFields = ["floor", "bedrooms", "bathrooms", "size", "rent"] as const;
    for (const f of numericFields) if (req.body[f] !== undefined) patch[f] = Number(req.body[f]);

    const result = await units.findOneAndUpdate(
        { _id: id, userId: new ObjectId(req.session.userId) },
        { $set: patch },
        { returnDocument: "after" }
    );

    if (!result) return res.status(404).json({ message: "Unit not found" });

    res.status(200).json({ unit: withId({ ...result, propertyId: result.propertyId.toString() }) });
}

export async function updateUnitStatus(req: Request, res: Response) {
    const database = getDatabase();
    const units = database.collection("units");

    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid unit id" });

    const result = await units.findOneAndUpdate(
        { _id: id, userId: new ObjectId(req.session.userId) },
        { $set: { status: req.body.status } },
        { returnDocument: "after" }
    );

    if (!result) return res.status(404).json({ message: "Unit not found" });

    res.status(200).json({ unit: withId({ ...result, propertyId: result.propertyId.toString() }) });
}

export async function deleteUnit(req: Request, res: Response) {
    const database = getDatabase();
    const units = database.collection("units");

    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid unit id" });

    const result = await units.deleteOne({ _id: id, userId: new ObjectId(req.session.userId) });
    if (result.deletedCount === 0) return res.status(404).json({ message: "Unit not found" });

    res.status(200).json({ message: "Unit deleted successfully" });
}
