import {
  getCurrentShift,
  listShifts,
  startShift,
  closeShift,
} from "../services/shifts.service.js";

export async function currentShift(req, res) {
  const data = await getCurrentShift();
  res.json(data);
}

export async function getAllShifts(req, res) {
  const rows = await listShifts();
  res.json(rows);
}

export async function start(req, res) {
  const { userId } = req.body;
  const result = await startShift(userId);

  if (!result.ok) {
    return res.status(400).json({ message: result.message });
  }

  res.json(result);
}

export async function close(req, res) {
  const { userId } = req.body;
  const result = await closeShift(userId);

  if (!result.ok) {
    return res.status(400).json({ message: result.message });
  }

  res.json(result);
}
