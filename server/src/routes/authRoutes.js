const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/security');
const validate = require('../middleware/validationMiddleware');
const { loginSchema, registerSchema } = require('../utils/schemas');

const router = express.Router();

// Public routes with rate limiting and validation
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/register', authLimiter, validate(registerSchema), authController.register);

/**
 * AUTH ROUTES
 * POST   /auth/register  - Crear nuevo usuario
 * POST   /auth/login     - Autenticarse y obtener JWT
 * POST   /auth/refresh   - Renovar token expirado
 * POST   /auth/logout    - Logout (opcional)
 * GET    /auth/verify    - Verificar validez del token
 */



// Refresh token (con autenticación)
router.post('/refresh', authMiddleware.authenticateToken, authController.refreshToken);

// Logout (con autenticación)
router.post('/logout', authMiddleware.authenticateToken, authController.logout);

// Verificar token (con autenticación)
router.get('/verify', authMiddleware.authenticateToken, authController.verifyToken);

// Cambiar contraseña (con autenticación)
router.post('/change-password', authMiddleware.authenticateToken, authController.changePassword);

module.exports = router;
