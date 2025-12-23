import * as service from "../services/reports.service.js";

export async function overview(req, res) {
  res.json(await service.overview());
}

export async function salesReport(req, res) {
  res.json(await service.salesReport());
}

export async function stockReport(req, res) {
  res.json(await service.stockReport());
}

export async function profitReport(req, res) {
  res.json(await service.profitReport());
}

export async function alertsReport(req, res) {
  res.json(await service.alertsReport());
}
