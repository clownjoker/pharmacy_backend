// backend/src/routes/transactions.js

import express from "express";
import db from "../db.js";

const router = express.Router();

/* -------------------------------------------------------
   📌 1) جلب كل العمليات المالية
------------------------------------------------------- */
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        t.id,
        t.ref_code      AS refCode,
        t.type          AS type,
        t.direction     AS direction,
        t.amount        AS amount,
        t.date          AS date,
        t.user_id       AS userId,
        u.name          AS userName,
        t.category      AS category,
        t.payment_method AS paymentMethod,
        t.description   AS description
      FROM transactions t
      LEFT JOIN users u ON u.id = t.user_id
      ORDER BY t.id DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error("GET /transactions error:", err);
    res.status(500).json({ message: "خطأ في جلب العمليات المالية" });
  }
});

/* -------------------------------------------------------
   📌 2) إضافة عملية جديدة
------------------------------------------------------- */
router.post("/", async (req, res) => {
  try {
    const {
      refCode,
      type,
      direction,
      amount,
      date,
      userId,
      category,
      paymentMethod,
      description,
    } = req.body;

    const [result] = await db.query(
      `
      INSERT INTO transactions 
      (ref_code, type, direction, amount, date, user_id, category, payment_method, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        refCode || null,
        type,
        direction,
        amount,
        date,
        userId || null,
        category,
        paymentMethod,
        description,
      ]
    );

    res.json({
      id: result.insertId,
      refCode,
      type,
      direction,
      amount,
      date,
      userId,
      category,
      paymentMethod,
      description,
    });
  } catch (err) {
    console.error("POST /transactions error:", err);
    res.status(500).json({ message: "خطأ في إضافة العملية" });
  }
});

export default router;














// // routes/transactions.js
// import express from "express";
// import db from "../db.js";

// const router = express.Router();

// /* --------------------------------------------------
//     1) GET ALL TRANSACTIONS + FILTERS
// -------------------------------------------------- */
// router.get("/", async (req, res) => {
//   try {
//     const {
//       search = "",
//       type = "all",
//       direction = "all",
//       userId = "all",
//       dateFrom = "",
//       dateTo = "",
//     } = req.query;

//     let sql = `
//       SELECT t.*, u.name AS user_name
//       FROM transactions t
//       LEFT JOIN users u ON u.id = t.user_id
//       WHERE 1=1
//     `;
//     const params = [];

//     if (search.trim()) {
//       sql += ` AND (t.ref_code LIKE ? OR t.description LIKE ? OR u.name LIKE ?)`;
//       params.push(`%${search}%`, `%${search}%`, `%${search}%`);
//     }

//     if (type !== "all") {
//       sql += ` AND t.type = ?`;
//       params.push(type);
//     }

//     if (direction !== "all") {
//       sql += ` AND t.direction = ?`;
//       params.push(direction);
//     }

//     if (userId !== "all") {
//       sql += ` AND t.user_id = ?`;
//       params.push(userId);
//     }

//     if (dateFrom) {
//       sql += ` AND DATE(t.date) >= ?`;
//       params.push(dateFrom);
//     }

//     if (dateTo) {
//       sql += ` AND DATE(t.date) <= ?`;
//       params.push(dateTo);
//     }

//     sql += ` ORDER BY t.date DESC`;

//     const [rows] = await db.query(sql, params);
//     res.json(rows);
//   } catch (err) {
//     console.error("GET /transactions error:", err);
//     res.status(500).json({ message: "خطأ في تحميل العمليات" });
//   }
// });

// /* --------------------------------------------------
//     2) ADD NEW TRANSACTION
// -------------------------------------------------- */
// router.post("/", async (req, res) => {
//   try {
//     const {
//       ref_code,
//       type,
//       direction,
//       amount,
//       date,
//       user_id,
//       category,
//       payment_method,
//       description,
//     } = req.body;

//     const sql = `
//       INSERT INTO transactions 
//       (ref_code, type, direction, amount, date, user_id, category, payment_method, description)
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
//     `;

//     const params = [
//       ref_code || null,
//       type,
//       direction,
//       amount,
//       date,
//       user_id || null,
//       category || null,
//       payment_method || null,
//       description || null,
//     ];

//     const [result] = await db.query(sql, params);

//     res.json({
//       id: result.insertId,
//       ...req.body,
//     });
//   } catch (err) {
//     console.error("POST /transactions error:", err);
//     res.status(500).json({ message: "خطأ في إضافة العملية المالية" });
//   }
// });

// /* --------------------------------------------------
//     3) DELETE TRANSACTION
// -------------------------------------------------- */
// router.delete("/:id", async (req, res) => {
//   try {
//     const [result] = await db.query(
//       "DELETE FROM transactions WHERE id = ?",
//       [req.params.id]
//     );

//     if (result.affectedRows === 0)
//       return res.status(404).json({ message: "السجل غير موجود" });

//     res.json({ message: "تم الحذف" });
//   } catch (err) {
//     console.error("DELETE /transactions error:", err);
//     res.status(500).json({ message: "خطأ في حذف العملية" });
//   }
// });

// export default router;
