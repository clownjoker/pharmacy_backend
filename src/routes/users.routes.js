import express from "express";
import * as c from "../controllers/users.controller.js";
import { listUsers } from "../controllers/users.controller.js";
const router = express.Router();
router.get("/", c.listUsers);
router.post("/", c.createUser);
router.patch("/:id/toggle", c.toggleUser);
router.delete("/:id", c.deleteUser);
export default router;
