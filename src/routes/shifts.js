// routes/shifts.js
import express from "express";
import db from "../db.js";

const router = express.Router();

/**
 * 🔹 إنشاء جدول الشفتات إذا لم يكن موجوداً
 */
export async function ensureShiftTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS shifts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      opened_by INT NOT NULL,
      open_time DATETIME NOT NULL,
      closed_by INT DEFAULT NULL,
      close_time DATETIME DEFAULT NULL,
      status ENUM('open','closed') DEFAULT 'open'
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS shift_totals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      shift_id INT NOT NULL,
      total_sales DECIMAL(10,2) DEFAULT 0,
      invoices_count INT DEFAULT 0,
      total_cash DECIMAL(10,2) DEFAULT 0,
      total_card DECIMAL(10,2) DEFAULT 0,
      total_wallet DECIMAL(10,2) DEFAULT 0,
      FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE
    )
  `);
}

/**
 * 🔹 جلب الشفت الحالي
 */
router.get("/current", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.*, 
             t.total_sales, t.invoices_count,
             t.total_cash, t.total_card, t.total_wallet
      FROM shifts s
      LEFT JOIN shift_totals t ON t.shift_id = s.id
      WHERE s.status = 'open'
      ORDER BY s.id DESC
      LIMIT 1
    `);

    res.json(rows[0] || null);
  } catch (err) {
    console.error("GET /shifts/current error:", err);
    res.status(500).json({ message: "خطأ في جلب الشفت الحالي" });
  }
});

/**
 * 🔹 جلب كل الشفتات
 */
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.*, 
             t.total_sales, t.invoices_count,
             t.total_cash, t.total_card, t.total_wallet
      FROM shifts s
      LEFT JOIN shift_totals t ON t.shift_id = s.id
      ORDER BY s.id DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error("GET /shifts error:", err);
    res.status(500).json({ message: "خطأ في جلب الشفتات" });
  }
});

/**
 * 🔹 بدء شفت جديد
 */
router.post("/start", async (req, res) => {
  try {
    const { userId } = req.body;

    // هل يوجد شفت مفتوح؟
    const [open] = await db.query(
      "SELECT id FROM shifts WHERE status = 'open' LIMIT 1"
    );
    if (open.length) {
      return res.status(400).json({ message: "يوجد شفت مفتوح بالفعل" });
    }

    const [result] = await db.query(
      `INSERT INTO shifts (opened_by, open_time, status)
       VALUES (?, NOW(), 'open')`,
      [userId]
    );

    const shiftId = result.insertId;

    await db.query(
      `INSERT INTO shift_totals (shift_id) 
       VALUES (?)`,
      [shiftId]
    );

    res.json({ message: "تم فتح الشفت بنجاح", shiftId });
  } catch (err) {
    console.error("POST /shifts/start error:", err);
    res.status(500).json({ message: "تعذر بدء الشفت" });
  }
});

/**
 * 🔹 إغلاق شفت
 */
router.post("/close", async (req, res) => {
  try {
    const { userId } = req.body;

    const [open] = await db.query(
      "SELECT id FROM shifts WHERE status = 'open' ORDER BY id DESC LIMIT 1"
    );

    if (!open.length) {
      return res.status(400).json({ message: "لا يوجد شفت مفتوح" });
    }

    const shiftId = open[0].id;

    await db.query(
      `UPDATE shifts
       SET status='closed', close_time=NOW(), closed_by=?
       WHERE id=?`,
      [userId, shiftId]
    );

    res.json({ message: "تم إغلاق الشفت", shiftId });
  } catch (err) {
    console.error("POST /shifts/close error:", err);
    res.status(500).json({ message: "تعذر إغلاق الشفت" });
  }
});

/**
 * 🔹 دمج مبيعات الفواتير مع الشفت الحالي
 *  (يتم استدعاؤه من sales.js تلقائياً)
 */
export async function addSaleToShift(total, paymentMethod) {
  // جلب الشفت الحالي
  const [open] = await db.query(
    "SELECT id FROM shifts WHERE status='open' ORDER BY id DESC LIMIT 1"
  );
  if (!open.length) return;

  const shiftId = open[0].id;

  await db.query(
    `
    UPDATE shift_totals
    SET total_sales = total_sales + ?,
        invoices_count = invoices_count + 1,
        ${paymentMethod === "cash" ? "total_cash" :
           paymentMethod === "card" ? "total_card" :
           "total_wallet"} = ${
             paymentMethod === "cash" ? "total_cash" :
             paymentMethod === "card" ? "total_card" :
             "total_wallet"
           } + ?
    WHERE shift_id = ?
    `,
    [total, total, shiftId]
  );
}

export default router;
