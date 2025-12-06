// ============================================
// RUTAS: GESTIÓN DE FICHAS (CHIPS)
// ============================================

const express = require('express');
const router = express.Router();
const chipsController = require('../controllers/chipsController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

// ============================================
// RUTAS PÚBLICAS (requieren autenticación)
// ============================================

// Obtener balance del usuario actual
router.get('/balance', authenticateToken, chipsController.getUserBalance);

// Obtener historial de movimientos del usuario actual
router.get('/history', authenticateToken, chipsController.getMovementHistory);

// Obtener estadísticas de movimientos
router.get('/stats', authenticateToken, chipsController.getMovementStats);

// Transferir fichas a otro usuario
router.post('/transfer', authenticateToken, chipsController.transferChips);

// ============================================
// RUTAS ADMINISTRATIVAS (requieren rol admin)
// ============================================

// Depósito de fichas (cajero/admin)
router.post('/deposit', authenticateToken, isAdmin, chipsController.depositChips);

// Retiro de fichas (cajero/admin)
router.post('/withdraw', authenticateToken, isAdmin, chipsController.withdrawChips);

// Ajuste de fichas (solo admin)
router.post('/adjust', authenticateToken, isAdmin, chipsController.adjustChips);

// Auditar balance de un usuario
router.get('/audit/:userId', authenticateToken, isAdmin, chipsController.auditUserBalance);

// Obtener balance de cualquier usuario
router.get('/balance/:userId', authenticateToken, isAdmin, chipsController.getUserBalance);

// Obtener historial de cualquier usuario
router.get('/history/:userId', authenticateToken, isAdmin, chipsController.getMovementHistory);

// Obtener estadísticas de cualquier usuario
router.get('/stats/:userId', authenticateToken, isAdmin, chipsController.getMovementStats);

module.exports = router;
