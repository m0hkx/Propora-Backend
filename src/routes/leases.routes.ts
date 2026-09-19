import { Router } from "express";
import {
    getLeases,
    insertLease,
    getLease,
    updateLease,
    deleteLease
} from "../controllers/leases.controller.js";

const router = Router();

router.get("/", getLeases);
router.post("/", insertLease);
router.get("/:id", getLease);
router.put("/:id", updateLease);
router.delete("/:id", deleteLease);

export default router;