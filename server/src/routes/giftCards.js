const express = require('express');
const router = express.Router();
const giftCardsController = require('../controllers/giftCardsController');
const { authenticateToken, isSuperAdmin } = require('../middleware/authMiddleware');

/**
 * RUTAS: Sistema de Cartones de Regalo
 * Todas las rutas requieren autenticación y rol SuperAdmin
 */

// Agregar cartones de regalo
router.post('/add',
  authenticateToken,
  isSuperAdmin,
  giftCardsController.addGiftCards
);

// Quitar cartones de regalo
router.post('/remove',
  authenticateToken,
  isSuperAdmin,
  giftCardsController.removeGiftCards
);

// Obtener stock de cartones
router.get('/stock/:userId',
  authenticateToken,
  giftCardsController.getGiftCardsStock
);

module.exports = router;
