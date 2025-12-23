import express from "express";
import * as c from "../controllers/cashier.controller.js";

const router = express.Router();
router.post("/invoice", c.createInvoice);
router.post("/item", c.addItem);
router.delete("/item/:id", c.removeItem);
router.post("/checkout", c.checkout);
router.get("/summary", c.shiftSummary);
export default router;
