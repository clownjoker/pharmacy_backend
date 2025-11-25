// src/routes/inventory.routes.js
import express from "express";
import db from "../db.js";


const router = express.Router();

/**
 * GET /api/inventory
 * يرجّع قائمة المخزون
 */
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT 
        id,
        name,
        sku,
        category,
        quantity,
        min_qty AS minQty,
        expiry_date AS expiryDate
      FROM inventory_products
      WHERE deleted = 0
      ORDER BY name ASC
      `
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error("GET /api/inventory error:", err);
    return res
      .status(500)
      .json({ success: false, message: "خطأ أثناء جلب بيانات المخزون" });
  }
});

/**
 * POST /api/inventory/:id/adjust
 * body: { type: 'in' | 'out', quantity: number }
 * تعديل كمية منتج معيّن
 */
router.post("/:id/adjust", async (req, res) => {
  const { id } = req.params;
  const { type, quantity } = req.body;

  try {
    const q = Number(quantity);
    if (!q || q <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "أدخل كمية صحيحة" });
    }

    if (!["in", "out"].includes(type)) {
      return res
        .status(400)
        .json({ success: false, message: "نوع العملية غير صحيح" });
    }

    // جلب الكمية الحالية
    const [rows] = await db.query(
      `
      SELECT id, quantity 
      FROM inventory_products 
      WHERE id = ? AND deleted = 0
      `,
      [id]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "المنتج غير موجود" });
    }

    const currentQty = Number(rows[0].quantity);
    const newQty = type === "in" ? currentQty + q : currentQty - q;

    if (newQty < 0) {
      return res.status(400).json({
        success: false,
        message: "لا يمكن أن تكون الكمية أقل من صفر",
      });
    }

    // تحديث الكمية
    await db.query(
      `
      UPDATE inventory_products
      SET quantity = ?
      WHERE id = ?
      `,
      [newQty, id]
    );

    // جلب المنتج بعد التحديث
    const [updated] = await db.query(
      `
      SELECT 
        id,
        name,
        sku,
        category,
        quantity,
        min_qty AS minQty,
        expiry_date AS expiryDate
      FROM inventory_products
      WHERE id = ?
      `,
      [id]
    );

    return res.json({
      success: true,
      message: "تم تعديل الكمية",
      data: updated[0],
    });
  } catch (err) {
    console.error("POST /api/inventory/:id/adjust error:", err);
    return res.status(500).json({
      success: false,
      message: "خطأ أثناء تعديل المخزون",
    });
  }
});

export default router;
