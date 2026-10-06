<div align="center">

# Propora API

**The backend behind Propora — property management, made legible.**

A REST API for properties, units, tenants, leases, payments, maintenance and documents, with session login and MongoDB storage.

![Express](https://img.shields.io/badge/Express-5-0F766E?style=flat-square&logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-ESM-0F766E?style=flat-square&logo=typescript&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-native_driver-0F766E?style=flat-square&logo=mongodb&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-ESM-0F766E?style=flat-square&logo=nodedotjs&logoColor=white)

**[📖 Full documentation →](../docs/README.md)**

</div>

## About

- **58 endpoints** across 11 resources.
- **Private accounts:** every record is tagged with its owner, and every query filters by the logged-in user.
- **Session login:** an `httpOnly` cookie, with passwords hashed by `bcryptjs`.
- **Automatic rent:** a daily job bills each month's rent and marks late payments as overdue.
- **File uploads** for property photos and documents.

## Getting started

You'll need Node.js and a MongoDB connection string (for example, a free MongoDB Atlas cluster).

```bash
npm install
cp .env.example .env   # fill in the values below
npm run seed           # create the demo account
npm run dev            # http://localhost:3000
```

| Variable | What it does |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string |
| `SESSION_SECRET` | Any long random string, used to sign the cookie |
| `CORS_ORIGIN` | Web app address(es), e.g. `http://localhost:5173` |

## Demo account

| Email | Password |
| --- | --- |
| `demo@propora.dev` | `Demo1234!` |

Run `npm run seed -- --reset` to wipe the demo data and create it again.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start with auto-reload |
| `npm run start` | Start without reload |
| `npm run seed` | Create the demo account and sample data |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start:prod` | Run the compiled build |

## Project structure

```
src/
├── app.ts         start-up: database, middleware, routes
├── routes/        one router per resource
├── controllers/   one function per endpoint
├── middleware/    login check and file uploads
├── jobs/          the daily rent job
├── lib/           rent rules and response helpers
└── scripts/       demo-data seed
```

## Learn more

The [main documentation](https://github.com/m0hkx/Propora/blob/main/docs/README.md) covers everything else:

- [API reference](https://github.com/m0hkx/Propora/blob/main/docs/06-api-reference.md): every endpoint
- [Database design](https://github.com/m0hkx/Propora/blob/main/docs/05-database-design.md) and [system design](https://github.com/m0hkx/Propora/blob/main/docs/04-system-design.md)
- [Full setup guide](https://github.com/m0hkx/Propora/blob/main/docs/08-getting-started.md)

**Frontend:** [Propora-Frontend](https://github.com/m0hkx/Propora-Frontend)
