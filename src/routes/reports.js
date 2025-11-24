// src/routes/reports.js
import express from "express";
import db from "../db.js";

const router = express.Router();

/* -------------------------------
   نظرة عامة
-------------------------------- */
router.get("/overview", async (req, res) => {
  try {
    const [row] = await db.query(`
      SELECT 
        (SELECT SUM(total) FROM sales) AS total_sales,
        (SELECT COUNT(*) FROM sales) AS total_invoices,
        (SELECT SUM(total) FROM sales WHERE DATE(created_at)=CURDATE()) AS today_sales
    `);

    res.json({
      invoices: {
        total_sales: Number(row.total_sales || 0),
        total_invoices: Number(row.total_invoices || 0),
        today_sales: Number(row.today_sales || 0),
      }
    });
  } catch (err) {
    console.error("overview error:", err);
    res.status(500).json({ error: "Failed to load overview" });
  }
});

/* -------------------------------
   تقرير المبيعات
-------------------------------- */
router.get("/sales", async (req, res) => {
  try {
    const rows = await db.query(`
      SELECT 
        id,
        customer,
        cashier,
        payment_method AS payment,
        total,
        created_at AS date,
        sale_type AS type
      FROM sales
      ORDER BY id DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error("sales report error:", err);
    res.status(500).json({ message: "Failed to load sales report" });
  }
});

/* -------------------------------
   تقرير المخزون
-------------------------------- */
router.get("/stock", async (req, res) => {
  try {
    const rows = await db.query(`
      SELECT
        id,
        name,
        company,
        quantity,
        COALESCE(min_qty, 0) AS minQty,
        expiry_date AS expiryDate,
        price
      FROM products
      ORDER BY id DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error("stock report error:", err);
    res.status(500).json({ message: "Failed to load stock report" });
  }
});


/* -------------------------------
   تقرير ربحية المنتجات
-------------------------------- */
router.get("/profit", async (req, res) => {
  try {
    const rows = await db.query(`
      SELECT 
        id,
        name,
        price,
        purchase_price AS costPrice,
        quantity
      FROM products
      ORDER BY id DESC
    `);

    const formatted = rows.map(p => ({
      ...p,
      costPrice: Number(p.costPrice || 0),
      price: Number(p.price || 0),
      quantity: Number(p.quantity || 0),
      profit: (p.price - p.costPrice) * p.quantity
    }));

    res.json(formatted);

  } catch (err) {
    console.error("profit report error:", err);
    res.status(500).json({ message: "Failed to load profit report" });
  }
});

/* -------------------------------
   تقرير التنبيهات
-------------------------------- */
router.get("/alerts", async (req, res) => {
  try {
    const rows = await db.query(`
      SELECT
        id,
        name,
        quantity,
        COALESCE(min_qty, 0) AS minQty,
        COALESCE(expiry_date, NULL) AS expiryDate
      FROM products
    `);

    const now = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(now.getMonth() + 1);

    const expired = rows.filter(p => p.expiryDate && new Date(p.expiryDate) < now);

    const lowStock = rows.filter(p =>
      Number(p.quantity) <= Number(p.minQty)
    );

    const nearExpiry = rows.filter(p => {
      if (!p.expiryDate) return false;
      const d = new Date(p.expiryDate);
      return d >= now && d <= nextMonth;
    });

    res.json({
      expired,
      lowStock,
      nearExpiry
    });
  } catch (err) {
    console.error("alerts report error:", err);
    res.status(500).json({ message: "Failed to load alerts" });
  }
});


export default router;
