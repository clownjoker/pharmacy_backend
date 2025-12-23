import { pool } from "../config/db.js";

/* ------------------ helpers ------------------ */

export async function getInvoiceWithItems(invoiceId) {
  const [[invoice]] = await pool.query(
    `
    SELECT id, user_id, status, total, payment_method, created_at, paid_at
    FROM invoices
    WHERE id = ?
    `,
    [invoiceId]
  );

  if (!invoice) return null;

  const [items] = await pool.query(
    `
    SELECT 
      ii.id,
      ii.product_id,
      ii.qty,
      ii.price,
      p.name AS product_name
    FROM invoice_items ii
    LEFT JOIN inventory_products p ON p.id = ii.product_id
    WHERE ii.invoice_id = ?
    `,
    [invoiceId]
  );

  return { ...invoice, items };
}

export async function recalcInvoiceTotal(invoiceId) {
  const [[row]] = await pool.query(
    `
    SELECT COALESCE(SUM(qty * price), 0) AS total
    FROM invoice_items
    WHERE invoice_id = ?
    `,
    [invoiceId]
  );

  const total = Number(row?.total || 0);

  await pool.query(
    `UPDATE invoices SET total = ? WHERE id = ?`,
    [total, invoiceId]
  );

  return total;
}

/* ------------------ actions ------------------ */

export async function createInvoice(userId) {
  const [result] = await pool.query(
    `
    INSERT INTO invoices (user_id, status, total, created_at)
    VALUES (?, 'open', 0, NOW())
    `,
    [userId]
  );
  return result.insertId;
}

export async function addItem({ invoice_id, product_id, qty, price }) {
  const [[invoice]] = await pool.query(
    `SELECT id, status FROM invoices WHERE id = ?`,
    [invoice_id]
  );

  if (!invoice) throw new Error("الفاتورة غير موجودة");
  if (invoice.status !== "open") throw new Error("الفاتورة مغلقة");

  await pool.query(
    `
    INSERT INTO invoice_items (invoice_id, product_id, qty, price)
    VALUES (?,?,?,?)
    `,
    [invoice_id, product_id, qty, price]
  );

  return recalcInvoiceTotal(invoice_id);
}

export async function removeItem(itemId) {
  const [[item]] = await pool.query(
    `SELECT invoice_id FROM invoice_items WHERE id = ?`,
    [itemId]
  );
  if (!item) throw new Error("العنصر غير موجود");

  await pool.query(`DELETE FROM invoice_items WHERE id = ?`, [itemId]);
  return recalcInvoiceTotal(item.invoice_id);
}

export async function checkout({ invoice_id, method }) {
  const [[invoice]] = await pool.query(
    `SELECT id, status FROM invoices WHERE id = ?`,
    [invoice_id]
  );

  if (!invoice) throw new Error("الفاتورة غير موجودة");
  if (invoice.status !== "open") throw new Error("الفاتورة مغلقة");

  const total = await recalcInvoiceTotal(invoice_id);

  await pool.query(
    `
    UPDATE invoices
    SET status='paid',
        payment_method=?,
        total=?,
        paid_at=NOW()
    WHERE id=?
    `,
    [method || "cash", total, invoice_id]
  );

  return getInvoiceWithItems(invoice_id);
}

export async function deductStock(invoice_id) {
  const [items] = await pool.query(
    `SELECT product_id, qty FROM invoice_items WHERE invoice_id = ?`,
    [invoice_id]
  );

  for (const item of items) {
    await pool.query(
      `
      UPDATE inventory_products
      SET quantity = quantity - ?
      WHERE id = ?
      `,
      [item.qty, item.product_id]
    );
  }
}

export async function shiftSummary(cashierId) {
  const [rows] = await pool.query(
    `
    SELECT 
      COUNT(*) AS invoice_count,
      COALESCE(SUM(total), 0) AS total_sales,
      COALESCE(AVG(total), 0) AS avg_sale
    FROM invoices
    WHERE user_id = ?
      AND status = 'paid'
      AND DATE(paid_at) = CURRENT_DATE
    `,
    [cashierId]
  );

  return rows[0];
}
