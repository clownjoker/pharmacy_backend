// src/controllers/transactions.controller.js
import {
  getAllTransactions,
  createTransaction,
} from "../services/transactions.service.js";

/**
 * GET /transactions
 * يعيد كل العمليات المالية
 */
export async function listTransactions(req, res) {
  try {
    const items = await getAllTransactions();
    res.json(items);
  } catch (err) {
    console.error("listTransactions error:", err);
    res
      .status(500)
      .json({ message: "خطأ في جلب العمليات المالية", error: err.message });
  }
}

/**
 * POST /transactions
 * إنشاء عملية مالية جديدة
 */
export async function addTransaction(req, res) {
  try {
    const body = req.body || {};

    if (
      body.amount == null ||
      body.amount === "" ||
      !body.date ||
      !body.type ||
      !body.direction
    ) {
      return res.status(400).json({
        message: "الحقول amount, date, type, direction مطلوبة",
      });
    }

    const tx = await createTransaction({
      refCode: body.refCode || null,
      type: body.type,
      direction: body.direction,
      amount: body.amount,
      date: body.date,
      userId: body.userId || null,
      category: body.category || null,
      paymentMethod: body.paymentMethod || null,
      description: body.description || null,
    });

    res.status(201).json(tx);
  } catch (err) {
    console.error("addTransaction error:", err);
    res
      .status(500)
      .json({ message: "فشل حفظ العملية المالية", error: err.message });
  }
}
