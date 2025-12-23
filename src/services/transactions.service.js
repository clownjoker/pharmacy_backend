import {pool} from "../config/db.js";

/**
 * جلب جميع العمليات المالية
 */

export async function getAllTransactions() {
  const [transactions] = await pool.query(`
    SELECT
      t.id,
      t.ref_code AS refCode,
      t.type,
      t.amount,
      DATE_FORMAT(t.created_at, '%Y-%m-%dT%H:%i:%s') AS date
    FROM transactions t
    ORDER BY t.created_at DESC
  `);

  const [summaryRows] = await pool.query(`
    SELECT
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS totalIncome,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS totalExpense
    FROM transactions
  `);

  const summary = summaryRows[0];

  return {
    transactions,
    summary: {
      totalIncome: Number(summary.totalIncome || 0),
      totalExpense: Number(summary.totalExpense || 0),
      netTotal:
        Number(summary.totalIncome || 0) -
        Number(summary.totalExpense || 0),
    },
  };
}

// export async function getAllTransactions() {
//   const [rows] = await pool.query(`
//     SELECT
//       t.id,
//       t.ref_code AS refCode,
//       t.type,
//       t.amount,
//       DATE_FORMAT(t.created_at, '%Y-%m-%dT%H:%i:%s') AS date,
//       t.user_id AS userId,
//       u.name AS userName,
//       NULL AS paymentMethod
//     FROM transactions t
//     LEFT JOIN users u ON u.id = t.user_id
//     ORDER BY t.created_at DESC, t.id DESC
//   `);

//   return rows;
// }

/**
 * إنشاء عملية مالية جديدة
 */
export async function createTransaction(data) {
  const {
    refCode,
    type,
    amount,
    userId,
    paymentMethod // نستقبله من الواجهة لكن لا نخزنه الآن
  } = data;

  const [result] = await pool.query(
    `
    INSERT INTO transactions
      (ref_code, type, amount, user_id)
    VALUES (?, ?, ?, ?)
    `,
    [
      refCode || null,
      type,
      Number(amount || 0),
      userId || null
    ]
  );

  // نعيد السجل الجديد بنفس شكل القراءة
  const [rows] = await pool.query(
    `
    SELECT
      t.id,
      t.ref_code AS refCode,
      t.type,
      t.amount,
      DATE_FORMAT(t.created_at, '%Y-%m-%dT%H:%i:%s') AS date,
      t.user_id AS userId,
      u.name AS userName,
      NULL AS paymentMethod
    FROM transactions t
    LEFT JOIN users u ON u.id = t.user_id
    WHERE t.id = ?
    `,
    [result.insertId]
  );

  return rows[0];
}
