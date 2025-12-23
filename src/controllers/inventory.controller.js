import {
  getInventory,
  getInventoryMovements,
} from "../services/inventory.service.js";

export const fetchInventory = async (req, res) => {
  try {
    const data = await getInventory();
    res.json(data);
  } catch (err) {
    console.error("getInventory error:", err);
    res.status(500).json({ message: "خطأ في جلب المخزون" });
  }
};

export const fetchInventoryMovements = async (req, res) => {
  try {
    const data = await getInventoryMovements();
    res.json(data);
  } catch (err) {
    console.error("getInventoryMovements error:", err);
    res.status(500).json({ message: "خطأ في جلب سجل المخزون" });
  }
};
