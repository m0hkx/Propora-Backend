import { MongoBulkWriteError, ObjectId, type Db } from "mongodb";
import {
    APP_TIMEZONE,
    coverageKey,
    dayToDate,
    firstOfPeriod,
    generationPeriods,
    monthOfDay,
    overdueCutoff,
    planMonthlyPayments,
    shiftPeriod,
    zonedToday,
} from "../lib/paymentAutomation.js";
import type { LeaseInput, PlannedPayment } from "../lib/paymentAutomation.js";

export const AUTOMATION_SOURCE = "automation";

const DUPLICATE_KEY = 11000;

export interface PaymentAutomationReport {
    ranAt: string;
    periods: string[];
    created: number;
    duplicatesSkipped: number;
    ineligibleSkipped: number;
    markedOverdue: number;
    errors: string[];
}

export async function ensurePaymentIndexes(db: Db) {
    await db.collection("payments").createIndex(
        { leaseId: 1, period: 1 },
        {
            unique: true,
            partialFilterExpression: { source: AUTOMATION_SOURCE },
            name: "automation_lease_period_unique",
        }
    );
}

function toDay(date: unknown): string | null {
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : null;
}

export async function runPaymentAutomation(db: Db, now: Date = new Date()): Promise<PaymentAutomationReport> {
    const today = zonedToday(APP_TIMEZONE, now);
    const periods = generationPeriods(today);
    const report: PaymentAutomationReport = {
        ranAt: today,
        periods,
        created: 0,
        duplicatesSkipped: 0,
        ineligibleSkipped: 0,
        markedOverdue: 0,
        errors: [],
    };

    if (periods.length === 0) {
        report.errors.push(`Invalid run date "${today}". Nothing was generated or transitioned.`);
        return report;
    }

    await ensurePaymentIndexes(db);

    const payments = db.collection("payments");
    const leaseDocs = await db.collection("leases").find({ status: { $in: ["Active", "Expiring"] } }).toArray();

    if (leaseDocs.length > 0) {
        const tenantObjectIds = leaseDocs.map((l) => l.tenantId as ObjectId);
        const activeTenants = await db
            .collection("tenants")
            .find({ _id: { $in: tenantObjectIds }, status: { $ne: "Inactive" } }, { projection: { _id: 1 } })
            .toArray();
        const activeTenantIds = new Set(activeTenants.map((t) => t._id.toString()));

        const rangeStart = dayToDate(firstOfPeriod(periods[0]!));
        const rangeEnd = dayToDate(firstOfPeriod(shiftPeriod(periods[periods.length - 1]!, 1)));
        const existing = await payments
            .find({ tenantId: { $in: tenantObjectIds }, date: { $gte: rangeStart, $lt: rangeEnd } }, { projection: { tenantId: 1, date: 1 } })
            .toArray();
        const covered = new Set<string>();
        for (const p of existing) {
            const day = toDay(p.date);
            if (day) covered.add(coverageKey((p.tenantId as ObjectId).toString(), monthOfDay(day)));
        }

        const latestMethods = await payments
            .aggregate<{ _id: ObjectId; method: string }>([
                { $match: { tenantId: { $in: tenantObjectIds } } },
                { $sort: { date: -1 } },
                { $group: { _id: "$tenantId", method: { $first: "$method" } } },
            ])
            .toArray();
        const methodByTenant = new Map(latestMethods.map((m) => [m._id.toString(), m.method]));

        const leases: LeaseInput[] = leaseDocs.map((l) => ({
            id: l._id.toString(),
            userId: (l.userId as ObjectId).toString(),
            tenantId: (l.tenantId as ObjectId).toString(),
            propertyId: (l.propertyId as ObjectId).toString(),
            start: String(l.start),
            end: String(l.end),
            rent: Number(l.rent),
            status: String(l.status),
        }));

        const planned: PlannedPayment[] = [];
        for (const period of periods) {
            const plan = planMonthlyPayments({ leases, activeTenantIds, covered, methodByTenant }, period);
            planned.push(...plan.toCreate);
            report.duplicatesSkipped += plan.duplicatesSkipped;
            report.ineligibleSkipped += plan.ineligibleSkipped;
            report.errors.push(...plan.errors);
        }

        if (planned.length > 0) {
            const docs = planned.map((p) => ({
                userId: new ObjectId(p.userId),
                tenantId: new ObjectId(p.tenantId),
                propertyId: new ObjectId(p.propertyId),
                amount: p.amount,
                date: dayToDate(p.date),
                method: p.method,
                status: "Pending",
                leaseId: p.leaseId,
                period: p.period,
                source: AUTOMATION_SOURCE,
            }));
            try {
                report.created = (await payments.insertMany(docs, { ordered: false })).insertedCount;
            } catch (error) {
                // A concurrent run already wrote some rows: the unique index rejects those, keep the rest.
                if (!(error instanceof MongoBulkWriteError)) throw error;
                const writeErrors = Array.isArray(error.writeErrors) ? error.writeErrors : [error.writeErrors];
                if (writeErrors.some((e) => e.code !== DUPLICATE_KEY)) throw error;
                report.created = error.result.insertedCount;
                report.duplicatesSkipped += writeErrors.length;
            }
        }
    }

    const overdue = await payments
        .find({ status: "Pending", date: { $lte: dayToDate(overdueCutoff(today)) } }, { projection: { userId: 1, amount: 1 } })
        .toArray();
    if (overdue.length > 0) {
        await payments.updateMany({ _id: { $in: overdue.map((p) => p._id) }, status: "Pending" }, { $set: { status: "Overdue" } });
        await db.collection("notifications").insertMany(
            overdue.map((p) => ({
                userId: p.userId,
                kind: "payment",
                title: "Overdue payment",
                detail: `Payment ${p._id.toString()} · $${Number(p.amount).toLocaleString("en-US")} is overdue`,
                time: now.toISOString(),
                read: false,
                link: "Payments",
            }))
        );
        report.markedOverdue = overdue.length;
    }

    return report;
}