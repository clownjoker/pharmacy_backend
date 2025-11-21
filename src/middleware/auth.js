// src/middleware/auth.js
const jwt = require('jsonwebtoken');

function authRequired(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ message: 'يجب تسجيل الدخول أولاً' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'رمز الدخول غير صالح أو منتهي' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ message: 'لا تملك صلاحية الوصول' });
    }
    next();
  };
}

function requirePermission(perm) {
  return (req, res, next) => {
    if (!req.user || !Array.isArray(req.user.permissions)) {
      return res.status(403).json({ message: 'صلاحيات غير كافية' });
    }
    if (!req.user.permissions.includes(perm)) {
      return res.status(403).json({ message: 'صلاحيات غير كافية' });
    }
    next();
  };
}

module.exports = { authRequired, requireRole, requirePermission };
