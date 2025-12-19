// ============================================
// RUTAS: SISTEMA DE RETIROS (WITHDRAWALS)
// ============================================

const express = require('express');
const router = express.Router();
const withdrawalController = require('../controllers/withdrawalController');
const { authenticateToken, isAdmin, isCajeroOrAdmin } = require('../middleware/authMiddleware');

// ============================================
// RUTAS JUGADOR
// ============================================

// Crear solicitud de retiro (cualquier usuario autenticado)
router.post(
  '/request',
  authenticateToken,
  withdrawalController.createWithdrawalRequest
);

// Ver solicitudes pendientes propias
router.get(
  '/pending',
  authenticateToken,
  withdrawalController.getPendingWithdrawals
);

// Ver historial de retiros propio
router.get(
  '/history',
  authenticateToken,
  withdrawalController.getWithdrawalHistory
);

// ============================================
// RUTAS ADMIN/CAJERO
// ============================================

// Procesar solicitud de retiro (cajero o superadmin)
router.post(
  '/:withdrawalRequestId/process',
  authenticateToken,
  isCajeroOrAdmin,
  withdrawalController.processWithdrawalRequest
);

// Rechazar solicitud de retiro (admin)
router.post(
  '/:withdrawalRequestId/reject',
  authenticateToken,
  isAdmin,
  withdrawalController.rejectWithdrawalRequest
);

// Verificar permisos para procesar retiro (útil para UI)
router.get(
  '/:withdrawalRequestId/check-permissions',
  authenticateToken,
  isCajeroOrAdmin,
  withdrawalController.checkWithdrawalPermissions
);

// Obtener TODAS las solicitudes (admin) - para panel de administración
router.get(
  '/all',
  authenticateToken,
  isAdmin,
  withdrawalController.getWithdrawalHistory
);

module.exports = router;
