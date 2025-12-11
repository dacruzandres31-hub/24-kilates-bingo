const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');
const {
  requireSuperAdmin,
  getCardPrices,
  updateCardPrice,
  giftCards,
  giftBalance,
  getGiftHistory,
  getSystemStats,
  getStockSummary,
  generateStock,
  getUserStock,
  transferStock
} = require('../controllers/superAdminController');

// Todas las rutas requieren autenticación de admin
router.use(authenticateToken);
router.use(isAdmin);

// Todas las rutas de SuperAdmin requieren rol superadmin
router.use(requireSuperAdmin);

// Gestión de precios de cartones
router.get('/card-prices', getCardPrices);
router.put('/card-prices/:room', updateCardPrice);

// Acreditación de regalos
router.post('/gift-cards', giftCards);
router.post('/gift-balance', giftBalance);
router.get('/gift-history', getGiftHistory);

// Estadísticas del sistema
router.get('/system-stats', getSystemStats);

// Gestión de Stock
router.get('/stock/summary', getStockSummary);
router.post('/stock/generate', generateStock);
router.get('/stock/user/:userId', getUserStock);
router.post('/stock/transfer', transferStock);

module.exports = router;
