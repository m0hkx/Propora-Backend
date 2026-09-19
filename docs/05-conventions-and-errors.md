# Conventions & error handling

## Status codes used across the API

| Status | Meaning here | Example |
| ------ | ------------ | ------- |
| `200` | Successful read, update, or delete | `GET /properties`, `DELETE /tenants/:id` |
| `201` | Successful create | `POST /leases` |
| `400` | A route `:id` param failed `ObjectId.isValid`, or a required field was missing (users only) | `GET /properties/not-an-id` |
| `401` | No session (`protect`), or bad login credentials | any protected route with no cookie |
| `404` | The document doesn't exist **or** exists but belongs to another user | `GET /properties/:id` for someone else's property |
| `409` | Duplicate username/email on register | `POST /users/register` |
| `500` | Only reachable explicitly from `logoutUser`'s session-destroy callback; anything else uncaught falls through to Express's default handler | `POST /users/logout` when the session store errors |

A `404` deliberately **does not distinguish** "doesn't exist" from "exists,
but isn't yours" — this is what makes the multi-tenancy model safe: there's no
way to probe for the existence of another user's data by status code alone.

## Response envelope

There is no single global envelope (no `{ data, error }` wrapper) — every
response is a flat object whose key names the resource:

```json
{ "property": { "...": "..." } }
{ "properties": [ /* ... */ ] }
{ "message": "Property deleted successfully" }
```

Error bodies are always `{ "message": string }` — there is no error `code`
field, no field-level validation error list, and no stack trace exposed. This
is a **contract to code against**, not implementation detail: check `message`
for human display, and the HTTP status for branching logic.

## Partial-patch semantics

Every `PUT` route in this API applies a **partial patch**: it iterates a
fixed allow-list of field names and only writes the ones present on
`req.body`. A field that's `undefined` (omitted from the JSON body) is left
untouched in the document; there is no way to *clear* an optional field back
to "unset" via `PUT` — sending `null` explicitly is required for the fields
that accept it (e.g. `unitId: null`).

```ts
const patch: Record<string, unknown> = {};
const fields = ["name", "type", "status", "notes"] as const;
for (const f of fields) if (req.body[f] !== undefined) patch[f] = req.body[f];
```

This pattern repeats, nearly verbatim, in every `update*` controller.

## Numeric and date coercion

Controllers coerce loosely rather than validating strictly:

- `Number(req.body.x) || 0` — a missing, empty, or non-numeric value silently
  becomes `0` rather than rejecting the request. This applies to most
  required numeric fields (`baseRent`, `rent`, `amount`, `estimatedCost`, …).
- `req.body.x !== undefined ? Number(req.body.x) : undefined` — used for
  *optional* numeric fields, so an omitted field stays `undefined` instead of
  becoming `0`.
- `new Date(req.body.date)` — an unparseable date string produces an
  `Invalid Date`, which is stored as-is and will serialize strangely on the
  way back out. The API does not currently guard against this.

## What's *not* validated

There is no schema-validation library (no Zod/Joi/express-validator) anywhere
in the codebase. Beyond the coercions above and the required-field check on
`POST /users/register`, the API trusts the caller:

- String fields accept any string, including empty strings, wrong enums
  (`status: "banana"`), or missing entirely (stored as `undefined`).
- `ObjectId`-shaped fields (`propertyId`, `tenantId`, …) are wrapped in `new
  ObjectId(...)` without a prior `ObjectId.isValid` check outside of route
  `:id` params — an invalid id in the **body** throws, which (with no global
  error handler) surfaces as an unhandled `500` rather than a clean `400`.

This is an accepted, documented trade-off for a project this size — see
[01-architecture.md § What's deliberately not here](./01-architecture.md#whats-deliberately-not-here)
for what a production hardening pass would add first.

## Naming quirks preserved on purpose

A few field names in the live API don't match what you'd design from scratch.
They're documented rather than silently "corrected" here, because the
documentation's job is to describe the real contract:

- `properties.expectedRevnue` (missing an "e") — see
  [03-data-model.md](./03-data-model.md#properties).
- `GET /dashboard` returns `totalunits` (lowercase) alongside `totalProp`
  (camelCase) — see [04-api-reference.md](./04-api-reference.md#get-dashboard).
- `GET /users/:id` takes a **username**, not a Mongo id, and returns a
  differently-shaped, non-`withId`-normalized body under `result` instead of
  `user` — see [04-api-reference.md](./04-api-reference.md#get-usersid).

## ESM import convention

`tsconfig.json` sets `"module": "nodenext"` — every relative import must
include the `.js` extension, even though the source files are `.ts`:

```ts
import { getDatabase } from "../database.js";
```

This is a Node ESM requirement, not a typo — TypeScript resolves it against
the `.ts` file at compile time but the emitted (or `tsx`-executed) code needs
the real runtime extension.
