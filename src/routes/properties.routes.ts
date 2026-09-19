import { Router } from "express";
import { 
    getProperties, 
    insertProperties, 
    getProperty,
    updateProperty,
    updatePropertyStatus,
    deleteProperty
} from "../controllers/properties.controller.js";

const router = Router();

router.get("/", getProperties)
router.post("/", insertProperties)
router.get("/:id", getProperty)
router.put("/:id", updateProperty)
router.patch("/:id/status", updatePropertyStatus)
router.delete("/:id", deleteProperty)

export default router;