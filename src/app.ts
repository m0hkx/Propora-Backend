import express, { type Express, type Request, type Response } from 'express';
import session from "express-session";

import usersRouter from "./routes/users.routes.js";
import propertyRouter from "./routes/properties.routes.js";
import unitsRouter from "./routes/units.routes.js";
import tenantsRouter from "./routes/tenants.routes.js";
import leasesRouter from "./routes/leases.routes.js";
import paymentsRouter from "./routes/payments.routes.js";
import maintenanceStaffRouter from "./routes/maintenance-staff.routes.js";
import maintenanceRouter from "./routes/maintenance.routes.js";
import documentsRouter from "./routes/documents.routes.js";
import notificationsRouter from "./routes/notifications.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";

import { connectDatabase } from './database.js';

const app: Express = express();
const port: number = 3000;

await connectDatabase();

app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Change in production
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.use("/users", usersRouter);
app.use("/properties", propertyRouter)
app.use("/units", unitsRouter)
app.use("/tenants", tenantsRouter);
app.use("/leases", leasesRouter);
app.use("/payments", paymentsRouter);
app.use("/maintenance/staff", maintenanceStaffRouter);
app.use("/maintenance", maintenanceRouter);
app.use("/documents", documentsRouter);
app.use("/notifications", notificationsRouter);
app.use("/dashboard", dashboardRouter);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});