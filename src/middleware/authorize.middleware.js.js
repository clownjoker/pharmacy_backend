// src/middlewares/authorize.middleware.js
export function authorize(requiredPermissions = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "غير مصرح" });
    }

    if (!requiredPermissions.length) return next();

    const perms = req.user.permissions || [];
    const ok = requiredPermissions.some(p => perms.includes(p));

    if (!ok) {
      return res.status(403).json({ message: "🚫 لا تملك الصلاحية" });
    }

    next();
  };
}
