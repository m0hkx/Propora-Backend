import type { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../database.js";
import { parseId, withId } from "../lib/serialize.js";

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function serializeDocument(doc: Record<string, unknown>) {
    return withId({
        ...doc,
        propertyId: (doc.propertyId as ObjectId).toString(),
        tenantId: doc.tenantId ? (doc.tenantId as ObjectId).toString() : undefined,
    } as never);
}

export async function getDocuments(req: Request, res: Response) {
    const database = getDatabase();
    const documents = database.collection("documents");

    const rows = await documents.find({ userId: new ObjectId(req.session.userId) }).toArray();

    res.status(200).json({ documents: rows.map(serializeDocument) });
}

export async function insertDocument(req: Request, res: Response) {
    const database = getDatabase();
    const documents = database.collection("documents");
    const users = database.collection("users");

    const userId = new ObjectId(req.session.userId);
    const uploader = await users.findOne({ _id: userId });

    const document = {
        userId,
        name: req.body.name,
        propertyId: new ObjectId(req.body.propertyId),
        unit: req.body.unit,
        tenantId: req.body.tenantId ? new ObjectId(req.body.tenantId) : undefined,
        leaseId: req.body.leaseId,
        type: req.body.type,
        size: req.file ? formatBytes(req.file.size) : "0 B",
        file: req.file?.filename,
        uploadedBy: uploader?.username ?? "Unknown",
        uploadDate: new Date().toISOString().slice(0, 10),
        expirationDate: req.body.expirationDate,
        status: "Active",
        description: req.body.description ?? "",
    };

    const result = await documents.insertOne(document);

    res.status(201).json({
        message: "Document created successfully",
        document: serializeDocument({ ...document, _id: result.insertedId }),
    });
}

export async function getDocument(req: Request, res: Response) {
    const database = getDatabase();
    const documents = database.collection("documents");

    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid document id" });

    const document = await documents.findOne({ _id: id, userId: new ObjectId(req.session.userId) });
    if (!document) return res.status(404).json({ message: "Document not found" });

    res.status(200).json({ document: serializeDocument(document) });
}

export async function updateDocument(req: Request, res: Response) {
    const database = getDatabase();
    const documents = database.collection("documents");

    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid document id" });

    const patch: Record<string, unknown> = {};
    const fields = ["name", "unit", "leaseId", "type", "expirationDate", "status", "description"] as const;
    for (const f of fields) if (req.body[f] !== undefined) patch[f] = req.body[f];
    if (req.body.propertyId !== undefined) patch.propertyId = new ObjectId(req.body.propertyId);
    if (req.body.tenantId !== undefined) patch.tenantId = req.body.tenantId ? new ObjectId(req.body.tenantId) : undefined;

    const result = await documents.findOneAndUpdate(
        { _id: id, userId: new ObjectId(req.session.userId) },
        { $set: patch },
        { returnDocument: "after" }
    );

    if (!result) return res.status(404).json({ message: "Document not found" });

    res.status(200).json({ document: serializeDocument(result) });
}

export async function archiveDocument(req: Request, res: Response) {
    const database = getDatabase();
    const documents = database.collection("documents");

    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid document id" });

    const result = await documents.findOneAndUpdate(
        { _id: id, userId: new ObjectId(req.session.userId) },
        { $set: { status: "Archived" } },
        { returnDocument: "after" }
    );

    if (!result) return res.status(404).json({ message: "Document not found" });

    res.status(200).json({ document: serializeDocument(result) });
}

export async function deleteDocument(req: Request, res: Response) {
    const database = getDatabase();
    const documents = database.collection("documents");

    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid document id" });

    const result = await documents.deleteOne({ _id: id, userId: new ObjectId(req.session.userId) });
    if (result.deletedCount === 0) return res.status(404).json({ message: "Document not found" });

    res.status(200).json({ message: "Document deleted successfully" });
}
