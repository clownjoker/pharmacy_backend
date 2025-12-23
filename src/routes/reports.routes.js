import express from "express";
import * as c from "../controllers/reports.controller.js";

const router = express.Router();
router.get("/overview", c.overview);
router.get("/sales", c.salesReport);
router.get("/stock", c.stockReport);
router.get("/profit", c.profitReport);
router.get("/alerts", c.alertsReport);
export default router;
