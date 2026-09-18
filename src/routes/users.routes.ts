// routes/users.routes.ts

import { Router } from "express"
import {
  getUsers,
  getUser
} from "../controllers/users.controller.js"

const router = Router()

router.get("/", getUsers)
router.get("/:id", getUser)

export default router