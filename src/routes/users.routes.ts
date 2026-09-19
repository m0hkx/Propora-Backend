// routes/users.routes.ts

import { Router } from "express"
import {
  getUser,
  insertUser,
  loginUser
} from "../controllers/users.controller.js"

const router = Router()

router.post("/register", insertUser);
router.post("/login", loginUser);

export default router