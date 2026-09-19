# Propora-API — Documentation

Propora-API is the backend for [Propora](../../Propora): a multi-tenant REST API
for property management — properties, units, tenants, leases, payments,
maintenance, documents, and notifications — sitting on Express 5 and MongoDB,
with session-cookie authentication.

## Read in this order

| Doc | What it answers |
| --- | ---------------- |
| [01-architecture.md](./01-architecture.md) | How the API is put together: layers, request lifecycle, multi-tenancy, file uploads |
| [02-authentication.md](./02-authentication.md) | How sessions work, which routes are public, and how to authenticate a client |
| [03-data-model.md](./03-data-model.md) | Every MongoDB collection, its document shape, and how resources relate |
| [04-api-reference.md](./04-api-reference.md) | The full endpoint reference — every route, request body, and response shape |
| [05-conventions-and-errors.md](./05-conventions-and-errors.md) | Error shapes, status codes, and the conventions every controller follows |

## 60-second orientation

```
src/app.ts                  boot: connect to MongoDB, wire middleware, mount routers
  ├── middleware/auth.ts     protect() — 401s any request without a session
  ├── middleware/upload.ts   multer factories for property images & documents
  ├── database.ts            single MongoClient, "property_management" database
  ├── lib/serialize.ts       withId() / parseId() — every controller's response shape
  ├── routes/*.routes.ts     Router per resource: verb + path → controller
  └── controllers/*.ts       one function per route; talks to MongoDB directly
```

**The one rule that explains most of the design:** there is no service or
repository layer — controllers call `getDatabase().collection(name)` directly.
This keeps the API small and easy to read end to end, at the cost of some
repetition (`new ObjectId(req.session.userId)` appears in nearly every
controller). See [01-architecture.md](./01-architecture.md) for why, and what
you'd extract first if this grew.

## Commands

```bash
npm run dev     # tsx --watch src/app.ts — dev server with reload, port 3000
npm run start   # tsx src/app.ts — no watch
```

There is no `build`, `lint`, or working `test` script — see this repo's
[README.md](../README.md) for environment variables and setup.
