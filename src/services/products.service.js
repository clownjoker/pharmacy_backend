import {pool} from "../config/db.js";

/**
 * جلب كل المنتجات
 */
export async function getAllProducts() {
  const [rows] = await pool.query(`
    SELECT
      id,
      name,
      sku,
      category,
      company,
      purchase_price AS purchasePrice,
      price,
      quantity,
      min_qty AS minQty,
      expiry_date AS expiryDate,
      created_at
    FROM products
    ORDER BY id DESC
  `);

  return rows;
}

/**
 * جلب منتج واحد بالـ ID
 */
export async function getProductById(id) {
  const [rows] = await pool.query(
    `
    SELECT
      id,
      name,
      sku,
      category,
      company,
      purchase_price AS purchasePrice,
      price,
      quantity,
      min_qty AS minQty,
      expiry_date AS expiryDate,
      created_at
    FROM products
    WHERE id = ?
    `,
    [id]
  );

  return rows[0];
}

/**
 * إضافة منتج جديد
 */
export async function createProduct(data) {
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
  } = data;

  const [result] = await pool.query(
    `
    INSERT INTO products
      (name, sku, category, company, purchase_price, price, quantity, min_qty, expiry_date)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      name,
      sku || null,
      category || null,
      company || null,
      purchasePrice || 0,
      price || 0,
      quantity || 0,
      minQty || 0,
      expiryDate || null,
    ]
  );

  return result.insertId;
}

/**
 * حذف منتج
 */
export async function deleteProduct(id) {
  await pool.query("DELETE FROM products WHERE id = ?", [id]);
}
