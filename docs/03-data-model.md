# Data model

Database: `property_management` (MongoDB, native driver, no schema
enforcement — the shapes below are what the controllers write and read, not a
declared schema). Every collection except `users` carries a `userId:
ObjectId` on every document, used to scope every query to the logged-in user
(see [01-architecture.md § Multi-tenancy](./01-architecture.md#multi-tenancy)).

All API responses run documents through `withId` (see
[01-architecture.md](./01-architecture.md#response-shaping--withid--parseid)):
`_id` → `id: string`, `userId` is dropped. Fields below are listed as they
appear **in the API response** unless noted "stored only".

## `users`

| Field | Type | Notes |
| ----- | ---- | ----- |
| `id` | `string` | |
| `name` | `string` | stored as `username` in the collection |
| `email` | `string` | |
| `password` | *(stored only)* | bcrypt hash, `SALT_ROUNDS = 10`; never returned by any route |

## `properties`

| Field | Type | Notes |
| ----- | ---- | ----- |
| `id` | `string` | |
| `name` | `string` | |
| `type` | `string` | |
| `status` | `string` | |
| `description` | `string` | |
| `address`, `city`, `country`, `postal` | `string` | |
| `totalUnits` | `number` | defaults `0` |
| `yearBuilt?`, `floors?`, `size?` | `number` | optional |
| `baseRent` | `number` | defaults `0` |
| `buyPrice?`, `expectedRevnue?`, `monthlyExpenses?` | `number` | optional — note `expectedRevnue` is the real field name (missing an "e"); the API contract preserves this typo rather than silently renaming it |
| `occupied` | `number` | defaults `0` on create; not auto-derived from units |
| `image?` | `string` | uploaded filename (see [01-architecture.md § File uploads](./01-architecture.md#file-uploads)) |
| `createdAt`, `updatedAt` | `Date` | |

## `units`

| Field | Type | Notes |
| ----- | ---- | ----- |
| `id` | `string` | |
| `propertyId` | `string` | parent property; unit routes verify the property belongs to the caller before insert |
| `name` | `string` | |
| `floor?` | `number` | |
| `type` | `string` | |
| `bedrooms`, `bathrooms` | `number` | default `0` |
| `size?` | `number` | |
| `rent` | `number` | defaults `0` |
| `status` | `string` | |
| `notes?` | `string` | |

## `tenants`

| Field | Type | Notes |
| ----- | ---- | ----- |
| `id` | `string` | |
| `name`, `email` | `string` | |
| `phone` | `string` | defaults to `"—"` if empty/omitted |
| `propertyId` | `string` | |
| `unit` | `string` | display label, not a foreign key |
| `unitId?` | `string` | optional link to `units` |
| `beds` | value from request | not coerced to a number by the controller |
| `leaseStart` | `string` (date) | defaults to today (`YYYY-MM-DD`) if empty/omitted |
| `leaseEnd` | `string` (date) | |
| `leaseStatus` | `string` | forced to `"Active"` on create |
| `rent` | `number` | defaults `0` |
| `paymentStatus` | `string` | forced to `"Paid"` on create |
| `paymentDate` | `string` | forced to `"—"` on create |
| `status` | `string` | |

**Side effect on create:** inserts one `notifications` document
(`kind: "tenant"`, title `"New tenant added"`).

## `leases`

| Field | Type | Notes |
| ----- | ---- | ----- |
| `id` | `string` | |
| `propertyId`, `tenantId` | `string` | required |
| `unitId?` | `string` | optional |
| `start`, `end` | `string` (date) | |
| `rent`, `deposit` | `number` | default `0` |
| `status` | `string` | forced to `"Active"` on create |

## `payments`

| Field | Type | Notes |
| ----- | ---- | ----- |
| `id` | `string` | |
| `tenantId`, `propertyId` | `string` | required |
| `amount` | `number` | defaults `0` |
| `date` | `string` (`YYYY-MM-DD`) | stored as a `Date`, serialized back to a date-only ISO string |
| `method`, `status` | `string` | |
| `leaseId` | `string` | not validated as a real lease reference |
| `period` | `string` | e.g. a billing period label |

**Side effect on update:** if a `PUT` sets `status` to `"Overdue"`, inserts one
`notifications` document (`kind: "payment"`).

## `maintenance`

| Field | Type | Notes |
| ----- | ---- | ----- |
| `id` | `string` | |
| `propertyId` | `string` | |
| `scope` | `"property" \| "units" \| "tenants"` | which of `unitIds`/`tenantIds` is meaningful |
| `unitIds` | `string[]` | |
| `tenantIds` | `string[]` | |
| `title`, `description`, `category`, `priority` | `string` | |
| `status` | `string` | forced to `"Open"` on create; see lifecycle below |
| `reported` | `string` (date) | set at creation, server-side |
| `scheduledDate?` | `string` (date) | auto-set the first time status leaves `"Open"` |
| `completedDate?` | `string` (date) | set when status becomes `"Completed"` |
| `assigneeId?` | `string` | references `staff` |
| `estimatedCost` | `number` | defaults `0` |
| `actualCost?` | `number` | defaults to `estimatedCost` when completed without one set |
| `history` | `{ date: string; text: string }[]` | append-only audit trail |

**Status lifecycle** (`Open → In Progress → Paused/Completed`, or directly via
`PATCH /:id/status`): every transition appends a `history` entry. Dedicated
shortcut endpoints (`/pause`, `/resume`, `/complete`) all funnel through the
same internal `setStatus` helper as the generic status endpoint.

**Side effect on create:** inserts one `notifications` document
(`kind: "maintenance"`).

## `staff` (maintenance staff)

| Field | Type | Notes |
| ----- | ---- | ----- |
| `id` | `string` | |
| `name`, `email` | `string` | |
| `phone` | `string` | defaults `""` |
| `specialty` | `string` | |
| `status` | `string` | defaults `"Active"` |

## `documents`

| Field | Type | Notes |
| ----- | ---- | ----- |
| `id` | `string` | |
| `name` | `string` | |
| `propertyId` | `string` | |
| `unit` | `string` | display label |
| `tenantId?` | `string` | optional |
| `leaseId?` | `string` | not validated as a real lease reference |
| `type` | `string` | |
| `size` | `string` | human-formatted (`"12.3 KB"`, `"1.4 MB"`) computed server-side from the uploaded file's byte size |
| `file?` | `string` | uploaded filename |
| `uploadedBy` | `string` | the uploader's `username`, resolved server-side from the session |
| `uploadDate` | `string` (`YYYY-MM-DD`) | set at creation |
| `expirationDate?` | `string` (date) | |
| `status` | `string` | forced to `"Active"` on create; `"Archived"` via the archive endpoint |
| `description` | `string` | defaults `""` |

## `notifications`

| Field | Type | Notes |
| ----- | ---- | ----- |
| `id` | `string` | |
| `kind` | `"tenant" \| "payment" \| "maintenance"` | |
| `title`, `detail` | `string` | |
| `time` | `string` (ISO datetime) | |
| `read` | `boolean` | |
| `link` | `string` | a frontend route/section name (`"Tenants"`, `"Payments"`, `"Maintenance"`) — a UI hint, not a URL |

There is **no insert route** for notifications — every row is created as a
side effect of another mutation (see the "Side effect" notes above). This is
deliberate: notifications always describe something that actually happened,
never an arbitrary client-authored message.

## Entity relationships

```
users (1) ──< properties (1) ──< units
                    │                │
                    │                └──< tenants (via unitId, optional)
                    ├──< tenants (via propertyId)
                    ├──< leases (property + tenant + optional unit)
                    ├──< payments (tenant + property)
                    ├──< maintenance (property + optional units[]/tenants[]/staff assignee)
                    └──< documents (property + optional tenant)

staff (1) ──< maintenance (via assigneeId)
* (any mutation above) ──> notifications (side effect only)
```

Relationships are enforced only where the controller explicitly checks them
(e.g. `insertUnit` verifies the parent property belongs to the caller before
inserting). Most foreign-key-shaped fields (`tenantId`, `leaseId`, `unitId`,
…) are stored as-is without a lookup — the API trusts the frontend to send
valid ids, consistent with there being no schema-validation layer (see
[01-architecture.md](./01-architecture.md#whats-deliberately-not-here)).
