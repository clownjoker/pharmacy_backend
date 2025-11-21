// src/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { query, pool } = require('./db');  // تم تصديرهم من db.js بعد التعديل
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');

dotenv.config();

const app = express();

// CORS
app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
  })
);

// JSON Parser
app.use(express.json());

// مسار فحص الصحة
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// الراوترات
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ message: 'المسار غير موجود' });
});

// تشغيل السيرفر
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
});
