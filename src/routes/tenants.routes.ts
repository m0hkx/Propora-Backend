import { Router } from "express";
import {
    getTenants,
    insertTenant,
    getTenant,
    updateTenant,
    deleteTenant
} from "../controllers/tenants.controller.js";

const router = Router();

router.get("/", getTenants);
router.post("/", insertTenant);
router.get("/:id", getTenant);
router.put("/:id", updateTenant);
router.delete("/:id", deleteTenant);

export default router;