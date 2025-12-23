import { pool } from "../config/db.js";

export async function overview() {
  const [[row]] = await pool.query(`
    SELECT 
      (SELECT SUM(total) FROM sales) AS total_sales,
      (SELECT COUNT(*) FROM sales) AS total_invoices,
      (SELECT SUM(total) FROM sales WHERE DATE(created_at)=CURDATE()) AS today_sales
  `);

  return {
    total_sales: Number(row.total_sales || 0),
    total_invoices: Number(row.total_invoices || 0),
    today_sales: Number(row.today_sales || 0),
  };
}

export async function salesReport() {
  const [rows] = await pool.query(`
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
  return rows;
}

export async function stockReport() {
  const [rows] = await pool.query(`
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
  return rows;
}

export async function profitReport() {
  const [rows] = await pool.query(`
    SELECT id, name, price, purchase_price AS costPrice, quantity
    FROM products
  `);

  return rows.map(p => ({
    ...p,
    profit: (Number(p.price) - Number(p.costPrice || 0)) * Number(p.quantity),
  }));
}

export async function alertsReport() {
  const [rows] = await pool.query(`
    SELECT id, name, quantity,
           COALESCE(min_qty,0) AS minQty,
           expiry_date AS expiryDate
    FROM products
  `);

  const now = new Date();
  const nextMonth = new Date();
  nextMonth.setMonth(now.getMonth() + 1);

  return {
    expired: rows.filter(p => p.expiryDate && new Date(p.expiryDate) < now),
    lowStock: rows.filter(p => p.quantity <= p.minQty),
    nearExpiry: rows.filter(p => {
      if (!p.expiryDate) return false;
      const d = new Date(p.expiryDate);
      return d >= now && d <= nextMonth;
    }),
  };
}
