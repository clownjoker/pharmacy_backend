// src/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { logActivity } = require('../utils/activityLog');

const router = express.Router();

/**
 * دالة مساعدة: تجلب الصلاحيات الفعّالة لمستخدم:
 * - صلاحيات دوره (role_permissions)
 * - زائد صلاحياته الخاصة (user_permissions)
 */
async function getUserPermissions(userId, roleId) {
  const [rows] = await pool.query(
    `
    SELECT DISTINCT p.\`key\` AS perm_key
    FROM permissions p
    LEFT JOIN role_permissions rp
      ON rp.permission_id = p.id AND rp.role_id = ?
    LEFT JOIN user_permissions up
      ON up.permission_id = p.id AND up.user_id = ?
    WHERE rp.role_id IS NOT NULL OR up.user_id IS NOT NULL
    `,
    [roleId, userId]
  );

  return rows.map((r) => r.perm_key);
}

// 🔹 إنشاء أول مدير نظام (لو ما في admin)
router.post('/init-super-admin', async (req, res) => {
  try {
    const [exists] = await pool.query(
      "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
    );
    if (exists.length) {
      return res
        .status(400)
        .json({ message: 'يوجد مدير نظام مسبقًا، لا يمكن إنشاء آخر بهذه الطريقة' });
    }

    // نجيب role_id للـ admin
    const [roleRows] = await pool.query(
      "SELECT id FROM roles WHERE slug = 'admin' LIMIT 1"
    );
    if (!roleRows.length) {
      return res.status(500).json({
        message: 'دور admin غير موجود في جدول roles، تأكد من تنفيذ سكربت الـ seed',
      });
    }

    const adminRoleId = roleRows[0].id;
    const hash = await bcrypt.hash('123456', 10);

    const [result] = await pool.query(
      `INSERT INTO users (name, username, email, password_hash, role, role_id, is_active)
       VALUES (?,?,?,?,?,?,1)`,
      [
        'مدير النظام',
        'admin',
        'admin@pharmacy.com',
        hash,
        'admin',
        adminRoleId,
      ]
    );

    return res.json({
      message: '✅ تم إنشاء مدير النظام بنجاح',
      username: 'admin',
      password: '123456',
      id: result.insertId,
    });
  } catch (err) {
    console.error('init-super-admin error:', err);
    return res.status(500).json({ message: 'خطأ في إنشاء مدير النظام' });
  }
});

// 🔹 تسجيل الدخول
// 🔹 تسجيل الدخول
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: 'الرجاء إدخال اسم المستخدم وكلمة المرور' });
    }

    const [rows] = await pool.query(
      `
      SELECT u.id, u.name, u.username, u.email, u.password_hash,
             u.role, u.role_id, u.is_active,
             r.slug AS role_slug
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.username = ?
      LIMIT 1
      `,
      [username]
    );

    if (!rows.length) {
      return res.status(401).json({ message: 'بيانات الدخول غير صحيحة' });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res
        .status(403)
        .json({ message: 'الحساب موقوف، تواصل مع مدير النظام' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: 'بيانات الدخول غير صحيحة' });
    }

    // 🔸 جلب الصلاحيات من RBAC
    if (!user.role_id) {
      return res.status(500).json({
        message: 'لا يوجد role_id للمستخدم، تأكد من ربط المستخدم بالأدوار',
      });
    }

    const permissions = await getUserPermissions(user.id, user.role_id);

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role_slug || user.role,
        permissions,
      },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    const safeUser = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role_slug || user.role,
      permissions,
      is_active: !!user.is_active,
    };

    // 🔥 **تسجيل النشاط: تسجيل الدخول**
    await logActivity({
      userId: user.id,
      action: 'login',
      entity: 'user',
      entityId: String(user.id),
      details: { username: user.username },
      ip: req.ip,
      agent: req.headers['user-agent'] || null,
    });

    return res.json({ token, user: safeUser });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ message: 'خطأ داخلي في تسجيل الدخول' });
  }
});


// 🔹 /me — فحص التوكن وجلب بيانات المستخدم
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ message: 'توكن مفقود' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret');

    const [rows] = await pool.query(
      `
      SELECT u.id, u.name, u.username, u.email, u.role, u.role_id, u.is_active,
             r.slug AS role_slug
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.id = ?
      LIMIT 1
      `,
      [payload.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(403).json({ message: 'الحساب موقوف' });
    }

    const permissions = await getUserPermissions(user.id, user.role_id);

    const safeUser = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role_slug || user.role,
      permissions,
      is_active: !!user.is_active,
    };

    return res.json({ user: safeUser });
  } catch (err) {
    console.error('/me error:', err);
    return res.status(401).json({ message: 'توكن غير صالح أو منتهي' });
  }
});

module.exports = router;
