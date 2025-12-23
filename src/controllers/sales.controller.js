import * as SalesService from "../services/sales.service.js";

export const getSales = async (req, res) => {
  try {
    const sales = await SalesService.getAllSales();
    res.json(sales);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "خطأ في جلب المبيعات" });
  }
};

export const getSaleById = async (req, res) => {
  try {
    const sale = await SalesService.getSaleDetails(req.params.id);
    res.json(sale);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "خطأ في جلب تفاصيل الفاتورة" });
  }
};

export const createSale = async (req, res) => {
  try {
    const sale = await SalesService.createSale(req.body);
    res.status(201).json(sale);
  } catch (err) {
    console.error("createSale error:", err.message);
    res.status(400).json({ message: err.message });
  }
};

export const deleteSale = async (req, res) => {
  try {
    await SalesService.deleteSale(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "خطأ في حذف الفاتورة" });
  }
};
