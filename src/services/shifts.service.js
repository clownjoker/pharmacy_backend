import { pool } from "../config/db.js";

/* إنشاء الجداول */
export async function ensureShiftTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS shifts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      opened_by INT NOT NULL,
      open_time DATETIME NOT NULL,
      closed_by INT DEFAULT NULL,
      close_time DATETIME DEFAULT NULL,
      status ENUM('open','closed') DEFAULT 'open'
    )
  `);

  await pool.query(`
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

/* الشفت الحالي */
export async function getCurrentShift() {
  const [rows] = await pool.query(`
    SELECT s.*,
           t.total_sales,
           t.invoices_count,
           t.total_cash,
           t.total_card,
           t.total_wallet
    FROM shifts s
    LEFT JOIN shift_totals t ON t.shift_id = s.id
    WHERE s.status = 'open'
    ORDER BY s.id DESC
    LIMIT 1
  `);

  return rows[0] || null;
}

/* كل الشفتات */
export async function listShifts() {
  const [rows] = await pool.query(`
    SELECT s.*,
           t.total_sales,
           t.invoices_count,
           t.total_cash,
           t.total_card,
           t.total_wallet
    FROM shifts s
    LEFT JOIN shift_totals t ON t.shift_id = s.id
    ORDER BY s.id DESC
  `);

  return rows;
}

/* فتح شفت */
export async function startShift(userId) {
  const [open] = await pool.query(
    "SELECT id FROM shifts WHERE status='open' LIMIT 1"
  );

  if (open.length) {
    return { ok: false, message: "يوجد شفت مفتوح بالفعل" };
  }

  const [res] = await pool.query(
    `INSERT INTO shifts (opened_by, open_time, status)
     VALUES (?, NOW(), 'open')`,
    [userId]
  );

  await pool.query(
    `INSERT INTO shift_totals (shift_id) VALUES (?)`,
    [res.insertId]
  );

  return { ok: true, shiftId: res.insertId };
}

/* إغلاق شفت */
export async function closeShift(userId) {
  const [open] = await pool.query(
    "SELECT id FROM shifts WHERE status='open' ORDER BY id DESC LIMIT 1"
  );

  if (!open.length) {
    return { ok: false, message: "لا يوجد شفت مفتوح" };
  }

  const shiftId = open[0].id;

  await pool.query(
    `UPDATE shifts
     SET status='closed', close_time=NOW(), closed_by=?
     WHERE id=?`,
    [userId, shiftId]
  );

  return { ok: true, shiftId };
}

/* 🔗 ربط المبيعات بالشفت */
// export async function addSaleToShift(amount, paymentMethod) {
//   const [open] = await pool.query(
//     "SELECT id FROM shifts WHERE status='open' ORDER BY id DESC LIMIT 1"
//   );
//   if (!open.length) return;

//   const shiftId = open[0].id;

//   const column =
//     paymentMethod === "cash"
//       ? "total_cash"
//       : paymentMethod === "card"
//       ? "total_card"
//       : "total_wallet";

//   await pool.query(`
//     UPDATE shift_totals
//     SET total_sales = total_sales + ?,
//         invoices_count = invoices_count + 1,
//         ${column} = ${column} + ?
//     WHERE shift_id = ?
//   `, [amount, amount, shiftId]);
// }

// src/services/shifts.service.js
export async function addSaleToShift(amount, paymentMethod) {
  const [open] = await pool.query(
    "SELECT id FROM shifts WHERE status='open' ORDER BY id DESC LIMIT 1"
  );

  if (!open.length) return;

  const shiftId = open[0].id;

  const col =
    paymentMethod === "cash"
      ? "total_cash"
      : paymentMethod === "card"
      ? "total_card"
      : "total_wallet";

  await pool.query(
    `
    UPDATE shift_totals
    SET total_sales = total_sales + ?,
        invoices_count = invoices_count + 1,
        ${col} = ${col} + ?
    WHERE shift_id = ?
    `,
    [amount, amount, shiftId]
  );
}

