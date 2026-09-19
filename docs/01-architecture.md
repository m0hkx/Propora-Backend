# Architecture

## Stack

- Express 5 
- TypeScript (`module: "nodenext"`, native ESM)
- MongoDB (official driver, no ODM/schema layer) 
- `express-session` (cookie-based auth)
- `bcryptjs` (password hashing, pure JS — no native build step) 
- `multer` (multipart file uploads) 
- `tsx` (dev runner, no compile step in dev).

This is a **flat, three-layer structure per resource** — there is no
repository, service, or model layer:

```
routes/*.routes.ts        Express Router: HTTP verb + path → controller function
controllers/*.controller.ts  one function per route handler — talks to MongoDB directly
database.ts                single MongoClient, connected once at boot
```

A controller looks like this end to end (trimmed from `properties.controller.ts`):

```ts
export async function getProperties(req: Request, res: Response) {
  const database = getDatabase();
  const properties = database.collection("properties");

  const allProp = await properties
    .find({ userId: new ObjectId(req.session.userId) })
    .toArray();

  res.status(200).json({ properties: allProp.map(withId) });
}
```

No query builder, no DTO, no mapper class — the query is inline, and the
response shape is whatever `withId` (see below) produces.

## Request lifecycle

`src/app.ts` wires everything at boot, top to bottom:

1. `await connectDatabase()` — a single `MongoClient` connects once, before the
   server starts listening (top-level `await`).
2. `express.json()` — parses JSON bodies for non-multipart requests.
3. `cors({ origin: "http://localhost:5173", credentials: true })` — locked to
   the Vite dev server for the frontend; `credentials: true` is required for
   the session cookie to survive a cross-origin `fetch`.
4. `express-session` — issues/reads the session cookie (see
   [02-authentication.md](./02-authentication.md)).
5. `express.static("uploads")` mounted at `/uploads` — serves whatever
   `multer` wrote to disk.
6. One `Router` per resource, mounted at its own prefix. Every router except
   `/users` is wrapped in the `protect` middleware:

   ```ts
   app.use("/users", usersRouter);                          // public
   app.use("/properties", protect, propertyRouter);
   app.use("/units", protect, unitsRouter);
   app.use("/tenants", protect, tenantsRouter);
   app.use("/leases", protect, leasesRouter);
   app.use("/payments", protect, paymentsRouter);
   app.use("/maintenance/staff", protect, maintenanceStaffRouter); // mounted BEFORE /maintenance
   app.use("/maintenance", protect, maintenanceRouter);
   app.use("/documents", protect, documentsRouter);
   app.use("/notifications", protect, notificationsRouter);
   app.use("/dashboard", protect, dashboardRouter);
   ```

   `/maintenance/staff` is mounted **before** `/maintenance` deliberately —
   Express matches prefixes in registration order, so a request to
   `/maintenance/staff/...` must be offered to the staff router first or it
   would be swallowed by `/maintenance/:id`-shaped routes on the general
   maintenance router.

## Multi-tenancy

Every document in every collection carries a `userId: ObjectId`, always taken
from `req.session.userId` — **never** trusted from the request body. Every
`find` / `findOne` / `findOneAndUpdate` / `deleteOne` filters on it:

```ts
const property = await properties.findOne({
  _id: id,
  userId: new ObjectId(req.session.userId),
});
```

This is the entire tenancy model: one flat database, one `property_management`
db, one collection per resource, and a `userId` filter on every query instead
of separate databases or schemas per tenant. A user can never read, update, or
delete another user's data because the filter makes the document invisible,
not because of a permission check. When adding a new resource, follow this
pattern rather than a global collection scan.

## Response shaping — `withId` / `parseId`

`src/lib/serialize.ts` is the only shared utility layer in the codebase:

```ts
export function withId<T extends { _id: ObjectId; userId?: ObjectId }>(doc: T) {
  const { _id, userId, ...rest } = doc;
  return { id: _id.toString(), ...rest };
}

export function parseId(id: string | string[] | undefined): ObjectId | null {
  if (typeof id !== "string") return null;
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}
```

- `withId` turns a raw Mongo document into an API-shaped object: `_id` becomes
  a plain string `id`, and `userId` is stripped from every response — clients
  never see whose data it is beyond having authenticated as them.
- Resources with their own `ObjectId` references (a tenant's `propertyId`, a
  lease's `tenantId`, a maintenance request's `unitIds[]`, …) each define a
  small local `serializeX()` wrapper around `withId` that also stringifies
  those reference fields. There's no shared "populate" or relation layer —
  every controller does this by hand. See
  [03-data-model.md](./03-data-model.md) for the exact fields per resource.
- `parseId` is how every `:id`-taking controller validates a route param
  before querying — an invalid or missing id short-circuits to `400`, never
  reaches MongoDB.

## File uploads

`src/middleware/upload.ts` exports a `makeUpload(destination)` factory built
on `multer.diskStorage`. Two instances are built from it:

| Instance | Destination | Used by |
| -------- | ----------- | ------- |
| `upload` | `uploads/properties` | `POST /properties`, `PUT /properties/:id` (field `image`) |
| `uploadDocument` | `uploads/documents` | `POST /documents` (field `file`) |

Filenames are generated as `crypto.randomUUID() + "." + originalExtension` —
the original filename is discarded, so there's no path-traversal or collision
risk from user-supplied names. `app.ts` serves the `uploads/` directory
statically at `/uploads`, so a stored `image`/`file` field is turned into a
full URL by the **frontend**, not the API — the API only ever stores and
returns the bare filename.

## What's deliberately not here

- **No validation library** — controllers coerce (`Number(...)`, `new
  Date(...)`) but don't schema-validate. A malformed payload can produce a
  document with `undefined`/`NaN` fields rather than a `400`. This is a
  known, acceptable trade-off for a portfolio-scale API — the first thing to
  add if this became a real product would be a schema layer (Zod is a natural
  fit given the codebase is already TypeScript-first).
- **No repository/service layer** — every controller talks to
  `getDatabase().collection(...)` directly. Fine at this size (11 resources,
  one developer); the first extraction point if the codebase grew would be a
  thin repository per collection to de-duplicate the `userId` filter and the
  `serializeX` helpers.
- **No global error-handling middleware** — an uncaught error in a controller
  falls through to Express's default handler (a generic 500). See
  [05-conventions-and-errors.md](./05-conventions-and-errors.md).
- **No compiled build** — `tsconfig.json` declares `outDir`/`declaration` but
  nothing invokes `tsc`; this is a `tsx`-run dev service, not a compiled
  deployable, unless a build step is added deliberately.
