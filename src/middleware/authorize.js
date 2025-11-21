export function authorize(requiredPermissions = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "غير مصرح" });
    }

    // لو ما في صلاحيّات مطلوبة → مسموح للجميع (مجرد توكن يكفي)
    if (!requiredPermissions.length) return next();

    const userPerms = req.user.permissions || [];

    const ok = requiredPermissions.some((perm) => userPerms.includes(perm));
    if (!ok) {
      return res.status(403).json({ message: "🚫 لا تملك صلاحية لتنفيذ هذه العملية" });
    }

    next();
  };
}
