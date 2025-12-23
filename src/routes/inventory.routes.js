import express from "express";
import {
  fetchInventory,
  fetchInventoryMovements,
} from "../controllers/inventory.controller.js";

const router = express.Router();

router.get("/", fetchInventory);
router.get("/movements", fetchInventoryMovements);

export default router;
