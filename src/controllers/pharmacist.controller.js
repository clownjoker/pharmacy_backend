import * as service from "../services/pharmacist.service.js";

export async function listMedicines(req, res) {
  res.json(await service.listMedicines());
}

export async function listSales(req, res) {
  res.json(await service.listPharmacistSales());
}

export async function createSale(req, res) {
  const result = await service.createPharmacistSale(req.body);
  if (!result.ok) {
    return res.status(result.status || 400).json({ message: result.message });
  }
  res.json(result);
}
