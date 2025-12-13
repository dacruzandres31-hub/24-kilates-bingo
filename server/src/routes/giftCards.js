const express = require('express');
const router = express.Router();
const giftCardsController = require('../controllers/giftCardsController');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * RUTAS: Sistema de Cartones de Regalo
 * Todas las rutas requieren autenticación y rol SuperAdmin
 */

// Agregar cartones de regalo
router.post('/add',
  authenticateToken,
  requireRole(['superadmin']),
  giftCardsController.addGiftCards
);

// Quitar cartones de regalo
router.post('/remove',
  authenticateToken,
  requireRole(['superadmin']),
  giftCardsController.removeGiftCards
);

// Obtener stock de cartones
router.get('/stock/:userId',
  authenticateToken,
  giftCardsController.getGiftCardsStock
);

module.exports = router;
