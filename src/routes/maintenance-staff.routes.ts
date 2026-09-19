import { Router } from "express";
import {
    getMaintenanceStaff,
    insertMaintenanceStaff,
    getMaintenanceStaffMember,
    updateMaintenanceStaff,
    updateMaintenanceStaffStatus
} from "../controllers/maintenance-staff.controller.js";

const router = Router();

router.get("/", getMaintenanceStaff);
router.post("/", insertMaintenanceStaff);
router.get("/:id", getMaintenanceStaffMember);
router.put("/:id", updateMaintenanceStaff);
router.patch("/:id/status", updateMaintenanceStaffStatus);

export default router;