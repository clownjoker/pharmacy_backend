import express from "express";
import {
  getProducts,
  createProduct,
  deleteProduct,
} from "../controllers/products.controller.js";

const router = express.Router();

router.get("/", getProducts);
router.post("/", createProduct);
router.delete("/:id", deleteProduct);

export default router;
