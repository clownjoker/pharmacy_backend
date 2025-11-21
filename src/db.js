const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'pharmacy_db',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// 🔥 هنا السحر
async function query(sql, params) {
  const [rows] = await pool.query(sql, params);
  return [rows];
}

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('✅ DB connection OK');
  } catch (err) {
    console.error('❌ DB connection failed:', err.message);
  }
}

module.exports = {
  query,     // <-- هذا ما كان موجود
  pool,
  testConnection
};

