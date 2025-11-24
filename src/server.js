import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import productRoutes from "./routes/products.js";
import salesRoutes from "./routes/sales.js";
import transactionsRoutes from "./routes/transactions.js";
// import shiftsRoutes from "./routes/shifts.js";
import reportsRoutes from "./routes/reports.js";


const app = express();

app.use(cors());
app.use(bodyParser.json());

// جميع المسارات داخل /api
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/transactions", transactionsRoutes);
// app.use("/api/shifts", shiftsRoutes);
app.use("/api/reports", reportsRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ message: "المسار غير موجود" });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});





// // src/server.js

// import express from "express";
// import cors from "cors";
// import dotenv from "dotenv";

// import authRoutes from "./routes/auth.js";
// import usersRoutes from "./routes/users.js";
// import productsRoutes from "./routes/products.js";
// import salesRoutes from "./routes/sales.js";
// import transactionsRoutes from "./routes/transactions.js";
// import shiftRoutes from "./routes/shifts.js";


// dotenv.config();

// const app = express();

// // CORS لكل الواجهات المحلية
// app.use(
//   cors({
//     origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
//     credentials: true,
//   })
// );

// // Body parser
// app.use(express.json());

// // Health check
// app.get("/api/health", (req, res) => {
//   res.json({ status: "ok", time: new Date().toISOString() });
// });

// // Routes
// app.use("/api/auth", authRoutes);
// app.use("/api/users", usersRoutes);
// app.use("/api/products", productsRoutes);
// app.use('/api/sales', salesRoutes);
// app.use("/api/transactions", transactionsRoutes);
// app.use("/api/shift", shiftRoutes);

// // 404
// app.use((req, res) => {
//   res.status(404).json({ message: "المسار غير موجود" });
// });

// // Run server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`🚀 API server running on http://localhost:${PORT}`);
// });
