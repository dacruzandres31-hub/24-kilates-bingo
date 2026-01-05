const jwt = require('jsonwebtoken');

// Middleware de autenticación básico
const authenticateToken = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No autorizado. Token no proporcionado.' });
    }

    const secret = process.env.JWT_SECRET || '24k_secret_prod_secure_2025';

    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    // Normalizar para compatibilidad (el token trae 'id', los controllers a veces usan 'userId')
    if (decoded.id && !decoded.userId) {
      req.user.userId = decoded.id;
    }
    next();
  } catch (error) {
    res.status(401).json({ error: 'No autorizado. Token inválido.' });
  }
};

// Middleware: Solo administradores (admin, superadmin, agente)
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  const allowedRoles = ['admin', 'superadmin', 'agente'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      error: 'Acceso denegado. Se requiere rol de administrador o agente.',
      currentRole: req.user.role
    });
  }

  next();
};

// Middleware: Solo superadmin
const isSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  if (req.user.role !== 'superadmin') {
    return res.status(403).json({
      error: 'Acceso denegado. Se requiere rol de superadmin.'
    });
  }

  next();
};

// Middleware: Cajero o superior
const isCajeroOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  const allowedRoles = ['cajero', 'admin', 'superadmin', 'agente'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      error: 'Acceso denegado. Se requiere rol de cajero o administrador.'
    });
  }

  next();
};

// Middleware: Solo usuario Andy
const isAndy = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  // Verificar username exacto - primero del token, luego de la BD si no está
  let username = req.user.username;
  
  // Si no hay username en el token, buscarlo en BD
  if (!username && req.user.id) {
    try {
      const db = require('../db');
      const [users] = await db.query('SELECT username FROM users WHERE id = ?', [req.user.id]);
      username = users[0]?.username;
    } catch (err) {
      console.error('Error fetching username for isAndy check:', err);
    }
  }

  if (username?.toLowerCase() !== 'andy') {
    return res.status(403).json({
      error: 'Acceso denegado. Exclusivo para Andy.'
    });
  }

  next();
};

// Middleware: SuperAdmin o Andy
const isSuperAdminOrAndy = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  if (req.user.role === 'superadmin' || req.user.username?.toLowerCase() === 'andy') {
    return next();
  }

  return res.status(403).json({
    error: 'Acceso denegado. Se requiere rol de superadmin o ser el usuario Andy.'
  });
};

// Exportar middlewares
module.exports = {
  authenticateToken,
  isAdmin,
  isSuperAdmin,
  isCajeroOrAdmin,
  isAndy,
  isSuperAdminOrAndy
};

// Mantener compatibilidad con código antiguo
module.exports.default = authenticateToken;
