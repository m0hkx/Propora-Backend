import { Router } from "express";
import { 
    getProperties, 
    insertProperties, 
    getProperty,
    updateProperty,
    updatePropertyStatus,
    deleteProperty
} from "../controllers/properties.controller.js";

import { upload } from '../middleware/upload.js';

const router = Router();

router.get("/", getProperties)
router.post("/", upload.single("image"), insertProperties)
router.get("/:id", getProperty)
router.put("/:id", upload.single("image"), updateProperty)
router.patch("/:id/status", updatePropertyStatus)
router.delete("/:id", deleteProperty)

export default router;