import express from "express";
import * as c from "../controllers/pharmacist.controller.js";

const router = express.Router();
router.get("/medicines", c.listMedicines);
router.get("/sales", c.listSales);
router.post("/sale", c.createSale);
export default router;
