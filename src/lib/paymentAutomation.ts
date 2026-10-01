// Pure planning rules for automated rent collection. No database, clock or
// network access: callers pass "today" in explicitly so every function is
// deterministic and unit-testable. The job in src/jobs applies the plans.

/** Business timezone for month boundaries, due dates and overdue transitions. */
export const APP_TIMEZONE = "UTC";

/** Generate the upcoming month once today is this many days before it starts. */
export const GENERATION_LEAD_DAYS = 3;

/** A Pending payment becomes Overdue once today passes its due date + this many days. */
export const OVERDUE_GRACE_DAYS = 1;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_PERIOD = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DAY_MS = 86_400_000;

function pad2(n: number): string {
    return String(n).padStart(2, "0");
}

/** Strict `YYYY-MM-DD` check (rejects month 13, Feb 30, …). */
export function isIsoDay(value: string): boolean {
    if (!ISO_DAY.test(value)) return false;
    const [y = 0, m = 0, d = 0] = value.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** The `Date` (UTC midnight) a `YYYY-MM-DD` day is stored as in Mongo. */
export function dayToDate(iso: string): Date {
    return new Date(`${iso}T00:00:00.000Z`);
}

/** Calendar-day arithmetic on `YYYY-MM-DD` strings (UTC-based, DST-proof). */
export function addDaysIso(iso: string, days: number): string {
    return new Date(dayToDate(iso).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

/** Coverage month (`YYYY-MM`) of a `YYYY-MM-DD` date. */
export function monthOfDay(isoDay: string): string {
    return isoDay.slice(0, 7);
}

/** First day (the rent due date by app convention) of a `YYYY-MM` period. */
export function firstOfPeriod(period: string): string {
    return `${period}-01`;
}

/** Shift a `YYYY-MM` period by whole months. */
export function shiftPeriod(period: string, delta: number): string {
    const year = Number(period.slice(0, 4));
    const month = Number(period.slice(5, 7));
    const total = year * 12 + (month - 1) + delta;
    return `${Math.floor(total / 12)}-${pad2((total % 12) + 1)}`;
}

/** Today's date in the business timezone, as `YYYY-MM-DD`. */
export function zonedToday(timeZone: string, now: Date): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(now);
    const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * Periods needing a generation pass for `today`: always the current month
 * (missed-run catch-up — a no-op once every live lease is covered), plus the
 * upcoming month once inside the lead window. With a 3-day lead, Sep 28 →
 * `['2026-09', '2026-10']`; Sep 27 → `['2026-09']`.
 */
export function generationPeriods(todayIso: string): string[] {
    if (!isIsoDay(todayIso)) return [];
    const current = monthOfDay(todayIso);
    const next = shiftPeriod(current, 1);
    const windowOpens = addDaysIso(firstOfPeriod(next), -GENERATION_LEAD_DAYS);
    return todayIso >= windowOpens ? [current, next] : [current];
}

/** Pending payments dated on or before this day are overdue (due Oct 1 → overdue from Oct 2). */
export function overdueCutoff(todayIso: string): string {
    return addDaysIso(todayIso, -OVERDUE_GRACE_DAYS);
}

export interface LeaseInput {
    id: string;
    userId: string;
    tenantId: string;
    propertyId: string;
    /** `YYYY-MM-DD` */
    start: string;
    /** `YYYY-MM-DD` */
    end: string;
    rent: number;
    status: string;
}

export interface PlannedPayment {
    userId: string;
    tenantId: string;
    propertyId: string;
    leaseId: string;
    amount: number;
    period: string;
    /** Due date, `YYYY-MM-DD`. */
    date: string;
    method: string;
}

export interface GenerationInput {
    leases: LeaseInput[];
    /** Tenant ids that exist and are not Inactive. */
    activeTenantIds: Set<string>;
    /** `${tenantId}|${YYYY-MM}` for every payment already dated in the period — generated or manual. */
    covered: Set<string>;
    /** Most recent payment method per tenant, for continuity. */
    methodByTenant: Map<string, string>;
}

export interface GenerationPlan {
    toCreate: PlannedPayment[];
    duplicatesSkipped: number;
    ineligibleSkipped: number;
    errors: string[];
}

export function coverageKey(tenantId: string, period: string): string {
    return `${tenantId}|${period}`;
}

/**
 * Plan one period's rent generation. Skips (never throws on) expired leases,
 * inactive tenants and leases without a usable term or rent; anything already
 * covering tenant + period counts as a duplicate. Planned rows are added to
 * `covered`, so two leases for one tenant can't both bill the same month.
 */
export function planMonthlyPayments(input: GenerationInput, period: string): GenerationPlan {
    const plan: GenerationPlan = { toCreate: [], duplicatesSkipped: 0, ineligibleSkipped: 0, errors: [] };
    if (!ISO_PERIOD.test(period)) {
        plan.errors.push(`Invalid billing period "${period}" — expected YYYY-MM. Skipping generation.`);
        return plan;
    }

    for (const lease of input.leases) {
        if (lease.status !== "Active" && lease.status !== "Expiring") {
            plan.ineligibleSkipped += 1;
            continue;
        }
        if (!isIsoDay(lease.start) || !isIsoDay(lease.end) || lease.start > lease.end) {
            plan.errors.push(`Lease ${lease.id} has an unusable term (${lease.start} → ${lease.end}). Skipping ${period}.`);
            plan.ineligibleSkipped += 1;
            continue;
        }
        if (period < monthOfDay(lease.start) || period > monthOfDay(lease.end)) {
            plan.ineligibleSkipped += 1;
            continue;
        }
        if (!input.activeTenantIds.has(lease.tenantId)) {
            plan.ineligibleSkipped += 1;
            continue;
        }
        if (!Number.isFinite(lease.rent) || lease.rent <= 0) {
            plan.errors.push(`Lease ${lease.id} is missing a monthly rent amount. Skipping ${period}.`);
            plan.ineligibleSkipped += 1;
            continue;
        }

        const key = coverageKey(lease.tenantId, period);
        if (input.covered.has(key)) {
            plan.duplicatesSkipped += 1;
            continue;
        }
        input.covered.add(key);
        plan.toCreate.push({
            userId: lease.userId,
            tenantId: lease.tenantId,
            propertyId: lease.propertyId,
            leaseId: lease.id,
            amount: lease.rent,
            period,
            date: firstOfPeriod(period),
            method: input.methodByTenant.get(lease.tenantId) ?? "Bank",
        });
    }
    return plan;
}
