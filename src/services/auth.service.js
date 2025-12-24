import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { pool } from "../config/db.js";
import { logActivity } from "../utils/activityLog.js";

// 🔐 JWT Secret موحد (مؤقتًا بدون .env)
const JWT_SECRET = "super_secret_key_123";

export async function login(req, res) {
  // const { username, password } = req.body;

  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({
      message: "username و password مطلوبان",
    });
  }

  try {
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE username = ? AND active = 1 LIMIT 1",
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        message: "اسم المستخدم أو كلمة المرور غير صحيحة",
      });
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        message: "اسم المستخدم أو كلمة المرور غير صحيحة",
      });
    }

    // 🧾 جلب صلاحيات المستخدم (من الدور)
    const [permissionsRows] = await pool.query(
      `
      SELECT p.key
      FROM permissions p
      JOIN role_permissions rp ON rp.permission_id = p.id
      WHERE rp.role_id = ?
      `,
      [user.role_id]
    );

    const permissions = permissionsRows.map(p => p.key);

    // 🔑 إنشاء التوكن
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role_id,
        permissions,
      },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    // 📝 Log activity
    await logActivity({
      userId: user.id,
      action: "login",
      entity: "auth",
      ip: req.ip,
      agent: req.headers["user-agent"],
    });

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role_id,
        permissions,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({
      message: "خطأ في تسجيل الدخول",
    });
  }
}
