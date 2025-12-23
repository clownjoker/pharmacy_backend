import {pool} from "../config/db.js";

export async function listMedicines() {
  const [rows] = await pool.query(`
    SELECT 
      id,
      name,
      sku,
      category,
      company,
      price,
      quantity,
      min_qty,
      expiry_date
    FROM products
    ORDER BY name ASC
  `);
  return rows;
}

export async function listPharmacistSales() {
  const [rows] = await pool.query(`
    SELECT 
      id,
      DATE(sale_date) AS date,
      medicine_name AS name,
      qty,
      price
    FROM pharmacist_sales
    ORDER BY sale_date DESC, id DESC
  `);
  return rows;
}

export async function createPharmacistSale({ medicine_id, qty, price, pharmacist_id }) {
  if (!medicine_id || !qty) {
    return { ok: false, status: 400, message: "البيانات ناقصة" };
  }

  const [rows] = await pool.query(`SELECT * FROM products WHERE id = ?`, [medicine_id]);
  if (!rows.length) {
    return { ok: false, status: 404, message: "الدواء غير موجود" };
  }

  const product = rows[0];
  const q = Number(qty);
  const sellPrice = Number(price || product.price);

  if (q > product.quantity) {
    return { ok: false, status: 400, message: "الكمية المطلوبة أكبر من المخزون" };
  }

  const total = sellPrice * q;

  const [insertSale] = await pool.query(
    `
    INSERT INTO pharmacist_sales
      (medicine_id, medicine_name, qty, price, total, sale_date, pharmacist_id)
    VALUES (?, ?, ?, ?, ?, NOW(), ?)
    `,
    [product.id, product.name, q, sellPrice, total, pharmacist_id || null]
  );

  await pool.query(
    `UPDATE products SET quantity = quantity - ? WHERE id = ?`,
    [q, product.id]
  );

  return {
    ok: true,
    sale: {
      id: insertSale.insertId,
      date: new Date().toISOString().slice(0, 10),
      name: product.name,
      qty: q,
      price: sellPrice,
    },
    medicine: {
      id: product.id,
      quantity: product.quantity - q,
    },
  };
}
