// src/routes/sales.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// دعم db.pool أو db مباشرة
const pool = db.pool || db;

// دالة تنفيذ Query
function query(sql, params = []) {
  return pool.query(sql, params);
}

/* -----------------------------------------
   GET /api/sales
----------------------------------------- */
router.get('/', async (req, res) => {
  try {
    const [rows] = await query(
      `SELECT id, customer, cashier, payment_method, sale_type,
              subtotal, discount, tax, total, created_at
       FROM sales
       ORDER BY id DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /sales error:", err);
    res.status(500).json({ message: "خطأ في جلب المبيعات" });
  }
});

/* -----------------------------------------
   GET /api/sales/:id
----------------------------------------- */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await query(
      `SELECT * FROM sales WHERE id = ?`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "الفاتورة غير موجودة" });
    }

    const sale = rows[0];

    const [items] = await query(
      `SELECT si.*, p.name AS product_name
       FROM sale_items si
       LEFT JOIN products p ON p.id = si.product_id
       WHERE si.sale_id = ?`,
      [id]
    );

    res.json({ sale, items });
  } catch (err) {
    console.error("GET /sales/:id error:", err);
    res.status(500).json({ message: "خطأ في جلب تفاصيل الفاتورة" });
  }
});

/* -------------------------------------------------------
   POST /api/sales
   body: { customer, cashier, paymentMethod, saleType, discount, tax, items[] }
-------------------------------------------------------- */
router.post('/', async (req, res) => {
  const {
    customer,
    cashier,
    paymentMethod,
    saleType,
    discount,
    tax,
    items,
    shiftId,   // مهم لتحديث الشفت
  } = req.body || {};

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "يجب إضافة عنصر واحد على الأقل" });
  }

  const subtotal = items.reduce((sum, i) => sum + (i.price * i.qty), 0);
  const disc = Number(discount || 0);
  const t = Number(tax || 0);
  const total = subtotal - disc + t;

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // 1) إنشاء فاتورة
    const [saleRes] = await conn.query(
      `INSERT INTO sales (customer, cashier, payment_method, sale_type,
                          subtotal, discount, tax, total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer || null,
        cashier || null,
        paymentMethod || 'cash',
        saleType || 'sale',
        subtotal,
        disc,
        t,
        total,
      ]
    );

    const saleId = saleRes.insertId;

    // 2) إدخال العناصر + تحديث المخزون
    for (const item of items) {
      const productId = item.productId;
      const qty = item.qty;
      const unitPrice = item.price;
      const lineTotal = qty * unitPrice;

      await conn.query(
        `INSERT INTO sale_items (sale_id, product_id, qty, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?)`,
        [saleId, productId, qty, unitPrice, lineTotal]
      );

      // تحديث المخزون
      if ((saleType || "sale") === "sale") {
        await conn.query(
          `UPDATE products SET quantity = quantity - ? WHERE id = ?`,
          [qty, productId]
        );
      } else {
        await conn.query(
          `UPDATE products SET quantity = quantity + ? WHERE id = ?`,
          [qty, productId]
        );
      }
    }

    /* -------------------------------------
       ⭐ تحديث الشفت — أهم جزء تمت إضافته
    -------------------------------------- */

    if (shiftId) {
      await conn.query(
        `UPDATE shift_totals
         SET total_sales = total_sales + ?,
             invoices_count = invoices_count + 1,
             ${paymentMethod === "cash" ? "total_cash" :
        paymentMethod === "card" ? "total_card" :
        "total_wallet"} =
             ${paymentMethod === "cash" ? "total_cash" :
        paymentMethod === "card" ? "total_card" :
        "total_wallet"} + ?
         WHERE shift_id = ?`,
        [total, total, shiftId]
      );
    }

    // 3) إنهاء العملية
    await conn.commit();
    conn.release();

    res.json({
      id: saleId,
      customer,
      cashier,
      paymentMethod,
      saleType,
      subtotal,
      discount: disc,
      tax: t,
      total,
      created_at: new Date(),
    });

  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
        conn.release();
      } catch (e) {}
    }
    console.error("POST /sales error:", err);
    res.status(500).json({ message: "خطأ في حفظ الفاتورة" });
  }
});

/* -----------------------------------------
   DELETE /api/sales/:id
----------------------------------------- */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query(`DELETE FROM sales WHERE id = ?`, [id]);
    res.json({ message: "deleted" });
  } catch (err) {
    console.error("DELETE /sales/:id error:", err);
    res.status(500).json({ message: "خطأ في حذف الفاتورة" });
  }
});

module.exports = router;















// // src/routes/sales.js
// const express = require('express');
// const router = express.Router();
// const db = require('../db'); // نفس db المستخدم في users / products

// // نحاول دعم الحالتين: db.pool أو db مباشرة
// const pool = db.pool || db;

// // 🧮 مساعد: تنفيذ query عادي
// function query(sql, params = []) {
//   return pool.query(sql, params);
// }

// /* -----------------------------------------
//    GET /api/sales
//    جلب جميع الفواتير (بدون العناصر)
// ----------------------------------------- */
// router.get('/', async (req, res) => {
//   try {
//     const [rows] = await query(
//       `SELECT id, customer, cashier, payment_method, sale_type,
//               subtotal, discount, tax, total, created_at
//        FROM sales
//        ORDER BY id DESC`
//     );
//     res.json(rows);
//   } catch (err) {
//     console.error('GET /sales error:', err);
//     res.status(500).json({ message: 'خطأ في جلب المبيعات' });
//   }
// });

// /* -----------------------------------------
//    GET /api/sales/:id
//    جلب فاتورة واحدة + عناصرها
// ----------------------------------------- */
// router.get('/:id', async (req, res) => {
//   const { id } = req.params;
//   try {
//     const [salesRows] = await query(
//       `SELECT id, customer, cashier, payment_method, sale_type,
//               subtotal, discount, tax, total, created_at
//        FROM sales WHERE id = ?`,
//       [id]
//     );

//     if (!salesRows.length) {
//       return res.status(404).json({ message: 'الفاتورة غير موجودة' });
//     }

//     const sale = salesRows[0];

//     const [itemsRows] = await query(
//       `SELECT si.id,
//               si.product_id,
//               si.qty,
//               si.unit_price,
//               si.total_price,
//               p.name AS product_name
//        FROM sale_items si
//        LEFT JOIN products p ON p.id = si.product_id
//        WHERE si.sale_id = ?`,
//       [id]
//     );

//     res.json({ ...sale, items: itemsRows });
//   } catch (err) {
//     console.error('GET /sales/:id error:', err);
//     res.status(500).json({ message: 'خطأ في جلب تفاصيل الفاتورة' });
//   }
// });

// /* -----------------------------------------
//    POST /api/sales
//    body: { customer, cashier, paymentMethod, saleType, discount, tax, items[] }
// ----------------------------------------- */
// router.post('/', async (req, res) => {
//   const {
//     customer,
//     cashier,
//     paymentMethod,
//     saleType,
//     discount,
//     tax,
//     items,
//   } = req.body || {};

//   if (!items || !Array.isArray(items) || !items.length) {
//     return res
//       .status(400)
//       .json({ message: 'يجب إضافة عنصر واحد على الأقل للفاتورة' });
//   }

//   // حساب الإجماليات
//   const subtotal = items.reduce(
//     (sum, it) =>
//       sum + Number(it.qty || 0) * Number(it.price || 0),
//     0
//   );
//   const disc = Number(discount || 0);
//   const t = Number(tax || 0);
//   const total = subtotal - disc + t;

//   let conn;

//   try {
//     conn = await pool.getConnection();
//     await conn.beginTransaction();

//     // إدخال الفاتورة
//     const [saleResult] = await conn.query(
//       `INSERT INTO sales 
//        (customer, cashier, payment_method, sale_type, subtotal, discount, tax, total)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         customer || null,
//         cashier || null,
//         paymentMethod || 'cash',
//         saleType || 'sale',
//         subtotal,
//         disc,
//         t,
//         total,
//       ]
//     );

//     const saleId = saleResult.insertId;

//     // إدخال العناصر + تحديث المخزون
//     for (const it of items) {
//       const productId = Number(it.productId);
//       const qty = Number(it.qty || 0);
//       const unitPrice = Number(it.price || 0);
//       const lineTotal = qty * unitPrice;

//       if (!productId || !qty || qty <= 0 || !unitPrice) {
//         throw new Error('بيانات عنصر غير صحيحة');
//       }

//       await conn.query(
//         `INSERT INTO sale_items
//          (sale_id, product_id, qty, unit_price, total_price)
//          VALUES (?, ?, ?, ?, ?)`,
//         [saleId, productId, qty, unitPrice, lineTotal]
//       );

//       // تحديث المخزون
//       if ((saleType || 'sale') === 'sale') {
//         await conn.query(
//           `UPDATE products
//            SET quantity = quantity - ?
//            WHERE id = ?`,
//           [qty, productId]
//         );
//       } else if (saleType === 'return') {
//         await conn.query(
//           `UPDATE products
//            SET quantity = quantity + ?
//            WHERE id = ?`,
//           [qty, productId]
//         );
//       }
//     }

//     await conn.commit();
//     conn.release();

//     res.json({
//       id: saleId,
//       customer: customer || null,
//       cashier: cashier || null,
//       payment_method: paymentMethod || 'cash',
//       sale_type: saleType || 'sale',
//       subtotal,
//       discount: disc,
//       tax: t,
//       total,
//       created_at: new Date(),
//     });
//   } catch (err) {
//     if (conn) {
//       try {
//         await conn.rollback();
//         conn.release();
//       } catch (e) {}
//     }
//     console.error('POST /sales error:', err);
//     res.status(500).json({ message: 'خطأ في حفظ الفاتورة' });
//   }
// });

// /* -----------------------------------------
//    DELETE /api/sales/:id
//    حذف فاتورة (مع عناصرها)
// ----------------------------------------- */
// router.delete('/:id', async (req, res) => {
//   const { id } = req.params;
//   try {
//     await query('DELETE FROM sales WHERE id = ?', [id]);
//     // sale_items محذوفة تلقائيًا إذا كان عندك ON DELETE CASCADE
//     res.json({ message: 'deleted' });
//   } catch (err) {
//     console.error('DELETE /sales/:id error:', err);
//     res.status(500).json({ message: 'خطأ في حذف الفاتورة' });
//   }
// });

// module.exports = router;
