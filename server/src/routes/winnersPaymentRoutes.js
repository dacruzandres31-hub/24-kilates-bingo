// ============================================
// RUTAS: INFORMACIÓN DE PAGO DE GANADORES
// ============================================

const express = require('express');
const router = express.Router();
const winnerPaymentController = require('../controllers/winnerPaymentController');
const { authenticateToken, isAdmin, isCajeroOrAdmin } = require('../middleware/authMiddleware');

// ============================================
// RUTAS JUGADOR
// ============================================

// Enviar/actualizar información de pago (cuando gana)
router.post(
  '/submit',
  authenticateToken,
  winnerPaymentController.submitPaymentInfo
);

// Ver mis solicitudes de pago
router.get(
  '/my-payments',
  authenticateToken,
  winnerPaymentController.getMyPaymentInfo
);

// ============================================
// RUTAS ADMIN/CAJERO
// ============================================

// Listar pagos pendientes
router.get(
  '/pending',
  authenticateToken,
  isCajeroOrAdmin,
  winnerPaymentController.getPendingPayments
);

// Procesar (completar) pago
router.post(
  '/:paymentId/process',
  authenticateToken,
  isCajeroOrAdmin,
  winnerPaymentController.processPayment
);

// Rechazar pago
router.post(
  '/:paymentId/reject',
  authenticateToken,
  isAdmin,
  winnerPaymentController.rejectPayment
);

// Historial completo de pagos
router.get(
  '/history',
  authenticateToken,
  isAdmin,
  winnerPaymentController.getPaymentHistory
);

module.exports = router;
