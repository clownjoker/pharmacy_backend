// backend/src/routes/products.js
import express from "express";
import db from "../db.js";

const router = express.Router();

/* ============= GET /api/products ============= */
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, name, sku, category, company, purchase_price AS purchasePrice, price, quantity, min_qty AS minQty, expiry_date AS expiryDate FROM products ORDER BY id DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /products error:", err);
    res.status(500).json({ message: "خطأ في جلب المنتجات" });
  }
});

/* ============= GET /api/products/:id ============= */
router.get("/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const [rows] = await db.query(
      "SELECT id, name, sku, category, company, purchase_price AS purchasePrice, price, quantity, min_qty AS minQty, expiry_date AS expiryDate FROM products WHERE id = ?",
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ message: "المنتج غير موجود" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("GET /products/:id error:", err);
    res.status(500).json({ message: "خطأ في جلب المنتج" });
  }
});

/* ============= POST /api/products ============= */
router.post("/", async (req, res) => {
  const {
    name,
    sku,
    category,
    company,
    purchasePrice,
    price,
    quantity,
    minQty,
    expiryDate,
  } = req.body;

  if (!name || !price) {
    return res.status(400).json({ message: "الاسم والسعر مطلوبان" });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO products
      (name, sku, category, company, purchase_price, price, quantity, min_qty, expiry_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        sku || null,
        category || null,
        company || null,
        purchasePrice || 0,
        price,
        quantity || 0,
        minQty || 5,
        expiryDate || null,
      ]
    );

    res.json({
      id: result.insertId,
      name,
      sku,
      category,
      company,
      purchasePrice: purchasePrice || 0,
      price,
      quantity: quantity || 0,
      minQty: minQty || 5,
      expiryDate: expiryDate || null,
    });
  } catch (err) {
    console.error("POST /products error:", err);
    res.status(500).json({ message: "خطأ في إضافة المنتج" });
  }
});

/* ============= PUT /api/products/:id ============= */
router.put("/:id", async (req, res) => {
  const id = req.params.id;
  const {
    name,
    sku,
    category,
    company,
    purchasePrice,
    price,
    quantity,
    minQty,
    expiryDate,
  } = req.body;

  try {
    await db.query(
      `UPDATE products SET
        name = ?,
        sku = ?,
        category = ?,
        company = ?,
        purchase_price = ?,
        price = ?,
        quantity = ?,
        min_qty = ?,
        expiry_date = ?
      WHERE id = ?`,
      [
        name,
        sku || null,
        category || null,
        company || null,
        purchasePrice || 0,
        price || 0,
        quantity || 0,
        minQty || 5,
        expiryDate || null,
        id,
      ]
    );

    res.json({ message: "تم التعديل بنجاح" });
  } catch (err) {
    console.error("PUT /products/:id error:", err);
    res.status(500).json({ message: "خطأ في تعديل المنتج" });
  }
});

/* ============= DELETE /api/products/:id ============= */
router.delete("/:id", async (req, res) => {
  const id = req.params.id;

  try {
    await db.query("DELETE FROM products WHERE id = ?", [id]);
    res.json({ message: "تم حذف المنتج بنجاح" });
  } catch (err) {
    console.error("DELETE /products/:id error:", err);
    res.status(500).json({ message: "خطأ في حذف المنتج" });
  }
});

export default router;
