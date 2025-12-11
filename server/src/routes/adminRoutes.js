const express = require('express');
const router = express.Router();
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
  addBalanceToUser
} = require('../controllers/adminController');

/**
 * RUTAS DEL DASHBOARD ADMINISTRATIVO
 * 
 * Todas las rutas requieren:
 * - authenticateToken: JWT válido
 * - isAdmin: Role 'admin' o 'superadmin'
 */

// 👤 Perfil del admin
router.get('/profile', authenticateToken, isAdmin, getAdminProfile);

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

module.exports = router;
