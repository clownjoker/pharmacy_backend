import jwt from "jsonwebtoken";

// 🔐 نفس الـ Secret حرفيًا
const JWT_SECRET = "super_secret_key_123";

export function authRequired(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "يجب تسجيل الدخول أولاً",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      message: "توكن غير صالح أو منتهي",
    });
  }
}
