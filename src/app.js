import express from "express";
import cors from "cors";

// routes
import authRoutes from "./routes/auth.routes.js";
import usersRoutes from "./routes/users.routes.js";
import productsRoutes from "./routes/products.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import salesRoutes from "./routes/sales.routes.js";
import cashierRoutes from "./routes/cashier.routes.js";
import pharmacistRoutes from "./routes/pharmacist.routes.js";
import transactionsRoutes from "./routes/transactions.routes.js";
import shiftsRoutes from "./routes/shifts.routes.js";
import reportsRoutes from "./routes/reports.routes.js";

const app = express();

// ✅ الحل القاطع لمشكلة req.body
app.use(express.json({ type: "*/*" }));
app.use(express.urlencoded({ extended: true }));

app.use(cors());

// routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/cashier", cashierRoutes);
app.use("/api/pharmacist", pharmacistRoutes);
app.use("/api/transactions", transactionsRoutes);
app.use("/api/shifts", shiftsRoutes);
app.use("/api/reports", reportsRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Not Found" });
});

export default app;
