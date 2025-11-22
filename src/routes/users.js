import express from "express";
import db from "../db.js";
import bcrypt from "bcrypt";

const router = express.Router();

/* ------------------------------------------------------
   📌 مساعد: جلب صلاحيات المستخدمين بشكل صحيح
------------------------------------------------------ */
async function attachPermissionsToUsers(users) {
  if (!users.length) return users;

  const userIds = users.map(u => u.id);

  const [rows] = await db.query(
    `
      SELECT 
        up.user_id,
        p.key AS permission_key
      FROM user_permissions up
      JOIN permissions p ON p.id = up.permission_id
      WHERE up.user_id IN (?)
    `,
    [userIds]
  );

  const map = {};
  rows.forEach((r) => {
    if (!map[r.user_id]) map[r.user_id] = [];
    map[r.user_id].push(r.permission_key);
  });

  return users.map(u => ({
    ...u,
    permissions: map[u.id] || []
  }));
}

/* ------------------------------------------------------
   📌 GET كل المستخدمين
------------------------------------------------------ */
router.get("/", async (req, res) => {
  try {
    const [users] = await db.query(`
      SELECT id, name, username, email, role, active, created_at
      FROM users
      ORDER BY id ASC
    `);

    const finalUsers = await attachPermissionsToUsers(users);

    res.json(finalUsers);

  } catch (err) {
    console.error("GET /users error:", err);
    res.status(500).json({ message: "خطأ في جلب المستخدمين" });
  }
});

/* ------------------------------------------------------
   📌 POST إضافة مستخدم
------------------------------------------------------ */
router.post("/", async (req, res) => {
  try {
    const { name, username, email, password, role, active } = req.body;

    const hashed = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `
        INSERT INTO users (name, username, email, password_hash, role, active)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [name, username, email, hashed, role, active ? 1 : 0]
    );

    const user = {
      id: result.insertId,
      name,
      username,
      email,
      role,
      active,
      permissions: [],
    };

    res.json(user);

  } catch (err) {
    console.error("POST /users error:", err);
    res.status(500).json({ message: "خطأ في إنشاء المستخدم" });
  }
});

/* ------------------------------------------------------
   📌 PATCH تفعيل / إيقاف مستخدم
------------------------------------------------------ */
router.patch("/:id/toggle", async (req, res) => {
  try {
    const userId = req.params.id;

    const [[user]] = await db.query(
      `SELECT active FROM users WHERE id=?`,
      [userId]
    );

    const newState = user.active ? 0 : 1;

    await db.query(
      `UPDATE users SET active=? WHERE id=?`,
      [newState, userId]
    );

    res.json({ active: newState });

  } catch (err) {
    console.error("PATCH /users/:id/toggle error:", err);
    res.status(500).json({ message: "خطأ في تغيير الحالة" });
  }
});

/* ------------------------------------------------------
   📌 DELETE حذف مستخدم
------------------------------------------------------ */
router.delete("/:id", async (req, res) => {
  try {
    await db.query(`DELETE FROM users WHERE id=?`, [req.params.id]);
    res.json({ message: "تم حذف المستخدم" });

  } catch (err) {
    console.error("DELETE /users/:id error:", err);
    res.status(500).json({ message: "خطأ في الحذف" });
  }
});

/* ------------------------------------------------------
   📌 PUT حفظ صلاحيات المستخدم
------------------------------------------------------ */
router.put("/:id/permissions", async (req, res) => {
  try {
    const userId = req.params.id;
    const { permissions } = req.body;

    // 🧹 حذف الصلاحيات القديمة
    await db.query(`DELETE FROM user_permissions WHERE user_id=?`, [userId]);

    if (permissions.length > 0) {
      const [rows] = await db.query(`
        SELECT id, \`key\` 
        FROM permissions 
        WHERE \`key\` IN (?)
      `, [permissions]);

      if (rows.length === 0) {
        return res.status(400).json({ message: "صلاحيات غير صالحة" });
      }

      const values = rows.map((p) => [userId, p.id]);

      await db.query(
        `INSERT INTO user_permissions (user_id, permission_id)
         VALUES ?`,
        [values]
      );

    }

    res.json({ message: "تم حفظ الصلاحيات" });

  } catch (err) {
    console.error("PUT /users/:id/permissions error:", err);
    res.status(500).json({ message: "خطأ في حفظ الصلاحيات" });
  }
});

export default router;
















// // src/routes/users.js
// const express = require('express');
// const bcrypt = require('bcryptjs');
// const db = require('../db');

// const router = express.Router();

// // 🧩 دالة تربط الصلاحيات مع المستخدمين
// async function attachPermissionsToUsers(users) {
//   if (!users || !users.length) return users;

//   const ids = users.map(u => u.id);
//   const placeholders = ids.map(() => '?').join(',');
//   const [rows] = await db.query(
//     `SELECT user_id, permission_key 
//      FROM user_permissions 
//      WHERE user_id IN (${placeholders})`,
//     ids
//   );

//   const map = {};
//   rows.forEach(row => {
//     if (!map[row.user_id]) map[row.user_id] = [];
//     map[row.user_id].push(row.permission_key);
//   });

//   return users.map(u => ({
//     ...u,
//     permissions: map[u.id] || [],
//   }));
// }

// // 🟢 جلب المستخدمين
// router.get('/', async (req, res) => {
//   try {
//     const [rows] = await db.query(
//       'SELECT id, name, username, email, role, active, created_at FROM users ORDER BY id ASC'
//     );

//     const usersWithPerms = await attachPermissionsToUsers(rows);
//     res.json(usersWithPerms);
//   } catch (err) {
//     console.error('GET /users error:', err);
//     res.status(500).json({ message: 'خطأ في جلب المستخدمين' });
//   }
// });

// // ➕ إضافة مستخدم
// router.post('/', async (req, res) => {
//   try {
//     const { name, username, email, password, role } = req.body;

//     if (!name || !username || !password) {
//       return res.status(400).json({ message: 'الحقول الأساسية مطلوبة' });
//     }

//     const safeRole = ['admin', 'pharmacist', 'cashier'].includes(role)
//       ? role
//       : 'cashier';

//     // التأكد من عدم تكرار اسم المستخدم
//     const [existing] = await db.query(
//       'SELECT id FROM users WHERE username = ? LIMIT 1',
//       [username]
//     );
//     if (existing.length) {
//       return res
//         .status(409)
//         .json({ message: 'اسم المستخدم مستخدم مسبقًا' });
//     }

//     const passwordHash = await bcrypt.hash(password, 10);

//     // ملاحظة: نخزن الباسورد المشفّر في عمود "password"
//     const [result] = await db.query(
//       `INSERT INTO users (name, username, email, password_hash, role, active)
//        VALUES (?,?,?,?,?,1)`,
//       [name, username, email || null, passwordHash, safeRole]
//     );

//     const [rows] = await db.query(
//       'SELECT id, name, username, email, role, active, created_at FROM users WHERE id = ?',
//       [result.insertId]
//     );

//     const [userWithPerms] = await attachPermissionsToUsers(rows);
//     res.status(201).json(userWithPerms);
//   } catch (err) {
//     console.error('POST /users error:', err);
//     res.status(500).json({ message: 'خطأ في إنشاء المستخدم' });
//   }
// });

// // 🔄 تفعيل / تعطيل مستخدم
// router.patch('/:id/toggle', async (req, res) => {
//   try {
//     const userId = parseInt(req.params.id, 10);

//     const [rows] = await db.query(
//       'SELECT active FROM users WHERE id = ?',
//       [userId]
//     );
//     if (!rows.length) {
//       return res.status(404).json({ message: 'المستخدم غير موجود' });
//     }

//     const current = rows[0].active ? 1 : 0;
//     const next = current ? 0 : 1;

//     await db.query(
//       'UPDATE users SET active = ? WHERE id = ?',
//       [next, userId]
//     );

//     res.json({ id: userId, active: !!next });
//   } catch (err) {
//     console.error('PATCH /users/:id/toggle error:', err);
//     res.status(500).json({ message: 'خطأ في تحديث حالة المستخدم' });
//   }
// });

// // 🗑️ حذف مستخدم
// router.delete('/:id', async (req, res) => {
//   try {
//     const userId = parseInt(req.params.id, 10);

//     await db.query('DELETE FROM user_permissions WHERE user_id = ?', [userId]);
//     await db.query('DELETE FROM users WHERE id = ?', [userId]);

//     res.json({ message: 'تم حذف المستخدم' });
//   } catch (err) {
//     console.error('DELETE /users/:id error:', err);
//     res.status(500).json({ message: 'خطأ في حذف المستخدم' });
//   }
// });

// // 📥 جلب صلاحيات مستخدم واحد (اختياري لو احتجته)
// router.get('/:id/permissions', async (req, res) => {
//   try {
//     const userId = parseInt(req.params.id, 10);

//     const [rows] = await db.query(
//       'SELECT permission_key FROM user_permissions WHERE user_id = ?',
//       [userId]
//     );

//     const perms = rows.map(r => r.permission_key);
//     res.json({ userId, permissions: perms });
//   } catch (err) {
//     console.error('GET /users/:id/permissions error:', err);
//     res.status(500).json({ message: 'خطأ في جلب الصلاحيات' });
//   }
// });

// // 💾 حفظ الصلاحيات
// router.put('/:id/permissions', async (req, res) => {
//   const userId = Number(req.params.id);
//   const { permissions } = req.body;

//   if (!userId || Number.isNaN(userId)) {
//     return res.status(400).json({ message: 'معرّف المستخدم غير صالح' });
//   }

//   if (!Array.isArray(permissions)) {
//     return res.status(400).json({ message: 'تنسيق الصلاحيات غير صحيح' });
//   }

//   try {
//     // 1) نحذف الصلاحيات القديمة
//     await db.query('DELETE FROM user_permissions WHERE user_id = ?', [userId]);

//     // 2) نضيف الجديدة لو فيه أي صلاحيات
//     if (permissions.length > 0) {
//       // نكوّن values بالشكل (?, ?), (?, ?), ...
//       const valuesPlaceholders = permissions.map(() => '(?, ?)').join(', ');
//       const flatValues = permissions.flatMap((p) => [userId, p]);

//       await db.query(
//         `INSERT INTO user_permissions (user_id, permission_key) VALUES ${valuesPlaceholders}`,
//         flatValues
//       );
//     }

//     return res.json({ message: 'تم حفظ الصلاحيات بنجاح' });
//   } catch (err) {
//     console.error('PUT /users/:id/permissions error:', err);
//     return res.status(500).json({ message: 'خطأ في حفظ الصلاحيات' });
//   }
// });

// module.exports = router;














// // routes/users.js
// const express = require('express');
// const bcrypt = require('bcryptjs');
// const router = express.Router();
// const db = require('../db'); // تأكد من المسار حسب مشروعك

// // 🔹 صلاحيات النظام القياسية
// const ALL_PERMISSIONS = [
//   'view_reports',
//   'add_sale',
//   'manage_medicines',
//   'manage_users',
//   'view_inventory',
// ];

// // 🔹 صلاحيات افتراضية لكل دور
// const ROLE_DEFAULT_PERMISSIONS = {
//   admin: ALL_PERMISSIONS,
//   pharmacist: ['manage_medicines', 'view_inventory', 'add_sale', 'view_reports'],
//   cashier: ['add_sale'],
// };

// /**
//  * مساعد: تحميل صلاحيات مجموعة مستخدمين مرة واحدة
//  */
// async function attachPermissionsToUsers(users) {
//   if (!users.length) return users;

//   const ids = users.map((u) => u.id);
//   const [rows] = await db.query(
//     'SELECT user_id, permission_key FROM user_permissions WHERE user_id IN (?)',
//     [ids]
//   );

//   const map = {};
//   for (const row of rows) {
//     if (!map[row.user_id]) map[row.user_id] = [];
//     map[row.user_id].push(row.permission_key);
//   }

//   return users.map((u) => ({
//     ...u,
//     permissions: map[u.id] || [],
//   }));
// }

// /**
//  * GET /api/users
//  * جلب كل المستخدمين مع الصلاحيات
//  */
// router.get('/', async (req, res) => {
//   try {
//     const [rows] = await db.query(
//       'SELECT id, name, username, email, role, active, created_at FROM users ORDER BY id ASC'
//     );

//     const usersWithPerms = await attachPermissionsToUsers(rows);

//     res.json(usersWithPerms);
//   } catch (err) {
//     console.error('GET /users error:', err);
//     res.status(500).json({ message: 'خطأ في جلب المستخدمين' });
//   }
// });

// /**
//  * POST /api/users
//  * body: { name, username, email, password, role }
//  */
// router.post('/', async (req, res) => {
//   try {
//     const { name, username, email, password, role } = req.body || {};

//     if (!name || !username || !password) {
//       return res
//         .status(400)
//         .json({ message: 'الاسم واسم المستخدم وكلمة المرور مطلوبة' });
//     }

//     const safeRole = role || 'cashier';

//     // تأكد من عدم تكرار اسم المستخدم
//     const [existing] = await db.query(
//       'SELECT id FROM users WHERE username = ? LIMIT 1',
//       [username]
//     );
//     if (existing.length) {
//       return res.status(409).json({ message: 'اسم المستخدم مستخدم مسبقًا' });
//     }

//     const passwordHash = await bcrypt.hash(password, 10);

//     const [result] = await db.query(
//       `INSERT INTO users (name, username, email, password_hash, role, active)
//        VALUES (?,?,?,?,?,1)`,
//       [name, username, email || null, passwordHash, safeRole]
//     );

//     const newUserId = result.insertId;

//     // إدخال الصلاحيات الافتراضية حسب الدور
//     const defaultPerms = ROLE_DEFAULT_PERMISSIONS[safeRole] || [];
//     if (defaultPerms.length) {
//       const values = defaultPerms.map((p) => [newUserId, p]);
//       await db.query(
//         'INSERT INTO user_permissions (user_id, permission_key) VALUES ?',
//         [values]
//       );
//     }

//     res.status(201).json({
//       id: newUserId,
//       name,
//       username,
//       email,
//       role: safeRole,
//       active: 1,
//       permissions: defaultPerms,
//     });
//   } catch (err) {
//     console.error('POST /users error:', err);
//     res.status(500).json({ message: 'خطأ في إنشاء المستخدم' });
//   }
// });

// /**
//  * PATCH /api/users/:id/toggle
//  * تفعيل/تعطيل المستخدم
//  */
// router.patch('/:id/toggle', async (req, res) => {
//   try {
//     const id = Number(req.params.id);
//     if (!id) return res.status(400).json({ message: 'معرّف غير صالح' });

//     const [rows] = await db.query(
//       'SELECT active FROM users WHERE id = ? LIMIT 1',
//       [id]
//     );
//     if (!rows.length) {
//       return res.status(404).json({ message: 'المستخدم غير موجود' });
//     }

//     const current = rows[0].active ? 1 : 0;
//     const next = current ? 0 : 1;

//     await db.query('UPDATE users SET active = ? WHERE id = ?', [next, id]);

//     res.json({ id, active: next });
//   } catch (err) {
//     console.error('PATCH /users/:id/toggle error:', err);
//     res.status(500).json({ message: 'خطأ في تحديث حالة المستخدم' });
//   }
// });

// /**
//  * DELETE /api/users/:id
//  * حذف مستخدم
//  */
// router.delete('/:id', async (req, res) => {
//   try {
//     const id = Number(req.params.id);
//     if (!id) return res.status(400).json({ message: 'معرّف غير صالح' });

//     // حذف صلاحياته أولاً
//     await db.query('DELETE FROM user_permissions WHERE user_id = ?', [id]);
//     const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);

//     if (!result.affectedRows) {
//       return res.status(404).json({ message: 'المستخدم غير موجود' });
//     }

//     res.json({ message: 'تم حذف المستخدم بنجاح' });
//   } catch (err) {
//     console.error('DELETE /users/:id error:', err);
//     res.status(500).json({ message: 'خطأ في حذف المستخدم' });
//   }
// });

// /**
//  * GET /api/users/:id/permissions
//  * يعيد مصفوفة صلاحيات المستخدم
//  */
// router.get('/:id/permissions', async (req, res) => {
//   try {
//     const id = Number(req.params.id);
//     if (!id) return res.status(400).json({ message: 'معرّف غير صالح' });

//     const [rows] = await db.query(
//       'SELECT permission_key FROM user_permissions WHERE user_id = ?',
//       [id]
//     );

//     const perms = rows.map((r) => r.permission_key);
//     res.json(perms);
//   } catch (err) {
//     console.error('GET /users/:id/permissions error:', err);
//     res.status(500).json({ message: 'خطأ في جلب الصلاحيات' });
//   }
// });

// /**
//  * PUT /api/users/:id/permissions
//  * body: { permissions: string[] }
//  */
// router.put('/:id/permissions', async (req, res) => {
//   try {
//     const id = Number(req.params.id);
//     const { permissions } = req.body || {};

//     if (!id) return res.status(400).json({ message: 'معرّف غير صالح' });
//     if (!Array.isArray(permissions)) {
//       return res.status(400).json({ message: 'تنسيق الصلاحيات غير صحيح' });
//     }

//     // نضمن أن كل الصلاحيات من القائمة المسموحة
//     const unique = [...new Set(permissions)].filter((p) =>
//       ALL_PERMISSIONS.includes(p)
//     );

//     // نتحقق أن المستخدم موجود
//     const [userRows] = await db.query(
//       'SELECT id FROM users WHERE id = ? LIMIT 1',
//       [id]
//     );
//     if (!userRows.length) {
//       return res.status(404).json({ message: 'المستخدم غير موجود' });
//     }

//     // نحذف القديم
//     await db.query('DELETE FROM user_permissions WHERE user_id = ?', [id]);

//     // نضيف الجديد لو في صلاحيات
//     if (unique.length) {
//       const values = unique.map((p) => [id, p]);
//       await db.query(
//         'INSERT INTO user_permissions (user_id, permission_key) VALUES ?',
//         [values]
//       );
//     }

//     res.json({ message: 'تم تحديث الصلاحيات', permissions: unique });
//   } catch (err) {
//     console.error('PUT /users/:id/permissions error:', err);
//     res.status(500).json({ message: 'خطأ في حفظ الصلاحيات' });
//   }
// });

// module.exports = router;
