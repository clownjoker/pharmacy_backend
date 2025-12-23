import {pool} from "../config/db.js";

/**
 * جلب حالة المخزون الحالية
 */
export const getInventory = async () => {
  const [rows] = await pool.query(`
    SELECT
      p.id,
      p.name,
      p.sku,
      p.quantity,
      p.min_qty,
      CASE
        WHEN p.quantity <= p.min_qty THEN 1
        ELSE 0
      END AS low_stock
    FROM products p
    ORDER BY p.name
  `);

  return rows;
};

/**
 * جلب سجل حركة المخزون
 */
export const getInventoryMovements = async () => {
  const [rows] = await pool.query(`
    SELECT
      im.id,
      im.product_id,
      p.name AS product_name,
      p.sku,
      im.type,
      im.qty_change,
      im.prev_qty,
      im.new_qty,
      im.source,
      im.reference_id,
      im.created_at
    FROM inventory_movements im
    JOIN products p ON p.id = im.product_id
    ORDER BY im.created_at DESC
  `);

  return rows;
};
