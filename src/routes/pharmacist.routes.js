import express from "express";
import db from "../db.js";

const router = express.Router();

/* ===============================
   1️⃣ جلب قائمة الأدوية من جدول products
================================= */

router.get("/medicines", async (req, res) => {
  try {
    const [rows] = await db.query(
      `
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
      `
    );

    res.json({ success: true, data: rows });

  } catch (err) {
    console.error("GET /pharmacist/medicines error:", err);
    res.status(500).json({ success: false, message: "فشل جلب الأدوية" });
  }
});


/* ===============================
   2️⃣ جلب مبيعات الصيدلي (من جدول pharmacist_sales)
================================= */

router.get("/sales", async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT 
        id,
        DATE(sale_date) AS date,
        medicine_name AS name,
        qty,
        price
      FROM pharmacist_sales
      ORDER BY sale_date DESC, id DESC
      `
    );

    res.json({ success: true, data: rows });

  } catch (err) {
    console.error("GET /pharmacist/sales error:", err);
    res.status(500).json({ success: false, message: "فشل جلب مبيعات الصيدلي" });
  }
});


/* ===============================
   3️⃣ تسجيل عملية بيع وخصم المخزون
================================= */

// router.post("/sale", async (req, res) => {
//   const { medicine_id, qty, price, pharmacist_id } = req.body;

//   try {
//     if (!medicine_id || !qty) {
//       return res.status(400).json({ success: false, message: "البيانات ناقصة" });
//     }

//     // بدء transaction
//     const conn = await db.getConnection();
//     try {
//       await conn.beginTransaction();

//       // جلب الدواء
//       const [rows] = await conn.query(
//         `SELECT * FROM products WHERE id = ? FOR UPDATE`,
//         [medicine_id]
//       );

//       if (!rows.length) {
//         await conn.rollback();
//         return res.json({ success: false, message: "الدواء غير موجود" });
//       }

//       const product = rows[0];

//       const sellPrice = Number(price || product.price);
//       const quantityToSell = Number(qty);

//       if (quantityToSell > product.quantity) {
//         await conn.rollback();
//         return res.json({ success: false, message: "الكمية المطلوبة أكبر من المخزون" });
//       }

//       const total = sellPrice * quantityToSell;

//       // تسجيل عملية البيع
//       const [result] = await conn.query(
//         `
//         INSERT INTO pharmacist_sales
//           (medicine_id, medicine_name, qty, price, total, sale_date, pharmacist_id)
//         VALUES (?, ?, ?, ?, ?, NOW(), ?)
//         `,
//         [
//           product.id,
//           product.name,
//           quantityToSell,
//           sellPrice,
//           total,
//           pharmacist_id || null,
//         ]
//       );

//       // خصم المخزون
//       await conn.query(
//         `
//         UPDATE products 
//         SET quantity = quantity - ?
//         WHERE id = ?
//         `,
//         [quantityToSell, product.id]
//       );

//       await conn.commit();

//       res.json({
//         success: true,
//         sale: {
//           id: result.insertId,
//           date: new Date().toISOString().slice(0, 10),
//           name: product.name,
//           qty: quantityToSell,
//           price: sellPrice,
//         },
//         medicine: {
//           id: product.id,
//           quantity: product.quantity - quantityToSell,
//         },
//       });

//     } catch (err) {
//       await conn.rollback();
//       console.error("TX error:", err);
//       res.status(500).json({ success: false, message: "فشل تسجيل عملية البيع" });
//     } finally {
//       conn.release();
//     }

//   } catch (err) {
//     console.error("POST /pharmacist/sale error:", err);
//     res.status(500).json({ success: false, message: "فشل تسجيل عملية البيع" });
//   }
// });

router.post("/sale", async (req, res) => {
  const { medicine_id, qty, price, pharmacist_id } = req.body;

  try {
    if (!medicine_id || !qty) {
      return res.status(400).json({
        success: false,
        message: "البيانات ناقصة",
      });
    }

    // 1) جلب المنتج
    const [rows] = await db.query(
      `SELECT * FROM products WHERE id = ?`,
      [medicine_id]
    );

    if (!rows.length) {
      return res.json({
        success: false,
        message: "الدواء غير موجود",
      });
    }

    const product = rows[0];
    const q = Number(qty);
    const sellPrice = Number(price || product.price);

    if (q > product.quantity) {
      return res.json({
        success: false,
        message: "الكمية المطلوبة أكبر من المخزون",
      });
    }

    const total = sellPrice * q;

    // 2) تسجيل البيع
    const [insertSale] = await db.query(
      `
      INSERT INTO pharmacist_sales
        (medicine_id, medicine_name, qty, price, total, sale_date, pharmacist_id)
      VALUES (?, ?, ?, ?, ?, NOW(), ?)
      `,
      [
        product.id,
        product.name,
        q,
        sellPrice,
        total,
        pharmacist_id || null,
      ]
    );

    // 3) تحديث المخزون
    await db.query(
      `UPDATE products SET quantity = quantity - ? WHERE id = ?`,
      [q, product.id]
    );

    return res.json({
      success: true,
      message: "تم تسجيل عملية البيع بنجاح",
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
    });

  } catch (err) {
    console.error("🔥 sale endpoint error:", err);
    return res.status(500).json({
      success: false,
      message: "فشل تسجيل عملية البيع",
    });
  }
});


export default router;
