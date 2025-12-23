import * as service from "../services/products.service.js";

/**
 * GET /products
 */
export async function getProducts(req, res) {
  try {
    const products = await service.getAllProducts();
    res.json(products);
  } catch (err) {
    console.error("getProducts error:", err);
    res.status(500).json({ message: "فشل جلب المنتجات" });
  }
}

/**
 * POST /products
 * ✅ يرجع المنتج كامل بعد الإضافة
 */
export async function createProduct(req, res) {
  try {
    const id = await service.createProduct(req.body);
    const product = await service.getProductById(id);

    res.status(201).json(product);
  } catch (err) {
    console.error("createProduct error:", err);
    res.status(500).json({ message: "فشل إضافة المنتج" });
  }
}

/**
 * DELETE /products/:id
 */
export async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    await service.deleteProduct(id);
    res.json({ success: true });
  } catch (err) {
    console.error("deleteProduct error:", err);
    res.status(500).json({ message: "فشل حذف المنتج" });
  }
}
