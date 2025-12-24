import express from "express";
import { login } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/login", login);

export default router;



// // src/routes/auth.routes.js
// import express from "express";
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";
// // import { pool } from "../config/db.js";
// import { query, pool } from "../config/db.js";

// import { logActivity } from "../utils/activityLog.js";

// const router = express.Router();

// async function getUserPermissions(userId, roleId) {
//   const [rows] = await pool.query(
//     `
//     SELECT DISTINCT p.\`key\`
//     FROM permissions p
//     LEFT JOIN role_permissions rp
//       ON rp.permission_id = p.id AND rp.role_id = ?
//     LEFT JOIN user_permissions up
//       ON up.permission_id = p.id AND up.user_id = ?
//     WHERE rp.role_id IS NOT NULL OR up.user_id IS NOT NULL
//     `,
//     [roleId, userId]
//   );
//   return rows.map(r => r.key);
// }

// router.post("/login", async (req, res) => {
//   try {
//     const { username, password } = req.body;

//     const [rows] = await pool.query(
//       `
//       SELECT u.*, r.slug AS role_slug
//       FROM users u
//       LEFT JOIN roles r ON r.id = u.role_id
//       WHERE u.username = ?
//       LIMIT 1
//       `,
//       [username]
//     );

//     if (!rows.length) {
//       return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
//     }

//     const user = rows[0];
//     if (!user.is_active) {
//       return res.status(403).json({ message: "الحساب موقوف" });
//     }

//     const ok = await bcrypt.compare(password, user.password_hash);
//     if (!ok) {
//       return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
//     }

//     const permissions = await getUserPermissions(user.id, user.role_id);

//     const token = jwt.sign(
//       {
//         id: user.id,
//         role: user.role_slug,
//         permissions,
//       },
//       process.env.JWT_SECRET || "secret",
//       { expiresIn: "8h" }
//     );

//     await logActivity({
//       userId: user.id,
//       action: "login",
//       entity: "user",
//       entityId: user.id,
//       ip: req.ip,
//       agent: req.headers["user-agent"],
//     });

//     res.json({
//       token,
//       user: {
//         id: user.id,
//         name: user.name,
//         username: user.username,
//         role: user.role_slug,
//         permissions,
//       },
//     });

//   } catch (err) {
//     console.error("login error:", err);
//     res.status(500).json({ message: "خطأ في تسجيل الدخول" });
//   }
// });

// export default router;
