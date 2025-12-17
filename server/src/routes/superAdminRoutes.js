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

const cardInventoryController = require('../controllers/cardInventoryController');
const sessionController = require('../controllers/sessionController');
const roomSettingsController = require('../controllers/roomSettingsController');

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

// ========================================
// GESTIÓN DE INVENTARIO DE CARTONES (v1.4.0)
// ========================================
router.post('/cards/credit', cardInventoryController.creditCards);
router.get('/cards/inventory/:userId', cardInventoryController.getUserInventory);
router.get('/cards/movements/:userId', cardInventoryController.getMovementsLog);
router.get('/cards/all-inventories', cardInventoryController.getAllInventories);
router.get('/cards/all-movements', cardInventoryController.getAllMovements);
router.post('/cards/transfer', cardInventoryController.transferCards);

// ========================================
// 🎲 GESTIÓN DE SESIONES (SuperAdmin only)
// Crear, modificar, eliminar y controlar sesiones
// ========================================
router.post('/sessions/create', sessionController.createSession);
router.put('/sessions/:id', sessionController.updateSession);
router.delete('/sessions/:id', sessionController.deleteSession);
router.post('/sessions/:id/pause', sessionController.pauseSession);
router.post('/sessions/:id/resume', sessionController.resumeSession);

// ========================================
// 💰 CONFIGURACIÓN DE SALAS Y POZOS
// Configurar precios de cartones y porcentajes de distribución
// ========================================
router.get('/room-settings', roomSettingsController.getRoomSettings);
router.put('/room-settings/:room', roomSettingsController.updateRoomPrice);
router.put('/room-settings/:room/percentages', roomSettingsController.updateRoomPercentages);
router.post('/room-settings/:room/reset-accumulated', roomSettingsController.resetAccumulatedPot);

module.exports = router;
