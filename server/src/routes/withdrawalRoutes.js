// ============================================
// RUTAS: SISTEMA DE RETIROS (WITHDRAWALS)
// ============================================

const express = require('express');
const router = express.Router();
const withdrawalController = require('../controllers/withdrawalController');
const { authenticateToken, isAndy } = require('../middleware/authMiddleware');
const { paymentLimiter } = require('../middleware/security');
const validate = require('../middleware/validationMiddleware');
const { withdrawalRequestSchema } = require('../utils/schemas');

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
// RUTAS ADMIN/CAJERO (Exclusivo Andy)
// ============================================

// Procesar solicitud de retiro (Andy Only)
router.post(
  '/:withdrawalRequestId/process',
  authenticateToken,
  isAndy,
  withdrawalController.processWithdrawalRequest
);

// Rechazar solicitud de retiro (Andy Only)
router.post(
  '/:withdrawalRequestId/reject',
  authenticateToken,
  isAndy,
  withdrawalController.rejectWithdrawalRequest
);

// Verificar permisos (Andy Only)
router.get(
  '/:withdrawalRequestId/check-permissions',
  authenticateToken,
  isAndy,
  withdrawalController.checkWithdrawalPermissions
);

// Obtener TODAS las solicitudes (Andy Only)
router.get(
  '/all',
  authenticateToken,
  isAndy,
  withdrawalController.getWithdrawalHistory
);

module.exports = router;
