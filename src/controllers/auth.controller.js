import { login } from "../services/auth.service.js";

export async function loginController(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "اسم المستخدم وكلمة المرور مطلوبة" });
    }

    const result = await login({
      username,
      password,
      ip: req.ip,
      agent: req.headers["user-agent"],
    });

    res.json(result);
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
}
