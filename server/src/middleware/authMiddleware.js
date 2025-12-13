const jwt = require('jsonwebtoken');

// Middleware de autenticación básico
const authenticateToken = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No autorizado. Token no proporcionado.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_clave_secreta_muy_segura_12345');
    req.user = decoded;
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

  const allowedRoles = ['cajero', 'admin', 'superadmin'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ 
      error: 'Acceso denegado. Se requiere rol de cajero o administrador.' 
    });
  }

  next();
};

// Exportar middlewares
module.exports = {
  authenticateToken,
  isAdmin,
  isSuperAdmin,
  isCajeroOrAdmin
};

// Mantener compatibilidad con código antiguo
module.exports.default = authenticateToken;
