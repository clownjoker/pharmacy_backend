import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../config/db.js";

const JWT_SECRET = "pharmacy_secret_key";

export async function login(req, res) {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        message: "اسم المستخدم وكلمة المرور مطلوبان",
      });
    }

    const [rows] = await pool.query(
      `
      SELECT 
        id,
        name,
        username,
        password_hash,
        role_id,
        active
      FROM users
      WHERE username = ?
      LIMIT 1
      `,
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
    }

    const user = rows[0];

    if (!user.active) {
      return res.status(403).json({ message: "الحساب غير مفعل" });
    }

    const passwordOk = await bcrypt.compare(password, user.password_hash);
    if (!passwordOk) {
      return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role_id: user.role_id,
      },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role_id: user.role_id,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ message: "خطأ في السيرفر" });
  }
}
