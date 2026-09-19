import { Router } from "express";
import {
    getPropertyUnits,
    insertUnit,
    getUnit,
    updateUnit,
    updateUnitStatus,
    deleteUnit
} from "../controllers/units.controller.js";

const router = Router();

router.get("/properties/:propertyId/units", getPropertyUnits);
router.post("/properties/:propertyId/units", insertUnit);

router.get("/:id", getUnit);
router.put("/:id", updateUnit);
router.patch("/:id/status", updateUnitStatus);
router.delete("/:id", deleteUnit);

export default router;