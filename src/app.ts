import express, { type Express, type Request, type Response } from 'express';
import session from "express-session";

import usersRouter from "./routes/users.routes.js";

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

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});