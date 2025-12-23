import express from "express";
import {
  getSales,
  getSaleById,
  createSale,
  deleteSale,
} from "../controllers/sales.controller.js";

const router = express.Router();

router.get("/", getSales);
router.get("/:id", getSaleById);
router.post("/", createSale);
router.delete("/:id", deleteSale);

export default router;
