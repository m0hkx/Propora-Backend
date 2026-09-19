import type { Request, Response } from "express";
import { getDatabase } from "../database.js";
import { ObjectId } from "mongodb";

export async function getDashboard(req: Request, res: Response) {
    const database = getDatabase();

    const properties = database.collection("properties");
    const units = database.collection("units");
    const payments = database.collection("payments");

    const userId = new ObjectId(req.session.userId);

    const totalProp = await properties.countDocuments({
        userId,
    });

    const totalunits = await units.countDocuments({
        userId,
    });

    // Current month
    const now = new Date();

    const startOfMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
    );

    const startOfNextMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1
    );

    const revenueResult = await payments.aggregate([
        {
            $match: {
                userId,
                status: "Paid",
                date: {
                    $gte: startOfMonth,
                    $lt: startOfNextMonth,
                },
            },
        },
        {
            $group: {
                _id: null,
                total: {
                    $sum: "$amount",
                },
            },
        },
    ]).toArray();

    const monthlyRevenue = revenueResult[0]?.total ?? 0;

    res.status(200).json({
        totalProp,
        totalunits,
        monthlyRevenue,
    });
}