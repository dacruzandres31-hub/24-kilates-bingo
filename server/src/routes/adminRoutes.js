const express = require('express');
const router = express.Router();

router.use((req, res, next) => {
  console.log(`🔎 [AdminRouter] Routing: ${req.method} ${req.url}`);
  next();
});

const {
  authenticateToken,
  isAdmin
} = require('../middleware/authMiddleware');
const {
  getAdminProfile,
  getFinancialSummary,
  getDashboardStats,
  sendGlobalMessage,
  getSessionStats,
  getUserStats,
  getRevenueBreakdown,
  getStockSummary,
  getUsersHierarchy,
  createUser,
  addCardsToUser,
  addBalanceToUser,
  getMyCardInventory,
  transferCardsToUser,
  getMyCardMovements,
  changePassword,
  changeUserPassword,
  updateUserPersonalData,
  bulkTransferCards,
  getGGRStats,
  getSuperiorInfo,
  createStockRequest,
  getAuditLogs,
  getSystemHealth
} = require('../controllers/adminController');

const cardInventoryController = require('../controllers/cardInventoryController');
const sessionController = require('../controllers/sessionController');
const sessionHistoryController = require('../controllers/sessionHistoryController');
const roomSettingsController = require('../controllers/roomSettingsController');
const scheduleController = require('../controllers/scheduleController');
const paymentAccountsController = require('../controllers/paymentAccountsController');
const diagnosticsController = require('../controllers/diagnosticsController');
const adminAnalyticsController = require('../controllers/adminAnalyticsController');



/**
 * RUTAS DEL DASHBOARD ADMINISTRATIVO
 * 
 * Todas las rutas requieren:
 * - authenticateToken: JWT válido
 * - isAdmin: Role 'admin' o 'superadmin'
 */

// 👤 Perfil del admin
router.get('/profile', authenticateToken, isAdmin, getAdminProfile);
router.post('/change-password', authenticateToken, isAdmin, changePassword);

// 💰 Resumen financiero
router.get('/financial-summary', authenticateToken, isAdmin, getFinancialSummary);

// 📊 Dashboard principal - Estadísticas consolidadas
router.get('/dashboard/stats', authenticateToken, isAdmin, getDashboardStats);

// 📢 Mensaje global a todos los usuarios (Socket.IO)
router.post('/broadcast', authenticateToken, isAdmin, sendGlobalMessage);

// 🎮 Estadísticas de sesiones de juego
router.get('/sessions/stats', authenticateToken, isAdmin, getSessionStats);

// 👥 Estadísticas de usuarios
router.get('/users/stats', authenticateToken, isAdmin, getUserStats);

// 💰 Desglose de ingresos y distribución
router.get('/revenue/breakdown', authenticateToken, isAdmin, getRevenueBreakdown);

// 📦 Stock de cartones disponibles por sala
router.get('/stock-summary', authenticateToken, isAdmin, getStockSummary);

// 👥 Gestión de usuarios
router.get('/users/hierarchy', authenticateToken, isAdmin, getUsersHierarchy);
router.post('/users/create', authenticateToken, isAdmin, createUser);
router.post('/users/add-cards', authenticateToken, isAdmin, addCardsToUser);
router.post('/users/add-balance', authenticateToken, isAdmin, addBalanceToUser);
router.post('/users/change-password', authenticateToken, isAdmin, changeUserPassword);
router.put('/users/:userId/personal-data', authenticateToken, isAdmin, updateUserPersonalData);

// ========================================
// 🎴 INVENTARIO DE CARTONES (v1.4.0)
// Admin/Cajero - Vista filtrada (solo totales, sin is_gift)
// ========================================
router.get('/cards/inventory', authenticateToken, isAdmin, getMyCardInventory);
router.get('/cards/all-inventories', authenticateToken, isAdmin, cardInventoryController.getAllInventories);
router.get('/cards/all-movements', authenticateToken, isAdmin, cardInventoryController.getAllMovements);
router.post('/cards/transfer', authenticateToken, isAdmin, transferCardsToUser);

// [NEW] Carga masiva de cartones (Multi-room + Bonos)
router.post('/cards/bulk-transfer', authenticateToken, isAdmin, bulkTransferCards);

router.get('/cards/movements', authenticateToken, isAdmin, getMyCardMovements);

// ========================================
// 🎲 SESIONES DE JUEGO
// Consulta de sesiones activas, próximas y recientes
// ========================================
router.get('/sessions/active', authenticateToken, isAdmin, sessionController.getActiveSessions);
router.get('/sessions/recent', authenticateToken, isAdmin, sessionController.getRecentSessions);
router.get('/sessions/:id/live', authenticateToken, isAdmin, sessionController.getLiveSession);

// ========================================
// 📜 HISTORIAL DE SESIONES
// Archivo y consulta de sesiones completadas
// ========================================
router.post('/sessions/:id/archive', authenticateToken, isAdmin, sessionHistoryController.archiveSession);
router.post('/sessions/archive-all', authenticateToken, isAdmin, sessionHistoryController.archiveAllCompleted);
router.get('/sessions/history', authenticateToken, isAdmin, sessionHistoryController.getHistory);
router.get('/sessions/history/:id', authenticateToken, isAdmin, sessionHistoryController.getHistoryDetail);

// ========================================
// 💰 POZOS Y CONFIGURACIÓN DE SALAS
// Consulta de pozos actuales (Admin + SuperAdmin)
// ========================================
router.get('/room-settings/config', authenticateToken, isAdmin, roomSettingsController.getRoomSettings); // Para calculadora
router.get('/room-settings/current-pots', authenticateToken, isAdmin, roomSettingsController.getCurrentPots);

// Historial y Estadísticas de Pozos
router.get('/pot-history/:room', authenticateToken, isAdmin, require('../controllers/potHistoryController').getPotHistory);
router.get('/pot-stats/:room', authenticateToken, isAdmin, require('../controllers/potHistoryController').getPotStats);

// ========================================
// 📅 HORARIOS DE SORTEOS
// Consulta de horarios y próximos sorteos (Admin + SuperAdmin)
// ========================================
router.get('/schedules', authenticateToken, isAdmin, scheduleController.getAllSchedules);
router.get('/schedules/:room/next', authenticateToken, isAdmin, scheduleController.getNextDraws);
router.get('/schedules/summary', authenticateToken, isAdmin, scheduleController.getScheduleSummary);

const metricsService = require('../services/metricsService'); // Add import

// ... (existing routes)

// ========================================
// 📊 SYSTEM METRICS
// ========================================
router.get('/metrics', authenticateToken, isAdmin, (req, res) => {
  res.json(metricsService.getMetrics());
});

// ========================================
// 💰 FINANCIAL REPORTS (GGR)
// ========================================
router.get('/finances/ggr', authenticateToken, isAdmin, getGGRStats);

// ========================================
// 📦 B2B STOCK REQUESTS
// ========================================
router.get('/users/superior-info', authenticateToken, isAdmin, getSuperiorInfo);
router.post('/stock/request', authenticateToken, isAdmin, createStockRequest);

// [REMOVED DEBUG ROUTES] - Using standard GET routes instead

// ========================================
// 💳 GESTIÓN DE CUENTAS DE PAGO (Multi-Account)
// ========================================
router.get('/payment-accounts', authenticateToken, isAdmin, paymentAccountsController.getMyAccounts);
router.post('/payment-accounts', authenticateToken, isAdmin, paymentAccountsController.createAccount);
router.put('/payment-accounts/:id', authenticateToken, isAdmin, paymentAccountsController.updateAccount);
router.delete('/payment-accounts/:id', authenticateToken, isAdmin, paymentAccountsController.deleteAccount);

// ========================================
// 🔍 DIAGNOSTICS & MONITORING
// ========================================
router.get('/socket-diagnostics', authenticateToken, isAdmin, diagnosticsController.getSocketDiagnostics);
router.get('/live-sessions', authenticateToken, isAdmin, diagnosticsController.getLiveSessions);
router.get('/audit-logs', authenticateToken, isAdmin, getAuditLogs);
router.get('/system/health', authenticateToken, isAdmin, getSystemHealth);

// ========================================
// 📊 ANALYTICS & DASHBOARD STATISTICS
// ========================================
router.get('/analytics/monthly-netwin', authenticateToken, isAdmin, adminAnalyticsController.getMonthlyNetwin);
router.get('/analytics/daily-netwin', authenticateToken, isAdmin, adminAnalyticsController.getDailyNetwin);
router.get('/analytics/top-agents', authenticateToken, isAdmin, adminAnalyticsController.getTopAgents);
router.get('/analytics/net-profit-comparison', authenticateToken, isAdmin, adminAnalyticsController.getNetProfitComparison);

// ========================================
// 💎 MEMBERSHIP ACCOUNTING (Andy Only)
// ========================================
const getMembershipAccounting = require('../controllers/membershipAccountingController');
router.get('/memberships/accounting', authenticateToken, isAdmin, getMembershipAccounting);


// CATCH-ALL 404 FOR ADMIN ROUTES
router.use((req, res) => {
  console.log(`❌ [AdminRouter] 404 Not Found: ${req.method} ${req.originalUrl} (Subpath: ${req.url})`);
  res.status(404).json({
    error: 'Ruta no encontrada en AdminRouter',
    method: req.method,
    originalUrl: req.originalUrl,
    subpath: req.url
  });
});

module.exports = router;
