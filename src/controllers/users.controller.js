import * as UsersService from "../services/users.service.js";
import { getAllUsers } from "../services/users.service.js";

export async function listUsers(req, res) {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (err) {
    console.error("listUsers error:", err);
    res
      .status(500)
      .json({ message: "خطأ في جلب المستخدمين", error: err.message });
  }
}


export async function getUsers(req, res) {
  try {
    const users = await UsersService.getUsers();
    res.json(users);
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ message: "خطأ في جلب المستخدمين" });
  }
}

export async function createUser(req, res) {
  const { name, username, password, role_id } = req.body;

  if (!name || !username || !password || !role_id) {
    return res.status(400).json({ message: "بيانات غير مكتملة" });
  }

  try {
    const bcrypt = await import("bcryptjs");
    const passwordHash = await bcrypt.default.hash(password, 10);

    const id = await UsersService.createUser({
      name,
      username,
      passwordHash,
      roleId: role_id,
    });

    res.status(201).json({ id });
  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ message: "فشل إنشاء المستخدم" });
  }
}

export async function toggleUser(req, res) {
  try {
    await UsersService.toggleUser(req.params.id);
    res.json({ message: "تم تحديث حالة المستخدم" });
  } catch (err) {
    console.error("Toggle user error:", err);
    res.status(500).json({ message: "فشل تحديث الحالة" });
  }
}

export async function deleteUser(req, res) {
  try {
    await UsersService.deleteUser(req.params.id);
    res.json({ message: "تم حذف المستخدم" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ message: "فشل حذف المستخدم" });
  }
}
