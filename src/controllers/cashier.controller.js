import * as service from "../services/cashier.service.js";

export async function createInvoice(req, res) {
  const id = await service.createInvoice(req.user.id);
  res.json({ id });
}

export async function addItem(req, res) {
  const total = await service.addItem(req.body);
  res.json({ total });
}

export async function removeItem(req, res) {
  const total = await service.removeItem(req.params.id);
  res.json({ total });
}

export async function checkout(req, res) {
  const invoice = await service.checkout(req.body);
  await service.deductStock(req.body.invoice_id);
  res.json(invoice);
}

export async function shiftSummary(req, res) {
  res.json(await service.shiftSummary(req.user.id));
}
