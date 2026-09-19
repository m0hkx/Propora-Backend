import { Router } from "express";
import {
    getDocuments,
    insertDocument,
    getDocument,
    updateDocument,
    archiveDocument,
    deleteDocument
} from "../controllers/documents.controller.js";
import { uploadDocument } from "../middleware/upload.js";

const router = Router();

router.get("/", getDocuments);
router.post("/", uploadDocument.single("file"), insertDocument);
router.get("/:id", getDocument);
router.put("/:id", updateDocument);
router.patch("/:id/archive", archiveDocument);
router.delete("/:id", deleteDocument);

export default router;