import { Router } from "express";
import {
  currentShift,
  getAllShifts,
  start,
  close,
} from "../controllers/shifts.controller.js";

const router = Router();

router.get("/current", currentShift);
router.get("/", getAllShifts);
router.post("/start", start);
router.post("/close", close);

export default router;
