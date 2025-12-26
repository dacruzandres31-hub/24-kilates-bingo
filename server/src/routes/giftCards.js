const express = require('express');
const router = express.Router();
const giftCardsController = require('../controllers/giftCardsController');
const { authenticateToken, isSuperAdmin, isSuperAdminOrAndy } = require('../middleware/authMiddleware');

/**
 * RUTAS: Sistema de Cartones de Regalo
 * Todas las rutas requieren autenticación y rol SuperAdmin (o el usuario Andy)
 */

// Agregar cartones de regalo
router.post('/add',
  authenticateToken,
  isSuperAdminOrAndy,
  giftCardsController.addGiftCards
);

// Quitar cartones de regalo
router.post('/remove',
  authenticateToken,
  isSuperAdminOrAndy,
  giftCardsController.removeGiftCards
);

// Obtener stock de cartones
router.get('/stock/:userId',
  authenticateToken,
  giftCardsController.getGiftCardsStock
);

// Obtener historial de movimientos
router.get('/history/:userId',
  authenticateToken,
  giftCardsController.getGiftCardsHistory
);

module.exports = router;
