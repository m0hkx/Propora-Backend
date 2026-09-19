# API reference

Base URL (dev): `http://localhost:3000`. All request/response bodies are JSON
unless noted as `multipart/form-data`. All protected routes require the
session cookie described in [02-authentication.md](./02-authentication.md) —
send `credentials: "include"`.

Every list/get/update/delete on every resource below is implicitly scoped to
the authenticated user; a call to `GET /properties/:id` for a property that
exists but belongs to someone else returns `404`, the same as if it didn't
exist.

- [Users](#users) — `/users` (public)
- [Properties](#properties) — `/properties`
- [Units](#units) — `/units`
- [Tenants](#tenants) — `/tenants`
- [Leases](#leases) — `/leases`
- [Payments](#payments) — `/payments`
- [Maintenance](#maintenance) — `/maintenance`
- [Maintenance staff](#maintenance-staff) — `/maintenance/staff`
- [Documents](#documents) — `/documents`
- [Notifications](#notifications) — `/notifications`
- [Dashboard](#dashboard) — `/dashboard`

---

## Users

Base path `/users`. No route on this router requires a session — see
[02-authentication.md](./02-authentication.md#public-vs-protected-routes) for
why each one is public.

### `POST /users/register`

Creates an account and immediately logs the caller in (sets the session
cookie).

**Body**

```json
{ "username": "jane", "email": "jane@example.com", "password": "••••••••" }
```

All three fields are required.

**Responses**

| Status | Body |
| ------ | ---- |
| `201` | `{ "message": "User created successfully", "user": { "id", "name", "email" } }` |
| `400` | `{ "message": "Username, email and password are required" }` |
| `409` | `{ "message": "Username or email already in use" }` — checked against both fields |

### `POST /users/login`

**Body** — either identifier works:

```json
{ "username": "jane", "password": "••••••••" }
```
```json
{ "email": "jane@example.com", "password": "••••••••" }
```

**Responses**

| Status | Body |
| ------ | ---- |
| `200` | `{ "message": "Logged in successfully", "user": { "id", "name", "email" } }` |
| `401` | `{ "message": "Invalid username or password" }` — same message whether the account doesn't exist or the password is wrong |

### `POST /users/logout`

No body. Destroys the server-side session and clears the `connect.sid` cookie.

| Status | Body |
| ------ | ---- |
| `200` | `{ "message": "Logged out successfully" }` |
| `500` | `{ "message": "Logout failed" }` |

### `GET /users/session`

The frontend's "am I logged in" check — call this on boot.

| Status | Body |
| ------ | ---- |
| `200` | `{ "user": { "id", "name", "email" } }` |
| `401` | `{ "message": "Not authenticated" }` — no session, or the session's user no longer exists |

### `GET /users/:id`

⚠️ **Quirk to know before using this route:** despite the `:id` name, this
looks the user up **by `username`**, not by Mongo `_id`:

```ts
users.findOne({ username: req.params.id }, { projection: { password: 0 } });
```

It also returns the **raw Mongo document** (password field excluded, but
`_id` present as `_id`, not run through `withId`) under a `result` key rather
than the `user` shape every other user route uses:

| Status | Body |
| ------ | ---- |
| `200` | `{ "result": { "_id", "username", "email", ... } }` — or `{ "result": null }` if no user has that username |

---

## Properties

Base path `/properties` (protected).

### `GET /properties`

Lists every property owned by the caller.

`200` → `{ "properties": Property[] }` (see [03-data-model.md](./03-data-model.md#properties))

### `POST /properties`

`multipart/form-data` — the image, if any, is the field `image`.

**Fields**: `name, type, status, description, address, city, country, postal,
totalUnits, yearBuilt?, floors?, size?, baseRent, buyPrice?, expectedRevnue?,
monthlyExpenses?` (numeric fields are coerced with `Number(...)`, missing
required numbers default to `0`).

| Status | Body |
| ------ | ---- |
| `201` | `{ "message": "Property created successfully", "propertyId", "property": Property }` |

### `GET /properties/:id`

| Status | Body |
| ------ | ---- |
| `200` | `{ "property": Property }` |
| `400` | `{ "message": "Invalid property id" }` |
| `404` | `{ "message": "Property not found" }` |

### `PUT /properties/:id`

`multipart/form-data`, same optional `image` field. Body fields are a
**partial patch** — only keys present in the request are updated; omitted
fields are left untouched (not cleared).

Response shape matches `GET /properties/:id`.

### `PATCH /properties/:id/status`

**Body**: `{ "status": "Active" }`

Response shape matches `GET /properties/:id`.

### `DELETE /properties/:id`

| Status | Body |
| ------ | ---- |
| `200` | `{ "message": "Property deleted successfully" }` |
| `404` | `{ "message": "Property not found" }` |

---

## Units

Base path `/units` (protected). Units are nested under a property for listing
and creation, flat by id for everything else.

### `GET /units/properties/:propertyId/units`

| Status | Body |
| ------ | ---- |
| `200` | `{ "units": Unit[] }` |
| `400` | `{ "message": "Invalid property id" }` |

### `POST /units/properties/:propertyId/units`

Verifies the property exists **and belongs to the caller** before inserting.

**Body**: `name, floor?, type, bedrooms, bathrooms, size?, rent, status,
notes?`

| Status | Body |
| ------ | ---- |
| `201` | `{ "message": "Unit created successfully", "unit": Unit }` |
| `400` | `{ "message": "Invalid property id" }` |
| `404` | `{ "message": "Property not found" }` |

### `GET /units/:id`

| Status | Body |
| ------ | ---- |
| `200` | `{ "unit": Unit }` |
| `400` / `404` | invalid id / not found |

### `PUT /units/:id`

Partial patch — same semantics as properties. Response matches `GET /units/:id`.

### `PATCH /units/:id/status`

**Body**: `{ "status": "Occupied" }`. Response matches `GET /units/:id`.

### `DELETE /units/:id`

`200` → `{ "message": "Unit deleted successfully" }`

---

## Tenants

Base path `/tenants` (protected).

### `GET /tenants`

`200` → `{ "tenants": Tenant[] }`

### `POST /tenants`

**Body**: `name, email, phone?, propertyId, unit, unitId?, beds, leaseStart?,
leaseEnd, rent, status`. `leaseStatus` is forced to `"Active"`,
`paymentStatus` to `"Paid"`, `paymentDate` to `"—"` — these cannot be set on
create. `phone` defaults to `"—"` and `leaseStart` defaults to today if
omitted/empty.

Also inserts a `notifications` row (`kind: "tenant"`).

`201` → `{ "message": "Tenant created successfully", "tenant": Tenant }`

### `GET /tenants/:id`

`200` → `{ "tenant": Tenant }` / `400` / `404`

### `PUT /tenants/:id`

Partial patch. Unlike create, every field including `leaseStatus`,
`paymentStatus`, and `paymentDate` **can** be updated here.

### `DELETE /tenants/:id`

`200` → `{ "message": "Tenant deleted successfully" }`

---

## Leases

Base path `/leases` (protected).

### `GET /leases`

`200` → `{ "leases": Lease[] }`

### `POST /leases`

**Body**: `propertyId, tenantId, unitId?, start, end, rent, deposit`. `status`
is always forced to `"Active"` on create.

`201` → `{ "message": "Lease created successfully", "lease": Lease }`

### `GET /leases/:id`

`200` → `{ "lease": Lease }` / `400` / `404`

### `PUT /leases/:id`

Partial patch — `status` **is** editable here (e.g. to move a lease to
`"Expiring"`/`"Expired"`), unlike on create.

### `DELETE /leases/:id`

`200` → `{ "message": "Lease deleted successfully" }`

---

## Payments

Base path `/payments` (protected).

### `GET /payments`

`200` → `{ "payments": Payment[] }` — `date` is returned as a `YYYY-MM-DD`
string.

### `POST /payments`

**Body**: `tenantId, propertyId, amount, date, method, status, leaseId,
period`.

`201` → `{ "message": "Payment created successfully", "payment": Payment }`

### `GET /payments/:id`

`200` → `{ "payment": Payment }` / `400` / `404`

### `PUT /payments/:id`

Partial patch of `method, status, amount, date, tenantId, propertyId`.

**Side effect**: if this call sets `status` to `"Overdue"`, a `notifications`
row is inserted (`kind: "payment"`, detail includes the amount).

### `DELETE /payments/:id`

`200` → `{ "message": "Payment deleted successfully" }`

---

## Maintenance

Base path `/maintenance` (protected). Mounted **after** `/maintenance/staff`
in `app.ts` — see [01-architecture.md](./01-architecture.md#request-lifecycle).

### `GET /maintenance`

`200` → `{ "maintenance": MaintenanceRequest[] }`

### `POST /maintenance`

**Body**: `propertyId, scope, unitIds?, tenantIds?, title, description,
category, priority, scheduledDate?, assigneeId?, estimatedCost`. `status` is
forced to `"Open"`; `reported` is set server-side to today; `history` is
initialized with `"Request created"` (plus `"Assigned to <name>"` if
`assigneeId` was provided).

Also inserts a `notifications` row (`kind: "maintenance"`).

`201` → `{ "message": "Maintenance request created successfully", "request": MaintenanceRequest }`

### `GET /maintenance/:id`

`200` → `{ "request": MaintenanceRequest }` / `400` / `404`

### `PUT /maintenance/:id`

Partial patch of `scope, title, description, category, priority, status,
scheduledDate, completedDate, estimatedCost, actualCost, propertyId,
unitIds[], tenantIds[]`. Unlike the dedicated status endpoints below, this
does **not** append a `history` entry.

### `PATCH /maintenance/:id/assignee`

**Body**: `{ "assigneeId": "<staff id>" }` or `{ "assigneeId": null }` to
unassign. Looks up the staff member's name and appends a `history` entry
(`"Reassigned to <name>"` or `"Unassigned"`).

`200` → `{ "request": MaintenanceRequest }`

### `PATCH /maintenance/:id/status`

**Body**: `{ "status": "In Progress" }`. Appends a `"Status changed to
<status>"` history entry. The first time a request leaves `"Open"`,
`scheduledDate` is auto-set to today if it wasn't already set. If `status` is
`"Completed"`, `completedDate` is set to today and `actualCost` defaults to
`estimatedCost` if not already set.

### `POST /maintenance/:id/pause`

Shortcut for `PATCH /:id/status` with `status: "Paused"`. No body needed.

### `POST /maintenance/:id/resume`

Shortcut for `status: "In Progress"`.

### `POST /maintenance/:id/complete`

Shortcut for `status: "Completed"` — same cost/completedDate defaulting as
above.

### `DELETE /maintenance/:id`

`200` → `{ "message": "Maintenance request deleted successfully" }`

---

## Maintenance staff

Base path `/maintenance/staff` (protected).

### `GET /maintenance/staff`

`200` → `{ "staff": StaffMember[] }`

### `POST /maintenance/staff`

**Body**: `name, phone?, email, specialty, status?`. `status` defaults to
`"Active"`.

`201` → `{ "message": "Staff member created successfully", "staff": StaffMember }`

### `GET /maintenance/staff/:id`

`200` → `{ "staff": StaffMember }` / `400` / `404`

### `PUT /maintenance/staff/:id`

Partial patch of `name, phone, email, specialty, status`.

### `PATCH /maintenance/staff/:id/status`

**Body**: `{ "status": "Inactive" }`

### `DELETE /maintenance/staff/:id`

`200` → `{ "message": "Staff member deleted successfully" }`

---

## Documents

Base path `/documents` (protected).

### `GET /documents`

`200` → `{ "documents": Document[] }`

### `POST /documents`

`multipart/form-data`, file field `file`.

**Fields**: `name, propertyId, unit, tenantId?, leaseId?, type,
expirationDate?, description?`. Server computes `size` (human-readable, from
the uploaded file's byte size), `file` (stored filename), `uploadedBy` (the
session user's username), and `uploadDate` (today); `status` is forced to
`"Active"`.

`201` → `{ "message": "Document created successfully", "document": Document }`

### `GET /documents/:id`

`200` → `{ "document": Document }` / `400` / `404`

### `PUT /documents/:id`

Partial patch of `name, propertyId, unit, tenantId, leaseId, type,
expirationDate, status, description`. Does not accept a new file — there's no
re-upload path, only metadata edits.

### `PATCH /documents/:id/archive`

No body. Sets `status` to `"Archived"`.

### `DELETE /documents/:id`

`200` → `{ "message": "Document deleted successfully" }` — this removes the
database record only; the file on disk under `uploads/documents/` is **not**
deleted.

---

## Notifications

Base path `/notifications` (protected). Read-only from the client's
perspective — every row is created as a side effect elsewhere (see
[03-data-model.md](./03-data-model.md#notifications)), so there is no `POST`.

### `GET /notifications`

Sorted newest-first (`time` descending).

`200` → `{ "notifications": Notification[] }`

### `PATCH /notifications/:id/read`

`200` → `{ "notification": Notification }` / `400` / `404`

### `PATCH /notifications/read-all`

No body. Marks every currently-unread notification for the caller as read.

`200` → `{ "message": "All notifications marked as read" }`

---

## Dashboard

Base path `/dashboard` (protected).

### `GET /dashboard`

Aggregate counters for the overview screen — computed live on every call
(no caching):

```json
{
  "totalProp": 18,
  "totalunits": 142,
  "monthlyRevenue": 124850
}
```

| Field | Definition |
| ----- | ---------- |
| `totalProp` | count of the caller's `properties` documents |
| `totalunits` | count of the caller's `units` documents (note the lowercase "units" — this is the literal field name returned by the API) |
| `monthlyRevenue` | sum of `amount` across the caller's `payments` where `status === "Paid"` and `date` falls within the current calendar month (server clock, not client-supplied) |
