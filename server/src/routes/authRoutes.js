const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * AUTH ROUTES
 * POST   /auth/register  - Crear nuevo usuario
 * POST   /auth/login     - Autenticarse y obtener JWT
 * POST   /auth/refresh   - Renovar token expirado
 * POST   /auth/logout    - Logout (opcional)
 * GET    /auth/verify    - Verificar validez del token
 */

// Registro (sin autenticación)
router.post('/register', authController.register);

// Login (sin autenticación)
router.post('/login', authController.login);

// Refresh token (con autenticación)
router.post('/refresh', authMiddleware.authenticateToken, authController.refreshToken);

// Logout (con autenticación)
router.post('/logout', authMiddleware.authenticateToken, authController.logout);

// Verificar token (con autenticación)
router.get('/verify', authMiddleware.authenticateToken, authController.verifyToken);

module.exports = router;
