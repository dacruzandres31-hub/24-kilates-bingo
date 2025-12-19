// ============================================
// RUTAS: SISTEMA DE COMISIONES
// ============================================

const express = require('express');
const router = express.Router();
const CommissionService = require('../services/commissionService');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

// ============================================
// RUTAS ADMINISTRATIVAS (requieren autenticación)
// ============================================

// Obtener top cajeros por comisiones
router.get('/top-cashiers', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { period = '30d', limit = 10 } = req.query;

    const result = await CommissionService.getTopCashiersByCommissions(
      period,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error obteniendo top cajeros:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Obtener comisiones de un cajero específico
router.get('/cashier/:cashierId', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { cashierId } = req.params;
    const { startDate, endDate, limit = 100, offset = 0 } = req.query;

    const filters = {
      startDate,
      endDate,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    const result = await CommissionService.getCashierCommissions(
      parseInt(cashierId),
      filters
    );

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error obteniendo comisiones del cajero:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Calcular comisiones de una sesión (endpoint manual - normalmente se ejecuta automáticamente)
router.post('/session/:sessionId/calculate', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await CommissionService.calculateSessionCommissions(
      parseInt(sessionId)
    );

    res.json({
      success: true,
      message: 'Comisiones calculadas exitosamente',
      data: result
    });

  } catch (error) {
    console.error('Error calculando comisiones:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Acreditar comisiones de una sesión (endpoint manual - normalmente se ejecuta automáticamente)
router.post('/session/:sessionId/credit', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await CommissionService.creditCommissionsToCashiers(
      parseInt(sessionId)
    );

    res.json({
      success: true,
      message: 'Comisiones acreditadas exitosamente',
      data: result
    });

  } catch (error) {
    console.error('Error acreditando comisiones:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
