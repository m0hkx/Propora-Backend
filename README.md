<div align="center">

# Propora-API

### The backend behind Propora — property management, made legible.

A multi-tenant REST API for property management: properties, units, tenants,
leases, payments, maintenance, staff, and documents, with session-cookie
authentication and MongoDB persistence.

![Express](https://img.shields.io/badge/express-5-0F766E?style=flat-square&logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-ESM-0F766E?style=flat-square&logo=typescript&logoColor=white)
![MongoDB](https://img.shields.io/badge/mongodb-native_driver-0F766E?style=flat-square&logo=mongodb&logoColor=white)
![Node.js](https://img.shields.io/badge/node-ESM-0F766E?style=flat-square&logo=node.js&logoColor=white)

**`REST API · SESSION AUTH · MULTI-TENANT`**

</div>

---

## What it does

| Resource | Endpoints |
| -------- | --------- |
| **Users** | register, login, logout, session check, lookup by username |
| **Properties** | CRUD + status transitions, image upload |
| **Units** | nested under a property, CRUD + status transitions |
| **Tenants** | CRUD, auto-notifies on create |
| **Leases** | CRUD, tenant/property/unit-linked |
| **Payments** | CRUD, auto-notifies on overdue status |
| **Maintenance** | CRUD + assignment, pause/resume/complete lifecycle with a full history trail, auto-notifies on create |
| **Maintenance staff** | CRUD + status |
| **Documents** | CRUD + file upload + archive |
| **Notifications** | list, mark-read, mark-all-read — read-only; every row is a side effect of another mutation |
| **Dashboard** | live aggregate counters (properties, units, monthly revenue) |

Every resource is scoped to the authenticated user — one Mongo database, one
`userId` filter on every query, no cross-tenant reads possible. Full endpoint
reference: [`docs/04-api-reference.md`](./docs/04-api-reference.md).

## Tech stack

| Layer | Choice |
| ----- | ------ |
| Runtime | Node.js, native ESM (`"module": "nodenext"`) |
| Framework | Express 5 |
| Language | TypeScript, run directly via `tsx` (no build step in dev) |
| Database | MongoDB, official driver — no ODM |
| Auth | `express-session` (cookie-based) + `bcryptjs` password hashing |
| Uploads | `multer`, disk storage, served statically at `/uploads` |
| CORS | locked to the frontend's dev origin, credentialed |

## Getting started

Requires a MongoDB connection (Atlas or local) and a session secret.

```bash
npm install
cp .env.example .env   # fill in the values below
npm run dev             # tsx --watch src/app.ts — http://localhost:3000
```

### Environment variables

| Variable | Required | Notes |
| -------- | :------: | ----- |
| `MONGODB_URI` | ✅ | full connection string (Atlas SRV or local) |
| `MONGODB_USERNAME` / `MONGODB_PASSWORD` | — | alternative to embedding credentials directly in `MONGODB_URI`, depending on how your connection string is templated |
| `SESSION_SECRET` | ✅ | signs the session cookie — any long random string |

The server listens on a hardcoded port `3000`, and CORS is locked to
`http://localhost:5173` (the [frontend](../Propora)'s Vite dev server) with
credentials enabled. Update `src/app.ts` if you need a different frontend
origin or port.

```bash
npm run dev     # dev server with reload (tsx --watch)
npm run start   # dev server, no reload
```

There is no `build`, `lint`, or working `test` script — this is a `tsx`-run
dev service, not a compiled deployable, unless a build step is added
deliberately.

## Project structure

```
src/
├── app.ts                      # boot: connect DB, wire middleware, mount routers
├── database.ts                 # single MongoClient, "property_management" db
├── lib/serialize.ts            # withId() / parseId() — shared response shaping
├── middleware/
│   ├── auth.ts                 # protect() — 401s unauthenticated requests
│   └── upload.ts               # multer factories for images & documents
├── routes/*.routes.ts          # one Router per resource
├── controllers/*.controller.ts # one function per route handler
└── types/express-session.d.ts  # augments SessionData with userId
```

## Documentation

Full written docs live in [`docs/`](./docs) — architecture, authentication,
the data model, and the complete API reference:

| Doc | Covers |
| --- | ------ |
| [`docs/01-architecture.md`](./docs/01-architecture.md) | Layers, request lifecycle, multi-tenancy, file uploads |
| [`docs/02-authentication.md`](./docs/02-authentication.md) | Sessions, cookies, public vs. protected routes |
| [`docs/03-data-model.md`](./docs/03-data-model.md) | Every collection's document shape and relationships |
| [`docs/04-api-reference.md`](./docs/04-api-reference.md) | Every endpoint — method, body, response, status codes |
| [`docs/05-conventions-and-errors.md`](./docs/05-conventions-and-errors.md) | Error shapes, status codes, patch semantics, known trade-offs |

An empty Postman workspace scaffold lives under [`postman/`](./postman)
(global variables only, no requests yet) if you want to build a manual-testing
collection against a running server.

## Related repositories

Part of the Propora portfolio project — see the
[top-level README](../README.md) for the full picture.

| Repo | Role |
| ---- | ---- |
| [Propora](../Propora) | The dashboard that consumes this API |
| [ProporaWebsite](../ProporaWebsite) | The marketing site |

---

<div align="center">

Built as a portfolio case study in backend design — every route above is real
and running, not a mock.

</div>
