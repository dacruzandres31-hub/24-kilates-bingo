const express = require('express');
const router = express.Router();

router.use((req, res, next) => {
  console.log(`🔎 [AdminRouter] Routing: ${req.method} ${req.url}`);
  next();
});

const {
  authenticateToken,
  isAdmin,
  isAndy
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

// Actualizar precio de membresía (Solo Andy)
router.put('/memberships/:id/price', authenticateToken, isAndy, async (req, res) => {
  try {
    const { id } = req.params;
    const { price } = req.body;
    
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
      return res.status(400).json({ error: 'Precio inválido' });
    }
    
    const db = require('../db');
    await db.query('UPDATE memberships SET price = ? WHERE id = ?', [parseFloat(price), id]);
    
    console.log(`💎 [MEMBERSHIP] Andy actualizó precio de membresía ${id} a $${price}`);
    
    res.json({ success: true, message: 'Precio actualizado correctamente' });
  } catch (error) {
    console.error('Error updating membership price:', error);
    res.status(500).json({ error: 'Error al actualizar precio' });
  }
});

// ========================================
// 👥 GESTIÓN DE SUSCRIPCIONES ACTIVAS (Andy Only)
// ========================================

// Listar todos los usuarios con membresías activas (agrupado por usuario)
router.get('/memberships/active-users', authenticateToken, isAndy, async (req, res) => {
  try {
    const db = require('../db');
    const [rows] = await db.query(`
      SELECT 
        us.id as subscription_id,
        us.user_id,
        u.username,
        m.id as membership_id,
        m.name as plan_name,
        m.price,
        us.status,
        us.start_date,
        us.next_billing_date,
        us.auto_renew,
        us.created_at
      FROM user_subscriptions us
      JOIN users u ON us.user_id = u.id
      JOIN memberships m ON us.membership_id = m.id
      WHERE us.status = 'active'
      ORDER BY u.username ASC, m.price ASC
    `);
    
    // Agrupar por usuario
    const usersMap = new Map();
    for (const row of rows) {
      if (!usersMap.has(row.user_id)) {
        usersMap.set(row.user_id, {
          user_id: row.user_id,
          username: row.username,
          subscriptions: []
        });
      }
      usersMap.get(row.user_id).subscriptions.push({
        subscription_id: row.subscription_id,
        membership_id: row.membership_id,
        plan_name: row.plan_name,
        price: row.price,
        start_date: row.start_date,
        next_billing_date: row.next_billing_date,
        auto_renew: row.auto_renew
      });
    }
    
    const groupedUsers = Array.from(usersMap.values());
    
    res.json({ success: true, data: groupedUsers });
  } catch (error) {
    console.error('Error fetching active memberships:', error);
    res.status(500).json({ error: 'Error al obtener membresías activas' });
  }
});

// Renovar membresía por 1 mes
router.post('/memberships/subscriptions/:subscriptionId/renew', authenticateToken, isAndy, async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const db = require('../db');
    
    // Obtener suscripción actual
    const [subs] = await db.query(`
      SELECT us.*, m.name as plan_name, u.username
      FROM user_subscriptions us
      JOIN memberships m ON us.membership_id = m.id
      JOIN users u ON us.user_id = u.id
      WHERE us.id = ?
    `, [subscriptionId]);
    
    if (!subs.length) {
      return res.status(404).json({ error: 'Suscripción no encontrada' });
    }
    
    const sub = subs[0];
    
    // Calcular nueva fecha de vencimiento (+1 mes desde la actual o desde hoy si ya venció)
    const currentExpiry = new Date(sub.next_billing_date);
    const now = new Date();
    const baseDate = currentExpiry > now ? currentExpiry : now;
    const newExpiry = new Date(baseDate);
    newExpiry.setMonth(newExpiry.getMonth() + 1);
    
    await db.query(`
      UPDATE user_subscriptions 
      SET next_billing_date = ?, status = 'active', auto_renew = 1
      WHERE id = ?
    `, [newExpiry, subscriptionId]);
    
    console.log(`💎 [MEMBERSHIP] Andy renovó membresía de ${sub.username} (${sub.plan_name}) hasta ${newExpiry.toISOString().split('T')[0]}`);
    
    res.json({ 
      success: true, 
      message: `Membresía renovada hasta ${newExpiry.toLocaleDateString('es-AR')}`,
      newExpiryDate: newExpiry
    });
  } catch (error) {
    console.error('Error renewing membership:', error);
    res.status(500).json({ error: 'Error al renovar membresía' });
  }
});

// Eliminar/Cancelar membresía
router.delete('/memberships/subscriptions/:subscriptionId', authenticateToken, isAndy, async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const db = require('../db');
    
    // Obtener suscripción actual para el log
    const [subs] = await db.query(`
      SELECT us.*, m.name as plan_name, u.username
      FROM user_subscriptions us
      JOIN memberships m ON us.membership_id = m.id
      JOIN users u ON us.user_id = u.id
      WHERE us.id = ?
    `, [subscriptionId]);
    
    if (!subs.length) {
      return res.status(404).json({ error: 'Suscripción no encontrada' });
    }
    
    const sub = subs[0];
    
    // Marcar como cancelada (no eliminar para mantener historial)
    await db.query(`
      UPDATE user_subscriptions 
      SET status = 'cancelled', auto_renew = 0
      WHERE id = ?
    `, [subscriptionId]);
    
    console.log(`💎 [MEMBERSHIP] Andy eliminó membresía de ${sub.username} (${sub.plan_name})`);
    
    res.json({ 
      success: true, 
      message: `Membresía de ${sub.username} eliminada correctamente`
    });
  } catch (error) {
    console.error('Error deleting membership:', error);
    res.status(500).json({ error: 'Error al eliminar membresía' });
  }
});


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
