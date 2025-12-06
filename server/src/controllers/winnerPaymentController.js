// ============================================
// CONTROLADOR: INFORMACIÓN DE PAGO DE GANADORES
// ============================================

const pool = require('../db');

// ============================================
// CREAR/ACTUALIZAR INFORMACIÓN DE PAGO
// ============================================
exports.submitPaymentInfo = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { 
      gameSessionId, 
      prizeType, 
      prizeAmount,
      cbu, 
      bankAccountHolder, 
      bankName, 
      accountType,
      whatsapp 
    } = req.body;

    // Validaciones
    if (!prizeType || !prizeAmount || !cbu || !bankAccountHolder || !whatsapp) {
      return res.status(400).json({
        success: false,
        message: 'Campos requeridos: prizeType, prizeAmount, cbu, bankAccountHolder, whatsapp'
      });
    }

    if (cbu.length !== 22) {
      return res.status(400).json({
        success: false,
        message: 'El CBU debe tener exactamente 22 dígitos'
      });
    }

    if (!['linea', 'bingo'].includes(prizeType)) {
      return res.status(400).json({
        success: false,
        message: 'prizeType debe ser "linea" o "bingo"'
      });
    }

    // Verificar si ya existe información de pago para este premio
    const [existing] = await pool.query(
      `SELECT id FROM winner_payment_info 
       WHERE user_id = ? 
       AND game_session_id = ? 
       AND prize_type = ? 
       AND payment_status IN ('pending', 'processing')`,
      [userId, gameSessionId, prizeType]
    );

    let result;
    if (existing.length > 0) {
      // Actualizar información existente
      await pool.query(
        `UPDATE winner_payment_info 
         SET cbu = ?, 
             bank_account_holder = ?, 
             bank_name = ?, 
             account_type = ?,
             whatsapp = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [cbu, bankAccountHolder, bankName, accountType || 'savings', whatsapp, existing[0].id]
      );
      
      result = { id: existing[0].id, updated: true };
    } else {
      // Crear nueva entrada
      const [insertResult] = await pool.query(
        `INSERT INTO winner_payment_info 
         (user_id, game_session_id, prize_type, prize_amount, cbu, 
          bank_account_holder, bank_name, account_type, whatsapp, payment_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [userId, gameSessionId, prizeType, prizeAmount, cbu, 
         bankAccountHolder, bankName, accountType || 'savings', whatsapp]
      );
      
      result = { id: insertResult.insertId, updated: false };
    }

    res.json({
      success: true,
      message: result.updated ? 'Información actualizada exitosamente' : 'Información registrada exitosamente',
      data: {
        paymentInfoId: result.id,
        userId,
        prizeType,
        prizeAmount: parseFloat(prizeAmount),
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Error guardando información de pago:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// OBTENER INFORMACIÓN DE PAGO DEL USUARIO
// ============================================
exports.getMyPaymentInfo = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status, limit, offset } = req.query;

    let query = `
      SELECT * FROM winner_payment_info 
      WHERE user_id = ?
    `;
    const params = [userId];

    if (status) {
      query += ' AND payment_status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';
    
    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit));
      
      if (offset) {
        query += ' OFFSET ?';
        params.push(parseInt(offset));
      }
    }

    const [payments] = await pool.query(query, params);

    res.json({
      success: true,
      data: payments,
      total: payments.length
    });

  } catch (error) {
    console.error('Error obteniendo información de pago:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// LISTAR TODOS LOS PAGOS PENDIENTES (Admin)
// ============================================
exports.getPendingPayments = async (req, res) => {
  try {
    const { limit, offset } = req.query;

    let query = `
      SELECT 
        wpi.*,
        u.username,
        u.role
      FROM winner_payment_info wpi
      JOIN users u ON wpi.user_id = u.id
      WHERE wpi.payment_status = 'pending'
      ORDER BY wpi.created_at ASC
    `;

    const params = [];
    
    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit));
      
      if (offset) {
        query += ' OFFSET ?';
        params.push(parseInt(offset));
      }
    }

    const [payments] = await pool.query(query, params);

    res.json({
      success: true,
      data: payments,
      total: payments.length
    });

  } catch (error) {
    console.error('Error obteniendo pagos pendientes:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// PROCESAR PAGO (Marcar como completado)
// ============================================
exports.processPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { paymentReceipt, notes } = req.body;
    const processorId = req.user.userId;

    // Verificar que el pago existe y está pendiente
    const [payments] = await pool.query(
      'SELECT * FROM winner_payment_info WHERE id = ? AND payment_status = ?',
      [paymentId, 'pending']
    );

    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado o ya procesado'
      });
    }

    const payment = payments[0];

    // Actualizar estado del pago
    await pool.query(
      `UPDATE winner_payment_info 
       SET payment_status = 'completed',
           payment_receipt = ?,
           payment_date = NOW(),
           processed_by = ?,
           notes = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [paymentReceipt, processorId, notes, paymentId]
    );

    res.json({
      success: true,
      message: 'Pago procesado exitosamente',
      data: {
        paymentId: parseInt(paymentId),
        userId: payment.user_id,
        prizeAmount: parseFloat(payment.prize_amount),
        status: 'completed',
        processedBy: processorId
      }
    });

  } catch (error) {
    console.error('Error procesando pago:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// RECHAZAR/CANCELAR PAGO
// ============================================
exports.rejectPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;
    const processorId = req.user.userId;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un motivo para rechazar el pago'
      });
    }

    const [payments] = await pool.query(
      'SELECT * FROM winner_payment_info WHERE id = ?',
      [paymentId]
    );

    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }

    await pool.query(
      `UPDATE winner_payment_info 
       SET payment_status = 'failed',
           processed_by = ?,
           notes = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [processorId, reason, paymentId]
    );

    res.json({
      success: true,
      message: 'Pago rechazado',
      data: {
        paymentId: parseInt(paymentId),
        status: 'failed',
        reason
      }
    });

  } catch (error) {
    console.error('Error rechazando pago:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// OBTENER HISTORIAL COMPLETO (Admin)
// ============================================
exports.getPaymentHistory = async (req, res) => {
  try {
    const { userId, status, startDate, endDate, limit, offset } = req.query;

    let query = `
      SELECT 
        wpi.*,
        u.username,
        processor.username as processor_username
      FROM winner_payment_info wpi
      JOIN users u ON wpi.user_id = u.id
      LEFT JOIN users processor ON wpi.processed_by = processor.id
      WHERE 1=1
    `;

    const params = [];

    if (userId) {
      query += ' AND wpi.user_id = ?';
      params.push(parseInt(userId));
    }

    if (status) {
      query += ' AND wpi.payment_status = ?';
      params.push(status);
    }

    if (startDate) {
      query += ' AND wpi.created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND wpi.created_at <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY wpi.created_at DESC';

    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit));
      
      if (offset) {
        query += ' OFFSET ?';
        params.push(parseInt(offset));
      }
    }

    const [payments] = await pool.query(query, params);

    res.json({
      success: true,
      data: payments,
      total: payments.length
    });

  } catch (error) {
    console.error('Error obteniendo historial de pagos:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = exports;
