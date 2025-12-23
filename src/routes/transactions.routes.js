// src/routes/transactions.routes.js
import express from "express";
import {
  listTransactions,
  addTransaction,
} from "../controllers/transactions.controller.js";

const router = express.Router();

// GET /api/transactions
router.get("/", listTransactions);

// POST /api/transactions
router.post("/", addTransaction);

export default router;
