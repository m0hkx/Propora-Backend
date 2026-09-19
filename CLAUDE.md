# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

Express 5, TypeScript (`nodenext` ESM), MongoDB (native driver, no ODM), express-session (cookie-based auth), bcryptjs (password hashing), multer (file uploads), tsx (dev runner). This is the backend API for the Propora property-management app; the frontend lives in the sibling `../Propora` repo (a separate git repo) and consumes every route below.

## Commands

- `npm run dev` — `tsx --watch src/app.ts`, runs against `.env` in this directory
- `npm run start` — `tsx src/app.ts` (no watch)

There is no `build`, `lint`, or working `test` script (`test` is the default npm stub and just exits 1). `tsconfig.json` declares `outDir`/`declaration` but nothing invokes `tsc` — treat this as a dev-only setup, not a compiled deployable, unless asked to add one.

Requires a `.env` with `MONGODB_URI` (or `MONGODB_USERNAME`/`MONGODB_PASSWORD` depending on connection string), and `SESSION_SECRET`. Server listens on hardcoded port `3000`; CORS is locked to `http://localhost:5173` (the Vite dev server for `../Propora`).

## Architecture

Flat three-layer structure per resource, no models/schemas layer:

- `src/routes/*.routes.ts` — Express `Router` per resource, maps HTTP verb + path to a controller function. Mounted in `src/app.ts` (e.g. `/properties`, `/tenants`, `/leases`, `/payments`, `/maintenance`, `/maintenance/staff`, `/documents`, `/notifications`, `/dashboard`, `/users`).
- `src/controllers/*.controller.ts` — one function per route handler. No repository/service layer: controllers call `getDatabase().collection("name")` directly and build query/insert documents inline from `req.body`.
- `src/database.ts` — single `MongoClient`, connected once at startup via top-level `await connectDatabase()` in `app.ts`. `getDatabase()` returns the `property_management` db; there's no per-request connection handling.
- `src/lib/serialize.ts` — `withId(doc)` maps a Mongo `_id`/`userId` to a plain `{ id, ...rest }` response shape (every controller uses this); `parseId(param)` turns a route `:id` into an `ObjectId` or `null` (params type as `string | string[] | undefined` under `noUncheckedIndexedAccess`).
- Every controller function is implemented. Notifications have no insert route by design — they're created as a side effect inside `insertTenant`, `insertMaintenanceRequest`, and `updatePayment` (when a status transition lands on `Overdue`).

### Multi-tenancy

Every document carries a `userId: ObjectId` set from `req.session.userId` (never trusted from the request body), and every list/get/update/delete query filters by it — one logged-in user never sees another's data. When adding a new resource or field, follow this pattern rather than a global collection scan.

### Auth

Session-based via `express-session`, storing `userId` (typed in `src/types/express-session.d.ts`). `src/middleware/auth.ts` exports `protect`, mounted in `app.ts` on every router except `/users` (`/users/register`, `/users/login`, `/users/logout`, `/users/session` are the only unauthenticated-by-necessity routes; `/users/:id` is also unprotected but strips the password field). Passwords are hashed with `bcryptjs` (pure-JS, no native build step — deliberately not `bcrypt`, which needs `node-gyp`).

### File uploads

`src/middleware/upload.ts` exports a `makeUpload(destination)` factory; `upload` (→ `uploads/properties`, used by the properties routes) and `uploadDocument` (→ `uploads/documents`, used by the documents routes) are both built from it. Filenames are `crypto.randomUUID()` + original extension. `app.ts` serves `uploads/` statically at `/uploads`, so a stored `image`/`file` field becomes `${API_URL}/uploads/<folder>/<filename>`.

## Conventions

- ESM with `"module": "nodenext"` — internal relative imports must include the `.js` extension even though the source is `.ts` (e.g. `import { getDatabase } from "../database.js"`).
- Route/controller files are named `<resource>.routes.ts` / `<resource>.controller.ts`; a sub-resource nested under another (e.g. maintenance staff) follows `<parent>-<child>.*`.
- Controllers use `type Request, Response` imports (type-only) and read straight off `req.body`/`req.params`/`req.session` — no validation library is wired in, so don't assume payloads are checked before use beyond the `Number(...)`/`new Date(...)` coercion controllers do on the way in.
- Mongo round-trips an unset optional field as explicit `null`, not a missing key — the frontend normalizes this on the way in (`stripNulls` in `Propora/src/api/config.ts`); keep that in mind if you add a new optional field.
