// ============================================
// CONTROLADOR DE GESTIÓN DE FICHAS (CHIPS)
// ============================================

const ChipsService = require('../services/chipsService');

// ============================================
// DEPÓSITO DE FICHAS (Admin/Cajero)
// ============================================
exports.depositChips = async (req, res) => {
  try {
    const { userId, amount, reason } = req.body;
    const adminId = req.user.id; // Asumiendo middleware de autenticación

    if (!userId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'userId y amount son requeridos'
      });
    }

    // --- RESTRICCIÓN AGENTES ---
    // Los agentes no pueden tener dinero/fichas, solo cartones.
    const [recipientData] = await pool.query('SELECT role FROM users WHERE id = ?', [userId]);
    if (recipientData.length > 0 && recipientData[0].role === 'agente') {
      return res.status(400).json({
        success: false,
        message: '❌ Operación denegada: Los agentes solo pueden manejar cartones, no dinero.'
      });
    }

    const result = await ChipsService.depositChips(
      userId,
      parseFloat(amount),
      adminId,
      reason || 'Depósito manual'
    );

    res.json({
      success: true,
      message: 'Depósito realizado exitosamente',
      data: result
    });

  } catch (error) {
    console.error('Error en depósito de fichas:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// RETIRO DE FICHAS (Admin/Cajero)
// ============================================
exports.withdrawChips = async (req, res) => {
  try {
    const { userId, amount, reason } = req.body;
    const adminId = req.user.id;

    if (!userId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'userId y amount son requeridos'
      });
    }

    const result = await ChipsService.withdrawChips(
      userId,
      parseFloat(amount),
      adminId,
      reason || 'Retiro manual'
    );

    res.json({
      success: true,
      message: 'Retiro realizado exitosamente',
      data: result
    });

  } catch (error) {
    console.error('Error en retiro de fichas:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// TRANSFERENCIA ENTRE USUARIOS
// ============================================
exports.transferChips = async (req, res) => {
  try {
    const { toUserId, amount, description } = req.body;
    const fromUserId = req.user.id; // Usuario que envía

    if (!toUserId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'toUserId y amount son requeridos'
      });
    }

    const result = await ChipsService.transferChips(
      fromUserId,
      toUserId,
      parseFloat(amount),
      description || 'Transferencia entre usuarios'
    );

    res.json({
      success: true,
      message: 'Transferencia realizada exitosamente',
      data: result
    });

  } catch (error) {
    console.error('Error en transferencia de fichas:', error);

    // Business logic errors should return 400
    if (error.message.includes('insuficientes') ||
      error.message.includes('no encontrado') ||
      error.message.includes('mismo')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// AJUSTE DE FICHAS (Solo Admin)
// ============================================
exports.adjustChips = async (req, res) => {
  try {
    const { userId, amount, reason } = req.body;
    const adminId = req.user.id;

    if (!userId || !amount || !reason) {
      return res.status(400).json({
        success: false,
        message: 'userId, amount y reason son requeridos'
      });
    }

    const result = await ChipsService.adjustChips(
      userId,
      parseFloat(amount),
      adminId,
      reason
    );

    res.json({
      success: true,
      message: 'Ajuste realizado exitosamente',
      data: result
    });

  } catch (error) {
    console.error('Error en ajuste de fichas:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// HISTORIAL DE MOVIMIENTOS
// ============================================
exports.getMovementHistory = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    const { movementType, startDate, endDate, limit, offset } = req.query;

    const filters = {
      movementType,
      startDate,
      endDate,
      limit: parseInt(limit) || 100,
      offset: parseInt(offset) || 0
    };

    const result = await ChipsService.getMovementHistory(userId, filters);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error obteniendo historial:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// AUDITORÍA DE BALANCE
// ============================================
exports.auditUserBalance = async (req, res) => {
  try {
    const userId = req.params.userId;

    const result = await ChipsService.auditUserBalance(userId);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error en auditoría:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// ESTADÍSTICAS DE MOVIMIENTOS
// ============================================
exports.getMovementStats = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    const { period } = req.query; // '7d', '30d', '90d'

    const result = await ChipsService.getMovementStats(userId, period || '30d');

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// BALANCE ACTUAL DEL USUARIO
// ============================================
exports.getUserBalance = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;

    const pool = require('../db');
    const [users] = await pool.query(
      'SELECT id, username, balance FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: {
        userId: users[0].id,
        username: users[0].username,
        balance: parseFloat(users[0].balance)
      }
    });

  } catch (error) {
    console.error('Error obteniendo balance:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
