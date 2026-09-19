import { Router } from "express";
import {
    getMaintenanceRequests,
    insertMaintenanceRequest,
    getMaintenanceRequest,
    updateMaintenanceRequest,
    updateMaintenanceAssignee,
    updateMaintenanceStatus,
    pauseMaintenanceRequest,
    resumeMaintenanceRequest,
    completeMaintenanceRequest,
    deleteMaintenanceRequest
} from "../controllers/maintenance.controller.js";

const router = Router();

router.get("/", getMaintenanceRequests);
router.post("/", insertMaintenanceRequest);
router.get("/:id", getMaintenanceRequest);
router.put("/:id", updateMaintenanceRequest);
router.patch("/:id/assignee", updateMaintenanceAssignee);
router.patch("/:id/status", updateMaintenanceStatus);
router.post("/:id/pause", pauseMaintenanceRequest);
router.post("/:id/resume", resumeMaintenanceRequest);
router.post("/:id/complete", completeMaintenanceRequest);
router.delete("/:id", deleteMaintenanceRequest);

export default router;