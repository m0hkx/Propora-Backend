// routes/users.routes.ts

import { Router } from "express"
import {
  getUser,
  insertUser,
  loginUser,
  logoutUser,
  getSession,
} from "../controllers/users.controller.js"

const router = Router()

router.post("/register", insertUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.get("/session", getSession);
router.get("/:id", getUser);

export default router
