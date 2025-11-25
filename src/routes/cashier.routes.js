// backend/src/routes/cashier.routes.js
import express from "express";
import db from "../db.js";

const router = express.Router();

/* -----------------------------------------------------
   🧩 دوال مساعدة
----------------------------------------------------- */

// جلب الفاتورة مع عناصرها من قاعدة البيانات
async function getInvoiceWithItems(invoiceId) {
  const [[invoice]] = await db.query(
    `
      SELECT id, user_id, status, total, payment_method, created_at, paid_at
      FROM invoices
      WHERE id = ?
    `,
    [invoiceId]
  );

  if (!invoice) return null;

  const [items] = await db.query(
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

// إعادة احتساب إجمالي الفاتورة من عناصرها
async function recalcInvoiceTotal(invoiceId) {
  const [[row]] = await db.query(
    `
      SELECT COALESCE(SUM(qty * price), 0) AS total
      FROM invoice_items
      WHERE invoice_id = ?
    `,
    [invoiceId]
  );

  const total = Number(row?.total || 0);

  await db.query(
    `
      UPDATE invoices
      SET total = ?
      WHERE id = ?
    `,
    [total, invoiceId]
  );

  return total;
}

/* -----------------------------------------------------
   🟢 إنشاء فاتورة جديدة (حالة open)
   المسار الكامل (لو في server.js عامل):
   app.use("/api/cashier", cashierRoutes);
   → POST /api/cashier/new
----------------------------------------------------- */
router.post("/new", async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: "user_id مطلوب" });
    }

    const [result] = await db.query(
      `
      INSERT INTO invoices (user_id, status, total, created_at)
      VALUES (?, 'open', 0, NOW())
      `,
      [user_id]
    );

    const invoice_id = result.insertId;

    res.json({
      success: true,
      invoice_id,
    });
  } catch (err) {
    console.error("POST /cashier/new error:", err);
    res.status(500).json({ message: "فشل إنشاء الفاتورة" });
  }
});

/* -----------------------------------------------------
   ➕ إضافة صنف إلى الفاتورة
   body: { invoice_id, product_id, qty, price }
----------------------------------------------------- */
router.post("/add-item", async (req, res) => {
  try {
    const { invoice_id, product_id, qty, price } = req.body;

    if (!invoice_id || !product_id || !qty || !price) {
      return res
        .status(400)
        .json({ message: "invoice_id, product_id, qty, price مطلوبة" });
    }

    // التأكد أن الفاتورة مفتوحة
    const [[invoice]] = await db.query(
      `SELECT id, status FROM invoices WHERE id = ?`,
      [invoice_id]
    );

    if (!invoice) {
      return res.status(404).json({ message: "الفاتورة غير موجودة" });
    }

    if (invoice.status !== "open") {
      return res
        .status(400)
        .json({ message: "لا يمكن إضافة عناصر لفاتورة غير مفتوحة" });
    }

    // إدخال العنصر
    await db.query(
      `
      INSERT INTO invoice_items (invoice_id, product_id, qty, price)
      VALUES (?,?,?,?)
      `,
      [invoice_id, product_id, qty, price]
    );

    // إعادة احتساب الإجمالي
    const total = await recalcInvoiceTotal(invoice_id);

    res.json({
      success: true,
      invoice_id,
      total,
    });
  } catch (err) {
    console.error("POST /cashier/add-item error:", err);
    res.status(500).json({ message: "فشل إضافة الصنف" });
  }
});

/* -----------------------------------------------------
   ❌ حذف صنف من الفاتورة
   DELETE /api/cashier/item/:id
----------------------------------------------------- */
router.delete("/item/:id", async (req, res) => {
  try {
    const itemId = req.params.id;

    // نحتاج نعرف الفاتورة التابعة له قبل الحذف
    const [[item]] = await db.query(
      `SELECT invoice_id FROM invoice_items WHERE id = ?`,
      [itemId]
    );

    if (!item) {
      return res.status(404).json({ message: "العنصر غير موجود" });
    }

    const invoiceId = item.invoice_id;

    await db.query(`DELETE FROM invoice_items WHERE id = ?`, [itemId]);

    const total = await recalcInvoiceTotal(invoiceId);

    res.json({
      success: true,
      invoice_id: invoiceId,
      total,
    });
  } catch (err) {
    console.error("DELETE /cashier/item/:id error:", err);
    res.status(500).json({ message: "فشل حذف الصنف" });
  }
});

/* -----------------------------------------------------
   💰 إنهاء الفاتورة (Checkout)
   body: { invoice_id, method }
   method: 'cash' | 'card' | 'wallet' | ...
----------------------------------------------------- */
router.post("/checkout", async (req, res) => {
  try {
    const { invoice_id, method } = req.body;

    if (!invoice_id) {
      return res.status(400).json({ message: "invoice_id مطلوب" });
    }

    const payment_method = method || "cash";

    const [invRows] = await db.query(
      `SELECT id, status FROM invoices WHERE id = ?`,
      [invoice_id]
    );

    if (!invRows.length) {
      return res.status(404).json({ message: "الفاتورة غير موجودة" });
    }

    const invoice = invRows[0];

    if (invoice.status !== "open") {
      return res
        .status(400)
        .json({ message: "لا يمكن إنهاء فاتورة غير مفتوحة" });
    }

    // إعادة حساب الإجمالي
    const total = await recalcInvoiceTotal(invoice_id);

    // تحديث حالة الفاتورة
    await db.query(
      `
      UPDATE invoices
      SET status='paid', payment_method=?, total=?, paid_at=NOW()
      WHERE id=?
      `,
      [payment_method, total, invoice_id]
    );

    const invoiceFull = await getInvoiceWithItems(invoice_id);

    res.json({
      success: true,
      invoice_id,
      total,
      payment_method,
      invoice: invoiceFull,
    });
  } catch (err) {
    console.error("POST /cashier/checkout error:", err);
    res.status(500).json({ message: "فشل إنهاء الفاتورة" });
  }
});

/* -----------------------------------------------------
   🏪 خصم الكميات من المخزن تلقائيًا
   body: { invoice_id }
----------------------------------------------------- */
router.post("/deduct-stock", async (req, res) => {
  try {
    const { invoice_id } = req.body;

    if (!invoice_id) {
      return res.status(400).json({ message: "invoice_id مطلوب" });
    }

    const [items] = await db.query(
      `
      SELECT product_id, qty 
      FROM invoice_items
      WHERE invoice_id = ?
      `,
      [invoice_id]
    );

    if (!items.length) {
      return res
        .status(400)
        .json({ message: "لا توجد عناصر لهذه الفاتورة" });
    }

    for (const item of items) {
      await db.query(
        `
        UPDATE inventory_products 
        SET quantity = quantity - ?
        WHERE id = ?
        `,
        [item.qty, item.product_id]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error("POST /cashier/deduct-stock error:", err);
    res.status(500).json({ message: "فشل خصم المخزون" });
  }
});

/* -----------------------------------------------------
   🔎 جلب فاتورة بالتفاصيل (اختياري للعرض/الطباعة)
   GET /api/cashier/invoice/:id
----------------------------------------------------- */
router.get("/invoice/:id", async (req, res) => {
  try {
    const invoiceId = req.params.id;

    const invoice = await getInvoiceWithItems(invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: "الفاتورة غير موجودة" });
    }

    res.json(invoice);
  } catch (err) {
    console.error("GET /cashier/invoice/:id error:", err);
    res.status(500).json({ message: "فشل جلب بيانات الفاتورة" });
  }
});


/* -----------------------------------------------------
   📊 ملخص الوردية (عدد الفواتير – إجمالي – متوسط)
   GET /api/cashier/shift-summary/:cashierId
----------------------------------------------------- */
router.get("/shift-summary/:cashierId", async (req, res) => {
  try {
    const cashierId = req.params.cashierId;

    // تأكيد وجود الكاشير
    if (!cashierId) {
      return res.status(400).json({ message: "cashierId مطلوب" });
    }

    // حساب بيانات اليوم فقط
    const [rows] = await db.query(
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

    res.json({
      success: true,
      invoice_count: rows[0].invoice_count,
      total_sales: rows[0].total_sales,
      avg_sale: rows[0].avg_sale,
    });

  } catch (err) {
    console.error("GET /cashier/shift-summary error:", err);
    res.status(500).json({ message: "فشل جلب ملخص الوردية" });
  }
});

// إغلاق الوردية


// إغلاق الوردية حسب جدول shifts الحقيقي
router.post("/close-shift", async (req, res) => {
  try {
    const { cashier_id } = req.body;

    if (!cashier_id) {
      return res.status(400).json({ message: "cashier_id مطلوب" });
    }

    // هل توجد وردية مفتوحة لهذا الكاشير؟
    const [rows] = await db.query(
      `
      SELECT id FROM shifts
      WHERE opened_by = ? AND status = 'open'
      LIMIT 1
      `,
      [cashier_id]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: "لا توجد وردية مفتوحة" });
    }

    const shiftId = rows[0].id;

    // إغلاق الوردية بالفعل
    await db.query(
      `
      UPDATE shifts
      SET status = 'closed',
          closed_by = ?,
          close_time = NOW()
      WHERE id = ?
      `,
      [cashier_id, shiftId]
    );

    res.json({ success: true, message: "تم إغلاق الوردية بنجاح" });

  } catch (err) {
    console.error("close-shift error:", err);
    res.status(500).json({ message: "فشل إغلاق الوردية" });
  }
});


// فتح وردية للكاشير
router.post("/start-shift", async (req, res) => {
  try {
    const { cashier_id } = req.body;

    if (!cashier_id) {
      return res.status(400).json({ message: "cashier_id مطلوب" });
    }

    // هل توجد وردية مفتوحة بالفعل؟
    const [rows] = await db.query(
      `
      SELECT id FROM shifts
      WHERE opened_by = ? AND status = 'open'
      LIMIT 1
      `,
      [cashier_id]
    );

    // إن كانت موجودة، أعدها للمستخدم
    if (rows.length > 0) {
      return res.json({
        success: true,
        shift_id: rows[0].id,
        message: "وردية مفتوحة بالفعل"
      });
    }

    // لا توجد → افتح وردية جديدة
    const [result] = await db.query(
      `
      INSERT INTO shifts (opened_by, open_time, status)
      VALUES (?, NOW(), 'open')
      `,
      [cashier_id]
    );

    res.json({ success: true, shift_id: result.insertId, message: "تم فتح وردية جديدة" });

  } catch (err) {
    console.error("start-shift error:", err);
    res.status(500).json({ message: "فشل فتح الوردية" });
  }
});


export default router;









// import express from "express";
// import db from "../db.js";

// const router = express.Router();

// /* -----------------------------------------------------
//    🟢 إنشاء فاتورة جديدة (حالة open)
// ----------------------------------------------------- */
// router.post("/new", async (req, res) => {
//   try {
//     const { user_id } = req.body;

//     const [result] = await db.query(
//       `
//       INSERT INTO invoices (user_id, status, total, created_at)
//       VALUES (?, 'open', 0, NOW())
//       `,
//       [user_id]
//     );

//     res.json({ success: true, invoice_id: result.insertId });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "فشل إنشاء فاتورة" });
//   }
// });

// /* -----------------------------------------------------
//    ➕ إضافة صنف للفاتورة
// ----------------------------------------------------- */
// router.post("/add-item", async (req, res) => {
//   try {
//     const { invoice_id, product_id, qty, price } = req.body;

//     await db.query(
//       `
//       INSERT INTO invoice_items (invoice_id, product_id, qty, price)
//       VALUES (?, ?, ?, ?)
//       `,
//       [invoice_id, product_id, qty, price]
//     );

//     res.json({ success: true });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "فشل إضافة صنف" });
//   }
// });

// /* -----------------------------------------------------
//    🧾 جلب تفاصيل الفاتورة
// ----------------------------------------------------- */
// router.get("/:id", async (req, res) => {
//   try {
//     const invoice_id = req.params.id;

//     const [[invoice]] = await db.query(
//       `SELECT * FROM invoices WHERE id=?`,
//       [invoice_id]
//     );

//     const [items] = await db.query(
//       `
//       SELECT ii.*, p.name 
//       FROM invoice_items ii
//       JOIN inventory_products p ON p.id = ii.product_id
//       WHERE ii.invoice_id=?
//       `,
//       [invoice_id]
//     );

//     res.json({ success: true, invoice, items });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "فشل جلب الفاتورة" });
//   }
// });

// /* -----------------------------------------------------
//    🔴 حذف صنف من الفاتورة
// ----------------------------------------------------- */
// router.delete("/item/:id", async (req, res) => {
//   try {
//     await db.query(`DELETE FROM invoice_items WHERE id=?`, [req.params.id]);
//     res.json({ success: true });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "فشل حذف الصنف" });
//   }
// });

// /* -----------------------------------------------------
//    💳 إغلاق الفاتورة (الدفع)
// ----------------------------------------------------- */
// router.post("/checkout", async (req, res) => {
//   try {
//     const { invoice_id, method } = req.body;

//     // حساب الإجمالي
//     const [[{ total }]] = await db.query(
//       `
//       SELECT SUM(qty * price) AS total
//       FROM invoice_items
//       WHERE invoice_id = ?
//       `,
//       [invoice_id]
//     );

//     // تحديث الفاتورة
//     await db.query(
//       `
//       UPDATE invoices 
//       SET total=?, status='paid', payment_method=?
//       WHERE id=?
//       `,
//       [total, method, invoice_id]
//     );

//     // تحديث الشفت
//     if (method === "cash") {
//       await db.query(
//         `UPDATE shift_totals SET total_cash = total_cash + ? WHERE shift_id=(SELECT id FROM shifts WHERE status='open')`,
//         [total]
//       );
//     } else if (method === "card") {
//       await db.query(
//         `UPDATE shift_totals SET total_card = total_card + ? WHERE shift_id=(SELECT id FROM shifts WHERE status='open')`,
//         [total]
//       );
//     }

//     res.json({ success: true, total });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "خطأ أثناء إنهاء الفاتورة" });
//   }
// });

// /* -----------------------------------------------------
//    🏪 خصم الكميات من المخزن تلقائيًا
// ----------------------------------------------------- */
// router.post("/deduct-stock", async (req, res) => {
//   try {
//     const { invoice_id } = req.body;

//     const [items] = await db.query(
//       `
//       SELECT product_id, qty 
//       FROM invoice_items
//       WHERE invoice_id=?
//       `,
//       [invoice_id]
//     );

//     for (const item of items) {
//       await db.query(
//         `UPDATE inventory_products SET quantity = quantity - ? WHERE id=?`,
//         [item.qty, item.product_id]
//       );
//     }

//     res.json({ success: true });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "فشل خصم المخزون" });
//   }
// });

// export default router;
