import express, { type Express, type Request, type Response } from 'express';
import session from "express-session";
import cors from "cors";

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
import { protect } from './middleware/auth.js';

const app: Express = express();
const port: number = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === "production";

await connectDatabase();

if (isProduction) {
  app.set("trust proxy", 1);
}

app.use(express.json());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.use("/uploads", express.static("uploads"));

app.use("/users", usersRouter);
app.use("/properties", protect, propertyRouter)
app.use("/units", protect, unitsRouter)
app.use("/tenants", protect, tenantsRouter);
app.use("/leases", protect, leasesRouter);
app.use("/payments", protect, paymentsRouter);
app.use("/maintenance/staff", protect, maintenanceStaffRouter);
app.use("/maintenance", protect, maintenanceRouter);
app.use("/documents", protect, documentsRouter);
app.use("/notifications", protect, notificationsRouter);
app.use("/dashboard", protect, dashboardRouter);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});