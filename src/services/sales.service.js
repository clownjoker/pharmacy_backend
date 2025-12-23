import { pool } from "../config/db.js";

/**
 * إنشاء فاتورة بيع
 * - إنشاء سجل sale
 * - إنشاء invoice مرتبط
 * - إضافة عناصر الفاتورة
 * - خصم المخزون
 * - تسجيل حركة المخزون
 * - تنبيه min_qty
 */
export const createSale = async (saleData) => {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    /* =========================
       0️⃣ التحقق المبدئي
    ========================== */
    if (
      !saleData ||
      !Array.isArray(saleData.items) ||
      saleData.items.length === 0
    ) {
      throw new Error("لا يمكن إنشاء فاتورة بدون عناصر");
    }

    const {
      customer = null,
      cashier = null,
      paymentMethod = "cash",
      saleType = "sale",
      discount = 0,
      tax = 0,
      items = [],
    } = saleData;

    const safeDiscount = Number(discount) || 0;
    const safeTax = Number(tax) || 0;

    /* =========================
       1️⃣ إنشاء سجل البيع
    ========================== */
    const [saleRes] = await conn.query(
      `
      INSERT INTO sales
      (customer, cashier, payment_method, sale_type, discount, tax, total)
      VALUES (?, ?, ?, ?, ?, ?, 0)
      `,
      [
        customer,
        cashier,
        paymentMethod,
        saleType,
        safeDiscount,
        safeTax,
      ]
    );

    const saleId = saleRes.insertId;
    let subtotal = 0;

    /* =========================
       2️⃣ إنشاء Invoice محاسبي
    ========================== */
    const [invoiceRes] = await conn.query(
      `
      INSERT INTO invoices
      (source_type, source_id, status, created_at)
      VALUES ('sale', ?, 'paid', NOW())
      `,
      [saleId]
    );

    const invoiceId = invoiceRes.insertId;

    /* =========================
       3️⃣ معالجة عناصر الفاتورة
    ========================== */
    for (const item of items) {
      const productId = Number(item.productId);
      const qty = Number(item.qty);
      const price = Number(item.price);

      if (!productId || qty <= 0 || price <= 0) {
        throw new Error("بيانات عنصر الفاتورة غير صحيحة");
      }

      // 🔒 قفل المنتج
      const [[product]] = await conn.query(
        `
        SELECT id, quantity, min_qty
        FROM products
        WHERE id = ?
        FOR UPDATE
        `,
        [productId]
      );

      if (!product) {
        throw new Error(`المنتج غير موجود (ID: ${productId})`);
      }

      if (product.quantity < qty) {
        throw new Error(
          `كمية غير كافية للمنتج (ID: ${productId})`
        );
      }

      const prevQty = product.quantity;
      const newQty = prevQty - qty;
      const lineTotal = qty * price;

      subtotal += lineTotal;

      /* --- إضافة عنصر الفاتورة --- */
      await conn.query(
        `
        INSERT INTO sale_items
        (sale_id, product_id, price, qty)
        VALUES (?, ?, ?, ?)
        `,
        [saleId, productId, price, qty]
      );

      /* --- تحديث المخزون --- */
      await conn.query(
        `
        UPDATE products
        SET quantity = ?
        WHERE id = ?
        `,
        [newQty, productId]
      );

      /* --- تسجيل حركة مخزون --- */
      await conn.query(
        `
        INSERT INTO inventory_movements
        (
          product_id,
          type,
          qty_change,
          prev_qty,
          new_qty,
          source,
          reference_id,
          invoice_id,
          created_at
        )
        VALUES (?, 'out', ?, ?, ?, 'sale', ?, ?, NOW())
        `,
        [
          productId,
          -qty,
          prevQty,
          newQty,
          saleId,
          invoiceId,
        ]
      );

      /* --- تنبيه نقص المخزون --- */
      if (
        product.min_qty !== null &&
        newQty <= product.min_qty
      ) {
        await conn.query(
          `
          INSERT INTO stock_alerts
          (product_id, current_qty, min_qty, created_at)
          VALUES (?, ?, ?, NOW())
          `,
          [productId, newQty, product.min_qty]
        );
      }
    }

    /* =========================
       4️⃣ تحديث إجمالي الفاتورة
    ========================== */
    const total = subtotal - safeDiscount + safeTax;

    await conn.query(
      `
      UPDATE sales
      SET total = ?
      WHERE id = ?
      `,
      [total, saleId]
    );

    /* =========================
       5️⃣ تحديث invoice بالمبلغ
    ========================== */
    await conn.query(
      `
      UPDATE invoices
      SET total_amount = ?
      WHERE id = ?
      `,
      [total, invoiceId]
    );

    await conn.commit();

    /* =========================
       6️⃣ إعادة الفاتورة النهائية
    ========================== */
    const [[sale]] = await conn.query(
      `
      SELECT
        s.*,
        i.id AS invoice_id,
        i.total_amount
      FROM sales s
      LEFT JOIN invoices i
        ON i.source_type = 'sale'
       AND i.source_id = s.id
      WHERE s.id = ?
      `,
      [saleId]
    );

    return sale;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};








// import {pool} from "../config/db.js";

// /**
//  * إنشاء فاتورة بيع + خصم المخزون + تسجيل حركة مخزون
//  */
// export const createSale = async (saleData) => {
//   const conn = await pool.getConnection();

//   try {
//     await conn.beginTransaction();

//     const {
//       customer,
//       cashier,
//       paymentMethod,
//       saleType,
//       discount,
//       tax,
//       items,
//     } = saleData;

//     // 1️⃣ إنشاء الفاتورة
//     const [saleRes] = await conn.query(
//       `
//       INSERT INTO sales
//       (customer, cashier, payment_method, sale_type, discount, tax, total)
//       VALUES (?, ?, ?, ?, ?, ?, 0)
//       `,
//       [customer, cashier, paymentMethod, saleType, discount, tax]
//     );

//     const saleId = saleRes.insertId;
//     let subtotal = 0;

//     // 2️⃣ معالجة عناصر الفاتورة
//     for (const item of items) {
//       const { productId, qty, price } = item;

//       // جلب المنتج
//       const [[product]] = await conn.query(
//         "SELECT id, quantity, min_qty FROM products WHERE id = ? FOR UPDATE",
//         [productId]
//       );

//       if (!product) {
//         throw new Error(`المنتج غير موجود (ID: ${productId})`);
//       }

//       if (product.quantity < qty) {
//         throw new Error(`كمية غير كافية للمنتج (ID: ${productId})`);
//       }

//       const prevQty = product.quantity;
//       const newQty = prevQty - qty;
//       const totalLine = qty * price;

//       subtotal += totalLine;

//       // 3️⃣ إضافة عنصر الفاتورة
//       await conn.query(
//         `
//         INSERT INTO sale_items
//         (sale_id, product_id, price, qty)
//         VALUES (?, ?, ?, ?)
//         `,
//         [saleId, productId, price, qty]
//       );

//       // 4️⃣ تحديث المخزون
//       await conn.query(
//         "UPDATE products SET quantity = ? WHERE id = ?",
//         [newQty, productId]
//       );

//       // 5️⃣ تسجيل حركة مخزون
//       await conn.query(
//         `
//         INSERT INTO inventory_movements
//         (product_id, type, qty_change, prev_qty, new_qty, source, reference_id)
//         VALUES (?, 'out', ?, ?, ?, 'sale', ?)
//         `,
//         [productId, -qty, prevQty, newQty, saleId]
//       );
//     }

//     // 6️⃣ تحديث إجمالي الفاتورة
//     const total = subtotal - discount + tax;

//     await conn.query(
//       "UPDATE sales SET total = ? WHERE id = ?",
//       [total, saleId]
//     );

//     await conn.commit();

//     // 7️⃣ إعادة الفاتورة
//     const [[sale]] = await conn.query(
//       "SELECT * FROM sales WHERE id = ?",
//       [saleId]
//     );

//     return sale;
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     conn.release();
//   }
// };










// import {pool} from "../config/db.js";

// export const getAllSales = async () => {
//   const [rows] = await pool.query(`
//     SELECT *
//     FROM sales
//     ORDER BY id DESC
//   `);
//   return rows;
// };

// export const getSaleDetails = async (saleId) => {
//   const [[sale]] = await pool.query(
//     `SELECT * FROM sales WHERE id = ?`,
//     [saleId]
//   );

//   const [items] = await pool.query(
//     `
//     SELECT 
//       si.id,
//       si.qty,
//       si.price AS unit_price,
//       (si.qty * si.price) AS total_price,
//       p.name AS product_name
//     FROM sale_items si
//     JOIN products p ON p.id = si.product_id
//     WHERE si.sale_id = ?
//     `,
//     [saleId]
//   );

//   return { ...sale, items };
// };

// export const createSale = async (data) => {
//   const {
//     customer,
//     cashier,
//     paymentMethod,
//     saleType,
//     discount,
//     tax,
//     items,
//   } = data;

//   if (!items || !items.length) {
//     throw new Error("الفاتورة فارغة");
//   }

//   const conn = await pool.getConnection();
//   try {
//     await conn.beginTransaction();

//     // حساب الإجمالي
//     const subtotal = items.reduce(
//       (s, i) => s + Number(i.qty) * Number(i.price),
//       0
//     );
//     const total = subtotal - Number(discount || 0) + Number(tax || 0);

//     // إدخال الفاتورة
//     const [saleRes] = await conn.query(
//       `
//       INSERT INTO sales
//       (customer, cashier, payment_method, sale_type, discount, tax, total)
//       VALUES (?, ?, ?, ?, ?, ?, ?)
//       `,
//       [
//         customer,
//         cashier,
//         paymentMethod,
//         saleType,
//         discount,
//         tax,
//         total,
//       ]
//     );

//     const saleId = saleRes.insertId;

//     // إدخال العناصر + التحقق من المنتجات
//     for (const item of items) {
//       const productId = Number(item.productId);
//       const qty = Number(item.qty);
//       const price = Number(item.price);

//       // ✅ تحقق من وجود المنتج
//       const [[product]] = await conn.query(
//         `SELECT quantity FROM products WHERE id = ?`,
//         [productId]
//       );

//       if (!product) {
//         throw new Error(`المنتج غير موجود (ID: ${productId})`);
//       }

//       if (product.quantity < qty) {
//         throw new Error(`الكمية غير متوفرة للمنتج ID ${productId}`);
//       }

//       // إدخال سطر الفاتورة
//       await conn.query(
//         `
//         INSERT INTO sale_items
//         (sale_id, product_id, price, qty)
//         VALUES (?, ?, ?, ?)
//         `,
//         [saleId, productId, price, qty]
//       );

//       // تحديث المخزون
//       await conn.query(
//         `
//         UPDATE products
//         SET quantity = quantity - ?
//         WHERE id = ?
//         `,
//         [qty, productId]
//       );
//     }

//     await conn.commit();

//     const [[sale]] = await conn.query(
//       `SELECT * FROM sales WHERE id = ?`,
//       [saleId]
//     );

//     return sale;
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     conn.release();
//   }
// };

// export const deleteSale = async (id) => {
//   const conn = await pool.getConnection();
//   try {
//     await conn.beginTransaction();

//     await conn.query(`DELETE FROM sale_items WHERE sale_id = ?`, [id]);
//     await conn.query(`DELETE FROM sales WHERE id = ?`, [id]);

//     await conn.commit();
//   } catch (err) {
//     await conn.rollback();
//     throw err;
//   } finally {
//     conn.release();
//   }
// };
