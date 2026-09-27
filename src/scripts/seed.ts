// Standalone demo-data seed script. Run with `npm run seed` (add `--reset` to wipe
// and regenerate the demo user's data). Inserts directly via the MongoDB driver,
// bypassing the HTTP API, using the same document shapes the controllers write.
import { ObjectId, type Db } from "mongodb";
import bcrypt from "bcryptjs";
import { connectDatabase, getDatabase, closeDatabase } from "../database.js";

const SALT_ROUNDS = 10;

const SEED_USER = {
    username: "demo",
    email: "demo@propora.dev",
    password: "Demo1234!",
};

const RESET = process.argv.includes("--reset");

const DEPENDENT_COLLECTIONS = [
    "properties", "units", "staff", "tenants", "leases",
    "payments", "maintenance", "documents", "notifications",
] as const;

function dateStr(offsetDays: number): string {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
}

function dateVal(offsetDays: number): Date {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d;
}

function isoAt(offsetDays: number): string {
    return dateVal(offsetDays).toISOString();
}

function printCredentials() {
    console.log("==============================================");
    console.log(" Propora demo data ready. Log in with:");
    console.log(`   username: ${SEED_USER.username}`);
    console.log(`   email:    ${SEED_USER.email}`);
    console.log(`   password: ${SEED_USER.password}`);
    console.log("==============================================");
}

async function wipeDemoData(db: Db, userId: ObjectId) {
    for (const name of DEPENDENT_COLLECTIONS) {
        await db.collection(name).deleteMany({ userId });
    }
    await db.collection("users").deleteOne({ _id: userId });
}

async function seedUser(db: Db) {
    const hashed = await bcrypt.hash(SEED_USER.password, SALT_ROUNDS);
    const doc = {
        _id: new ObjectId(),
        username: SEED_USER.username,
        email: SEED_USER.email,
        password: hashed,
    };
    await db.collection("users").insertOne(doc);
    return doc;
}

const PROPERTY_SPECS = [
    {
        name: "Ocean View Residences", type: "Apartment", status: "Active",
        address: "12 Marina Blvd", city: "San Diego", country: "USA", postal: "92101",
        description: "Beachside mid-rise with renovated common areas and covered parking.",
        yearBuilt: 2018, floors: 6, size: 42000, baseRent: 2850,
        buyPrice: 8500000, expectedRevnue: 950000, monthlyExpenses: 18000,
    },
    {
        name: "Cedar Court Apartments", type: "Apartment", status: "Active",
        address: "48 Cedar St", city: "Austin", country: "USA", postal: "78701",
        description: "Garden-style apartment community near downtown Austin.",
        yearBuilt: 2015, floors: 3, size: 21000, baseRent: 1950,
        buyPrice: 4200000, expectedRevnue: 520000, monthlyExpenses: 9500,
    },
    {
        name: "Elm & Park Lofts", type: "Loft", status: "Active",
        address: "7 Elm Park", city: "Chicago", country: "USA", postal: "60601",
        description: "Converted warehouse lofts with exposed brick and high ceilings.",
        yearBuilt: 2020, floors: 5, size: 18000, baseRent: 2400,
        buyPrice: 5100000, expectedRevnue: 410000, monthlyExpenses: 8700,
    },
    {
        name: "Sunset Villas", type: "Villa", status: "Under Maintenance",
        address: "301 Sunset Ave", city: "Phoenix", country: "USA", postal: "85001",
        description: "Single-story villa cluster undergoing roof and HVAC work.",
        yearBuilt: 2012, floors: 2, size: 15000, baseRent: 2200,
        buyPrice: 3300000, expectedRevnue: 260000, monthlyExpenses: 7200,
    },
];

// propertyIndex ties a unit back to PROPERTY_SPECS; totalUnits/occupied below are
// derived from this list rather than guessed, per the plan.
const UNIT_SPECS = [
    { propertyIndex: 0, name: "A-101", floor: 1, type: "1 BR", bedrooms: 1, bathrooms: 1, size: 55, rent: 2650, status: "Occupied", notes: "" },
    { propertyIndex: 0, name: "A-102", floor: 1, type: "1 BR", bedrooms: 1, bathrooms: 1, size: 58, rent: 2700, status: "Occupied", notes: "" },
    { propertyIndex: 0, name: "A-201", floor: 2, type: "2 BR", bedrooms: 2, bathrooms: 2, size: 85, rent: 2850, status: "Occupied", notes: "" },
    { propertyIndex: 0, name: "A-202", floor: 2, type: "2 BR", bedrooms: 2, bathrooms: 2, size: 85, rent: 2900, status: "Occupied", notes: "" },
    { propertyIndex: 0, name: "A-203", floor: 2, type: "2 BR", bedrooms: 2, bathrooms: 2, size: 88, rent: 2950, status: "Vacant", notes: "" },
    { propertyIndex: 1, name: "B-101", floor: 1, type: "1 BR", bedrooms: 1, bathrooms: 1, size: 52, rent: 1950, status: "Occupied", notes: "" },
    { propertyIndex: 1, name: "B-102", floor: 1, type: "2 BR", bedrooms: 2, bathrooms: 1, size: 72, rent: 2100, status: "Occupied", notes: "" },
    { propertyIndex: 1, name: "B-201", floor: 2, type: "2 BR", bedrooms: 2, bathrooms: 1, size: 74, rent: 2150, status: "Vacant", notes: "" },
    { propertyIndex: 1, name: "B-202", floor: 2, type: "Studio", bedrooms: 0, bathrooms: 1, size: 40, rent: 1650, status: "Occupied", notes: "" },
    { propertyIndex: 2, name: "C-101", floor: 1, type: "Studio", bedrooms: 0, bathrooms: 1, size: 38, rent: 1800, status: "Occupied", notes: "" },
    { propertyIndex: 2, name: "C-305", floor: 3, type: "2 BR", bedrooms: 2, bathrooms: 2, size: 80, rent: 2400, status: "Occupied", notes: "" },
    { propertyIndex: 2, name: "C-306", floor: 3, type: "2 BR", bedrooms: 2, bathrooms: 2, size: 82, rent: 2450, status: "Vacant", notes: "" },
    { propertyIndex: 3, name: "D-101", floor: 1, type: "2 BR", bedrooms: 2, bathrooms: 2, size: 78, rent: 2200, status: "Maintenance", notes: "Roof and HVAC work in progress." },
    { propertyIndex: 3, name: "D-102", floor: 1, type: "2 BR", bedrooms: 2, bathrooms: 1, size: 70, rent: 2150, status: "Vacant", notes: "" },
    { propertyIndex: 3, name: "D-103", floor: 1, type: "3 BR", bedrooms: 3, bathrooms: 2, size: 110, rent: 2850, status: "Occupied", notes: "" },
];

async function seedProperties(db: Db, userId: ObjectId) {
    const createdAt = dateVal(-400);
    const docs = PROPERTY_SPECS.map((spec, index) => {
        const unitsForProperty = UNIT_SPECS.filter((u) => u.propertyIndex === index);
        return {
            _id: new ObjectId(),
            name: spec.name,
            userId,
            type: spec.type,
            status: spec.status,
            description: spec.description,
            address: spec.address,
            city: spec.city,
            country: spec.country,
            postal: spec.postal,
            totalUnits: unitsForProperty.length,
            yearBuilt: spec.yearBuilt,
            floors: spec.floors,
            size: spec.size,
            baseRent: spec.baseRent,
            buyPrice: spec.buyPrice,
            expectedRevnue: spec.expectedRevnue,
            monthlyExpenses: spec.monthlyExpenses,
            createdAt,
            updatedAt: createdAt,
            occupied: unitsForProperty.filter((u) => u.status === "Occupied").length,
        };
    });
    await db.collection("properties").insertMany(docs);
    return docs;
}

async function seedUnits(db: Db, userId: ObjectId, properties: Awaited<ReturnType<typeof seedProperties>>) {
    const docs = UNIT_SPECS.map((spec) => ({
        _id: new ObjectId(),
        propertyId: properties[spec.propertyIndex]!._id,
        userId,
        name: spec.name,
        floor: spec.floor,
        type: spec.type,
        bedrooms: spec.bedrooms,
        bathrooms: spec.bathrooms,
        size: spec.size,
        rent: spec.rent,
        status: spec.status,
        notes: spec.notes,
    }));
    await db.collection("units").insertMany(docs);
    return docs;
}

const STAFF_SPECS = [
    { name: "Marcus Reed", phone: "555-0101", email: "marcus.reed@propora.dev", specialty: "Plumbing", status: "Active" },
    { name: "Elena Torres", phone: "555-0102", email: "elena.torres@propora.dev", specialty: "Electrical", status: "Active" },
    { name: "Sam Okafor", phone: "555-0103", email: "sam.okafor@propora.dev", specialty: "HVAC", status: "Active" },
    { name: "Dana Whitfield", phone: "555-0104", email: "dana.whitfield@propora.dev", specialty: "Appliance", status: "Active" },
    { name: "Leo Park", phone: "555-0105", email: "leo.park@propora.dev", specialty: "General", status: "Inactive" },
];

async function seedStaff(db: Db, userId: ObjectId) {
    const docs = STAFF_SPECS.map((spec) => ({ _id: new ObjectId(), userId, ...spec }));
    await db.collection("staff").insertMany(docs);
    return docs;
}

// unitIndex is the position in UNIT_SPECS/units — only "Occupied" units get a tenant.
const TENANT_SPECS = [
    { unitIndex: 0, name: "Maria Gonzalez", email: "maria.gonzalez@example.com", phone: "555-0201", paymentStatus: "Paid", status: "Active", leaseStatus: "Active", leaseStart: -190, leaseEnd: 175 },
    { unitIndex: 1, name: "James Wu", email: "james.wu@example.com", phone: "555-0202", paymentStatus: "Paid", status: "Active", leaseStatus: "Active", leaseStart: -140, leaseEnd: 225 },
    { unitIndex: 2, name: "Lena Fischer", email: "lena.fischer@example.com", phone: "555-0203", paymentStatus: "Pending", status: "Active", leaseStatus: "Expiring Soon", leaseStart: -300, leaseEnd: 65 },
    { unitIndex: 3, name: "Omar Haddad", email: "omar.haddad@example.com", phone: "555-0204", paymentStatus: "Paid", status: "Active", leaseStatus: "Active", leaseStart: -80, leaseEnd: 285 },
    { unitIndex: 5, name: "Priya Nair", email: "priya.nair@example.com", phone: "555-0205", paymentStatus: "Overdue", status: "Active", leaseStatus: "Expiring Soon", leaseStart: -350, leaseEnd: 10 },
    { unitIndex: 6, name: "Tom Bennett", email: "tom.bennett@example.com", phone: "555-0206", paymentStatus: "Paid", status: "Active", leaseStatus: "Active", leaseStart: -60, leaseEnd: 305 },
    { unitIndex: 8, name: "Aisha Rahman", email: "aisha.rahman@example.com", phone: "555-0207", paymentStatus: "Paid", status: "Active", leaseStatus: "Active", leaseStart: -20, leaseEnd: 345 },
    { unitIndex: 9, name: "Noah Kim", email: "noah.kim@example.com", phone: "555-0208", paymentStatus: "Pending", status: "Pending", leaseStatus: "Active", leaseStart: -10, leaseEnd: 355 },
    { unitIndex: 10, name: "Isabelle Laurent", email: "isabelle.laurent@example.com", phone: "555-0209", paymentStatus: "Paid", status: "Active", leaseStatus: "Active", leaseStart: -220, leaseEnd: 145 },
    { unitIndex: 14, name: "Chris Palmer", email: "chris.palmer@example.com", phone: "555-0210", paymentStatus: "Paid", status: "Active", leaseStatus: "Active", leaseStart: -100, leaseEnd: 265 },
];

async function seedTenants(
    db: Db,
    userId: ObjectId,
    properties: Awaited<ReturnType<typeof seedProperties>>,
    units: Awaited<ReturnType<typeof seedUnits>>,
) {
    const docs = TENANT_SPECS.map((spec) => {
        const unit = units[spec.unitIndex]!;
        const property = properties[UNIT_SPECS[spec.unitIndex]!.propertyIndex]!;
        return {
            _id: new ObjectId(),
            userId,
            name: spec.name,
            email: spec.email,
            phone: spec.phone,
            propertyId: property._id,
            unit: unit.name,
            unitId: unit._id,
            beds: unit.bedrooms,
            leaseStart: dateStr(spec.leaseStart),
            leaseEnd: dateStr(spec.leaseEnd),
            leaseStatus: spec.leaseStatus,
            rent: unit.rent,
            paymentStatus: spec.paymentStatus,
            paymentDate: spec.paymentStatus === "Paid" ? dateStr(-2) : "—",
            status: spec.status,
        };
    });
    await db.collection("tenants").insertMany(docs);
    return docs;
}

async function seedLeases(
    db: Db,
    userId: ObjectId,
    properties: Awaited<ReturnType<typeof seedProperties>>,
    units: Awaited<ReturnType<typeof seedUnits>>,
    tenants: Awaited<ReturnType<typeof seedTenants>>,
) {
    const current = TENANT_SPECS.map((spec, i) => {
        const tenant = tenants[i]!;
        const unit = units[spec.unitIndex]!;
        const property = properties[UNIT_SPECS[spec.unitIndex]!.propertyIndex]!;
        return {
            _id: new ObjectId(),
            userId,
            propertyId: property._id,
            tenantId: tenant._id,
            unitId: unit._id,
            start: dateStr(spec.leaseStart),
            end: dateStr(spec.leaseEnd),
            rent: unit.rent,
            deposit: unit.rent,
            status: spec.leaseStatus === "Expiring Soon" ? "Expiring" : "Active",
        };
    });

    // Prior, now-expired leases for two tenants, for status variety.
    const historical = [
        { tenantIndex: 0, start: -560, end: -200, rentDelta: -150 },
        { tenantIndex: 4, start: -750, end: -400, rentDelta: -100 },
    ].map((spec) => {
        const tenant = tenants[spec.tenantIndex]!;
        const unitSpec = UNIT_SPECS[TENANT_SPECS[spec.tenantIndex]!.unitIndex]!;
        const property = properties[unitSpec.propertyIndex]!;
        return {
            _id: new ObjectId(),
            userId,
            propertyId: property._id,
            tenantId: tenant._id,
            unitId: units[TENANT_SPECS[spec.tenantIndex]!.unitIndex]!._id,
            start: dateStr(spec.start),
            end: dateStr(spec.end),
            rent: unitSpec.rent + spec.rentDelta,
            deposit: unitSpec.rent + spec.rentDelta,
            status: "Expired",
        };
    });

    const docs = [...current, ...historical];
    await db.collection("leases").insertMany(docs);
    return { all: docs, current };
}

async function seedPayments(
    db: Db,
    userId: ObjectId,
    properties: Awaited<ReturnType<typeof seedProperties>>,
    tenants: Awaited<ReturnType<typeof seedTenants>>,
    currentLeases: Awaited<ReturnType<typeof seedLeases>>["current"],
) {
    const methods = ["Bank", "Card", "Cash"] as const;
    const docs: Record<string, unknown>[] = [];

    tenants.forEach((tenant, i) => {
        const spec = TENANT_SPECS[i]!;
        const lease = currentLeases[i]!;
        const property = properties[UNIT_SPECS[spec.unitIndex]!.propertyIndex]!;
        const offsets = i < 7 ? [-60, -30, -2] : [-30, -2];

        offsets.forEach((offset, j) => {
            const isLatest = j === offsets.length - 1;
            const status = isLatest ? spec.paymentStatus : "Paid";
            const d = dateVal(offset);
            docs.push({
                _id: new ObjectId(),
                userId,
                tenantId: tenant._id,
                propertyId: property._id,
                amount: tenant.rent,
                date: d,
                method: methods[(i + j) % methods.length],
                status,
                // leaseId is stored as a raw string in the real controller, never an
                // ObjectId — replicate that exactly (payments.controller.ts:36).
                leaseId: lease._id.toString(),
                period: d.toISOString().slice(0, 7),
            });
        });
    });

    await db.collection("payments").insertMany(docs);
    return docs;
}

function buildHistory(reportedOffset: number, assigneeName: string | undefined, status: string, statusChangeOffset: number) {
    const history: { date: string; text: string }[] = [{ date: dateStr(reportedOffset), text: "Request created" }];
    if (assigneeName) history.push({ date: dateStr(reportedOffset), text: `Assigned to ${assigneeName}` });
    if (status !== "Open") history.push({ date: dateStr(statusChangeOffset), text: `Status changed to ${status}` });
    return history;
}

async function seedMaintenance(
    db: Db,
    userId: ObjectId,
    properties: Awaited<ReturnType<typeof seedProperties>>,
    units: Awaited<ReturnType<typeof seedUnits>>,
    tenants: Awaited<ReturnType<typeof seedTenants>>,
    staff: Awaited<ReturnType<typeof seedStaff>>,
) {
    const specs = [
        { propertyIndex: 0, scope: "units", unitIndexes: [0], title: "Leaking kitchen faucet", category: "Plumbing", priority: "Medium", status: "Completed", assigneeIndex: 0, estimatedCost: 180, actualCost: 165, reported: -20, scheduled: -18, completed: -15 },
        { propertyIndex: 0, scope: "units", unitIndexes: [2], title: "AC not cooling", category: "HVAC", priority: "High", status: "In Progress", assigneeIndex: 2, estimatedCost: 420, reported: -5, scheduled: -3 },
        { propertyIndex: 0, scope: "property", title: "Lobby lighting flicker", category: "Electrical", priority: "Low", status: "Open", estimatedCost: 90, reported: -2 },
        { propertyIndex: 0, scope: "tenants", tenantIndexes: [0], title: "Noise complaint follow-up", category: "General", priority: "Low", status: "Scheduled", estimatedCost: 0, reported: -10, scheduled: 3 },
        { propertyIndex: 1, scope: "units", unitIndexes: [5], title: "Garbage disposal jammed", category: "Appliance", priority: "Medium", status: "Completed", assigneeIndex: 3, estimatedCost: 150, actualCost: 140, reported: -30, scheduled: -29, completed: -27 },
        { propertyIndex: 1, scope: "units", unitIndexes: [6], title: "Water heater replacement", category: "Plumbing", priority: "Urgent", status: "In Progress", assigneeIndex: 0, estimatedCost: 900, reported: -3, scheduled: -1 },
        { propertyIndex: 1, scope: "property", title: "Exterior paint touch-up", category: "Structural", priority: "Low", status: "Paused", estimatedCost: 2200, reported: -40, scheduled: -35 },
        { propertyIndex: 1, scope: "units", unitIndexes: [8], title: "Ceiling fan replacement", category: "Electrical", priority: "Low", status: "Completed", assigneeIndex: 1, estimatedCost: 130, actualCost: 125, reported: -25, scheduled: -23, completed: -20 },
        { propertyIndex: 2, scope: "units", unitIndexes: [9], title: "Outlet not working", category: "Electrical", priority: "Medium", status: "Completed", assigneeIndex: 1, estimatedCost: 140, actualCost: 130, reported: -15, scheduled: -14, completed: -12 },
        { propertyIndex: 2, scope: "units", unitIndexes: [10], title: "Dishwasher leak", category: "Appliance", priority: "High", status: "Open", estimatedCost: 250, reported: -1 },
        { propertyIndex: 2, scope: "property", title: "Common area deep clean", category: "Cleaning", priority: "Low", status: "Scheduled", estimatedCost: 300, reported: -6, scheduled: 2 },
        { propertyIndex: 3, scope: "property", title: "Roof inspection after storm", category: "Structural", priority: "High", status: "In Progress", assigneeIndex: 2, estimatedCost: 1500, reported: -4, scheduled: -2 },
        { propertyIndex: 3, scope: "units", unitIndexes: [12], title: "HVAC unit servicing", category: "HVAC", priority: "Medium", status: "Scheduled", assigneeIndex: 2, estimatedCost: 500, reported: -8, scheduled: 5 },
        { propertyIndex: 3, scope: "tenants", tenantIndexes: [9], title: "Tenant requested smoke detector check", category: "General", priority: "Low", status: "Open", estimatedCost: 40, reported: -1 },
    ];

    const docs = specs.map((spec) => {
        const assignee = spec.assigneeIndex !== undefined ? staff[spec.assigneeIndex]! : undefined;
        const scheduledOffset = spec.completed ?? spec.scheduled ?? spec.reported;
        return {
            _id: new ObjectId(),
            userId,
            propertyId: properties[spec.propertyIndex]!._id,
            scope: spec.scope,
            unitIds: (spec.unitIndexes ?? []).map((i) => units[i]!._id),
            tenantIds: (spec.tenantIndexes ?? []).map((i) => tenants[i]!._id),
            title: spec.title,
            description: `${spec.title} — reported for ${properties[spec.propertyIndex]!.name}.`,
            category: spec.category,
            priority: spec.priority,
            status: spec.status,
            reported: dateStr(spec.reported),
            scheduledDate: spec.scheduled !== undefined ? dateStr(spec.scheduled) : undefined,
            completedDate: spec.completed !== undefined ? dateStr(spec.completed) : undefined,
            assigneeId: assignee?._id,
            estimatedCost: spec.estimatedCost,
            actualCost: spec.actualCost,
            history: buildHistory(spec.reported, assignee?.name, spec.status, scheduledOffset),
        };
    });

    await db.collection("maintenance").insertMany(docs);
    return docs;
}

async function seedDocuments(
    db: Db,
    userId: ObjectId,
    properties: Awaited<ReturnType<typeof seedProperties>>,
    tenants: Awaited<ReturnType<typeof seedTenants>>,
    currentLeases: Awaited<ReturnType<typeof seedLeases>>["current"],
) {
    const leaseDocs = [0, 1, 2, 3].map((i) => {
        const tenant = tenants[i]!;
        const spec = TENANT_SPECS[i]!;
        const property = properties[UNIT_SPECS[spec.unitIndex]!.propertyIndex]!;
        return {
            _id: new ObjectId(),
            userId,
            name: `${property.name} - Lease ${tenant.unit}.pdf`,
            propertyId: property._id,
            unit: tenant.unit,
            tenantId: tenant._id,
            leaseId: currentLeases[i]!._id.toString(),
            type: "Lease",
            size: "2.1 MB",
            uploadedBy: SEED_USER.username,
            uploadDate: dateStr(spec.leaseStart),
            expirationDate: dateStr(spec.leaseEnd),
            status: "Active",
            description: `Executed lease for ${tenant.name}, ${property.name} unit ${tenant.unit}.`,
        };
    });

    const tenantDocs = [4, 5, 6].map((i) => {
        const tenant = tenants[i]!;
        const spec = TENANT_SPECS[i]!;
        const property = properties[UNIT_SPECS[spec.unitIndex]!.propertyIndex]!;
        return {
            _id: new ObjectId(),
            userId,
            name: `${tenant.name} - ID Verification.pdf`,
            propertyId: property._id,
            unit: tenant.unit,
            tenantId: tenant._id,
            leaseId: "",
            type: "Tenant Document",
            size: "640 KB",
            uploadedBy: SEED_USER.username,
            uploadDate: dateStr(spec.leaseStart + 2),
            expirationDate: undefined,
            status: "Active",
            description: `Identity verification on file for ${tenant.name}.`,
        };
    });

    const propertyOnly = [
        { propertyIndex: 0, name: "Ocean View - Inspection Report.pdf", type: "Property Document", size: "1.1 MB", offset: -90, expOffset: undefined, status: "Active", description: "Annual building inspection covering structure, roofing and common areas." },
        { propertyIndex: 1, name: "Cedar Court - Inspection Report.pdf", type: "Property Document", size: "980 KB", offset: -70, expOffset: undefined, status: "Active", description: "Annual building inspection for Cedar Court Apartments." },
        { propertyIndex: 2, name: "Elm & Park - Fire Safety Report.pdf", type: "Property Document", size: "1.3 MB", offset: -50, expOffset: undefined, status: "Active", description: "Fire safety and egress inspection for Elm & Park Lofts." },
        { propertyIndex: 0, name: "Ocean View - Insurance.pdf", type: "Insurance", size: "3.2 MB", offset: -200, expOffset: 20, status: "Expiring Soon", description: "Building hazard and liability policy renewing soon." },
        { propertyIndex: 3, name: "Sunset Villas - Insurance.pdf", type: "Insurance", size: "2.8 MB", offset: -180, expOffset: 45, status: "Active", description: "Building hazard and liability policy for Sunset Villas." },
        { propertyIndex: 0, name: "Maintenance Vendor Contracts.zip", type: "Contract", size: "12.4 MB", offset: -60, expOffset: 300, status: "Active", description: "Signed annual contracts for plumbing, electrical and HVAC vendors." },
        { propertyIndex: 1, name: "Landscaping Vendor Contract.pdf", type: "Contract", size: "820 KB", offset: -100, expOffset: 260, status: "Active", description: "Annual landscaping service agreement." },
        { propertyIndex: 2, name: "Q3 Rent Roll.xlsx", type: "Invoice", size: "880 KB", offset: -15, expOffset: undefined, status: "Active", description: "Third-quarter rent roll with collected, pending and overdue balances." },
        { propertyIndex: 3, name: "Roof Repair Invoice.pdf", type: "Invoice", size: "410 KB", offset: -4, expOffset: undefined, status: "Active", description: "Contractor invoice for storm-related roof repair." },
        { propertyIndex: 3, name: "Sunset Villas - HOA Agreement.pdf", type: "Legal", size: "1.6 MB", offset: -300, expOffset: undefined, status: "Active", description: "Homeowners association agreement covering shared grounds maintenance." },
        { propertyIndex: 2, name: "Tenant Handbook 2026.pdf", type: "Other", size: "4.6 MB", offset: -120, expOffset: undefined, status: "Active", description: "Community rules, move-in checklist and emergency contacts for all tenants." },
    ].map((spec) => {
        const property = properties[spec.propertyIndex]!;
        return {
            _id: new ObjectId(),
            userId,
            name: spec.name,
            propertyId: property._id,
            unit: "",
            tenantId: undefined,
            leaseId: "",
            type: spec.type,
            size: spec.size,
            uploadedBy: SEED_USER.username,
            uploadDate: dateStr(spec.offset),
            expirationDate: spec.expOffset !== undefined ? dateStr(spec.expOffset) : undefined,
            status: spec.status,
            description: spec.description,
        };
    });

    const docs = [...leaseDocs, ...tenantDocs, ...propertyOnly];
    await db.collection("documents").insertMany(docs);
    return docs;
}

async function seedNotifications(db: Db, userId: ObjectId) {
    const specs = [
        { kind: "tenant", title: "New tenant added", detail: "Maria Gonzalez · Unit A-101", read: true, link: "Tenants", offset: -10 },
        { kind: "maintenance", title: "New maintenance request", detail: "Water heater replacement", read: false, link: "Maintenance", offset: -3 },
        { kind: "payment", title: "Payment overdue", detail: "Priya Nair · Unit B-101", read: false, link: "Payments", offset: -2 },
        { kind: "tenant", title: "New tenant added", detail: "Chris Palmer · Unit D-103", read: true, link: "Tenants", offset: -8 },
        { kind: "maintenance", title: "Maintenance completed", detail: "Leaking kitchen faucet", read: true, link: "Maintenance", offset: -15 },
        { kind: "payment", title: "Payment pending", detail: "Lena Fischer · Unit A-201", read: false, link: "Payments", offset: -1 },
    ] as const;

    const docs = specs.map((spec) => ({
        _id: new ObjectId(),
        userId,
        kind: spec.kind,
        title: spec.title,
        detail: spec.detail,
        time: isoAt(spec.offset),
        read: spec.read,
        link: spec.link,
    }));

    await db.collection("notifications").insertMany(docs);
    return docs;
}

async function main() {
    await connectDatabase();
    const db = getDatabase();

    try {
        const usersCollection = db.collection("users");
        const existing = await usersCollection.findOne({ email: SEED_USER.email });

        if (existing && !RESET) {
            console.log("Demo user already exists — skipping seed. Re-run with --reset to wipe and reseed.");
            printCredentials();
            return;
        }

        if (existing && RESET) {
            console.log("Resetting existing demo data...");
            await wipeDemoData(db, existing._id);
        }

        const user = await seedUser(db);
        const properties = await seedProperties(db, user._id);
        const units = await seedUnits(db, user._id, properties);
        const staff = await seedStaff(db, user._id);
        const tenants = await seedTenants(db, user._id, properties, units);
        const leases = await seedLeases(db, user._id, properties, units, tenants);
        const payments = await seedPayments(db, user._id, properties, tenants, leases.current);
        const maintenance = await seedMaintenance(db, user._id, properties, units, tenants, staff);
        const documents = await seedDocuments(db, user._id, properties, tenants, leases.current);
        const notifications = await seedNotifications(db, user._id);

        printCredentials();
        console.log(
            ` properties: ${properties.length}  units: ${units.length}  staff: ${staff.length}  tenants: ${tenants.length}\n` +
            ` leases: ${leases.all.length}  payments: ${payments.length}  maintenance: ${maintenance.length}\n` +
            ` documents: ${documents.length}  notifications: ${notifications.length}`,
        );
        console.log("==============================================");
    } catch (error) {
        console.error("Seed failed:", error);
        process.exitCode = 1;
    } finally {
        await closeDatabase();
    }
}

await main();
