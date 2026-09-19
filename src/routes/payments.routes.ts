import { Router } from "express";
import {
    getPayments,
    insertPayment,
    getPayment,
    updatePayment,
    deletePayment
} from "../controllers/payments.controller.js";

const router = Router();

router.get("/", getPayments);
router.post("/", insertPayment);
router.get("/:id", getPayment);
router.put("/:id", updatePayment);
router.delete("/:id", deletePayment);

export default router;