import type { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../database.js";
import { parseId, withId } from "../lib/serialize.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function getProperties(req: Request, res: Response) {
    const database = getDatabase();
    const properties = database.collection("properties");

    const requestedLimit = Math.floor(Number(req.query.limit));
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, MAX_PAGE_SIZE)
        : DEFAULT_PAGE_SIZE;
    const requestedPage = Math.floor(Number(req.query.page));
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

    const filter = { userId: new ObjectId(req.session.userId) };

    const [total, rows] = await Promise.all([
        properties.countDocuments(filter),
        properties.find(filter).sort({ _id: 1 }).skip((page - 1) * limit).limit(limit).toArray(),
    ]);

    res.status(200).json({
        properties: rows.map(withId),
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    });
}

export async function insertProperties(req: Request, res: Response) {
    const database = getDatabase();
    const properties = database.collection("properties");

    const createdAt = new Date();

    const property = {
        name: req.body.name,
        userId: new ObjectId(req.session.userId),
        type: req.body.type,
        status: req.body.status,
        description: req.body.description,
        address: req.body.address,
        city: req.body.city,
        country: req.body.country,
        postal: req.body.postal,
        totalUnits: Number(req.body.totalUnits) || 0,
        yearBuilt: req.body.yearBuilt ? Number(req.body.yearBuilt) : undefined,
        floors: req.body.floors ? Number(req.body.floors) : undefined,
        size: req.body.size ? Number(req.body.size) : undefined,
        baseRent: Number(req.body.baseRent) || 0,
        buyPrice: req.body.buyPrice ? Number(req.body.buyPrice) : undefined,
        expectedRevnue: req.body.expectedRevnue ? Number(req.body.expectedRevnue) : undefined,
        monthlyExpenses: req.body.monthlyExpenses ? Number(req.body.monthlyExpenses) : undefined,
        createdAt,
        updatedAt: createdAt,
        occupied: 0,
        image: req.file?.filename,
    };

    const result = await properties.insertOne(property);

    res.status(201).json({
        message: "Property created successfully",
        propertyId: result.insertedId,
        property: withId({ ...property, _id: result.insertedId }),
    });
}

export async function getProperty(req: Request, res: Response) {
    const database = getDatabase();
    const properties = database.collection("properties");

    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid property id" });

    const property = await properties.findOne({ _id: id, userId: new ObjectId(req.session.userId) });

    if (!property) return res.status(404).json({ message: "Property not found" });

    res.status(200).json({ property: withId(property) });
}

export async function updateProperty(req: Request, res: Response) {
    const database = getDatabase();
    const properties = database.collection("properties");

    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid property id" });

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    const fields = [
        "name", "type", "status", "description", "address", "city", "country", "postal",
    ] as const;
    for (const f of fields) if (req.body[f] !== undefined) patch[f] = req.body[f];

    const numericFields = ["totalUnits", "yearBuilt", "floors", "size", "baseRent", "buyPrice", "expectedRevnue", "monthlyExpenses", "occupied"] as const;
    for (const f of numericFields) if (req.body[f] !== undefined) patch[f] = Number(req.body[f]);

    if (req.file) patch.image = req.file.filename;

    const result = await properties.findOneAndUpdate(
        { _id: id, userId: new ObjectId(req.session.userId) },
        { $set: patch },
        { returnDocument: "after" }
    );

    if (!result) return res.status(404).json({ message: "Property not found" });

    res.status(200).json({ property: withId(result) });
}

export async function updatePropertyStatus(req: Request, res: Response) {
    const database = getDatabase();
    const properties = database.collection("properties");

    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid property id" });

    const result = await properties.findOneAndUpdate(
        { _id: id, userId: new ObjectId(req.session.userId) },
        { $set: { status: req.body.status, updatedAt: new Date() } },
        { returnDocument: "after" }
    );

    if (!result) return res.status(404).json({ message: "Property not found" });

    res.status(200).json({ property: withId(result) });
}

export async function deleteProperty(req: Request, res: Response) {
    const database = getDatabase();
    const properties = database.collection("properties");

    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid property id" });

    const result = await properties.deleteOne({ _id: id, userId: new ObjectId(req.session.userId) });

    if (result.deletedCount === 0) return res.status(404).json({ message: "Property not found" });

    res.status(200).json({ message: "Property deleted successfully" });
}
