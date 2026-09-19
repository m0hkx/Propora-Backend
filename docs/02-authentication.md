# Authentication

Propora-API uses classic **session-cookie** authentication — no JWTs, no
bearer tokens, no refresh flow. This document covers how it works and exactly
which routes require it.

## How a session is established

1. A client calls `POST /users/register` or `POST /users/login`.
2. On success, the controller sets `req.session.userId = <mongo id string>`.
3. `express-session` serializes the session and sends a `Set-Cookie` header —
   the default cookie name is `connect.sid`.
4. Every subsequent request from that client must send the cookie back
   (`fetch(url, { credentials: "include" })` on the frontend, since the API
   and the frontend run on different ports/origins in development).

The session itself is held in the server's default in-memory `MemoryStore`
(no Redis/Mongo session store is configured) — sessions do not survive a
server restart, and this does not scale across multiple server instances.
That's an accepted trade-off for a single-process dev/portfolio deployment;
swapping in `connect-mongo` or similar would be the first change needed for a
multi-instance production deployment.

## Cookie configuration

```ts
app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // dev only — set true behind HTTPS in production
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    },
  })
);
```

`secure: false` is intentional for local HTTP development; deploying behind
HTTPS requires flipping this to `true` (and setting `sameSite` appropriately
if the frontend and API end up on different top-level domains in production).

## The `protect` middleware

```ts
export async function protect(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}
```

`protect` is mounted per-router in `app.ts` — it's not global middleware, so
whether a route needs a session is a one-line, explicit decision at the mount
point (see [01-architecture.md](./01-architecture.md#request-lifecycle)).

## Public vs. protected routes

| Router | Mounted with `protect`? | Notes |
| ------ | :----------------------: | ----- |
| `/users` | ❌ | Every route on this router is intentionally public — see below |
| `/properties` | ✅ | |
| `/units` | ✅ | |
| `/tenants` | ✅ | |
| `/leases` | ✅ | |
| `/payments` | ✅ | |
| `/maintenance` + `/maintenance/staff` | ✅ | |
| `/documents` | ✅ | |
| `/notifications` | ✅ | |
| `/dashboard` | ✅ | |

Within `/users`, every route is public by necessity or design:

| Route | Why it's public |
| ----- | ---------------- |
| `POST /users/register` | You can't be authenticated before you have an account |
| `POST /users/login` | Same — this *is* the authentication step |
| `POST /users/logout` | Destroying a session doesn't require re-proving you hold it |
| `GET /users/session` | The frontend polls this on boot to check *whether* a session exists; it returns `401` itself if there isn't one |
| `GET /users/:id` | Looks up a user by **username**, with the password field projected out — see the note in [04-api-reference.md](./04-api-reference.md#get-usersid) |

## Client integration checklist

A frontend (or any HTTP client) consuming this API needs to:

1. Send `credentials: "include"` (fetch) or `withCredentials: true` (axios) on
   every request, including `GET /users/session`.
2. Register or log in once to receive the cookie.
3. Call `GET /users/session` on boot to know whether a stored cookie is still
   valid, rather than assuming.
4. Treat a `401` from *any* protected route as "session expired, redirect to
   login" — there is no token refresh to attempt first.
