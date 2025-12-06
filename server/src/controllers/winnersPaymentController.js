// ============================================
// CONTROLADOR: DATOS DE PAGO DE GANADORES
// ============================================

const pool = require('../db');

// ============================================
// ENVIAR DATOS BANCARIOS (Jugador ganador)
// ============================================
exports.submitPaymentInfo = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { 
      gameSessionId, 
      prizeType, 
      prizeAmount, 
      salaType,
      bankAccountHolder, 
      cbu, 
      bankName, 
      accountType, 
      whatsappNumber 
    } = req.body;

    // Validaciones
    if (!bankAccountHolder || !cbu || !whatsappNumber) {
      return res.status(400).json({
        success: false,
        message: 'Datos incompletos: bankAccountHolder, cbu y whatsappNumber son requeridos'
      });
    }

    if (cbu.length !== 22) {
      return res.status(400).json({
        success: false,
        message: 'CBU inválido. Debe tener 22 dígitos'
      });
    }

    if (!prizeType || !prizeAmount || !salaType) {
      return res.status(400).json({
        success: false,
        message: 'Datos del premio incompletos: prizeType, prizeAmount y salaType son requeridos'
      });
    }

    // Validar que la sala sea monetizada
    const validSalas = ['bronce', 'plata', 'oro'];
    if (!validSalas.includes(salaType)) {
      return res.status(400).json({
        success: false,
        message: 'salaType inválido. Debe ser: bronce, plata u oro'
      });
    }

    // Obtener IP y User Agent
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Insertar datos de pago
    const [result] = await pool.query(
      `INSERT INTO winners_payment_info 
      (user_id, game_session_id, prize_type, prize_amount, sala_type,
       bank_account_holder, cbu, bank_name, account_type, whatsapp_number,
       payment_status, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [
        userId,
        gameSessionId || null,
        prizeType,
        prizeAmount,
        salaType,
        bankAccountHolder,
        cbu,
        bankName || null,
        accountType || 'savings',
        whatsappNumber,
        ipAddress,
        userAgent
      ]
    );

    // Emitir confirmación por Socket.IO
    const io = req.app.get('io');
    if (io) {
      const { confirmPaymentDataSubmitted } = require('../socket/winnerEvents');
      confirmPaymentDataSubmitted(io, userId, result.insertId);
    }

    res.json({
      success: true,
      message: 'Datos bancarios registrados exitosamente. El pago será procesado en breve.',
      data: {
        paymentInfoId: result.insertId,
        prizeAmount,
        prizeType,
        salaType,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Error guardando datos de pago:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// OBTENER MIS DATOS DE PAGO PENDIENTES (Jugador)
// ============================================
exports.getMyPendingPayments = async (req, res) => {
  try {
    const userId = req.user.userId;

    const [payments] = await pool.query(
      `SELECT 
        id,
        prize_type,
        prize_amount,
        sala_type,
        bank_account_holder,
        cbu,
        whatsapp_number,
        payment_status,
        submitted_at
      FROM winners_payment_info
      WHERE user_id = ? AND payment_status IN ('pending', 'processing')
      ORDER BY submitted_at DESC`,
      [userId]
    );

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
// OBTENER HISTORIAL DE PAGOS (Jugador)
// ============================================
exports.getMyPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit, offset } = req.query;

    const [payments] = await pool.query(
      `SELECT 
        id,
        prize_type,
        prize_amount,
        sala_type,
        payment_status,
        payment_date,
        payment_receipt,
        submitted_at
      FROM winners_payment_info
      WHERE user_id = ?
      ORDER BY submitted_at DESC
      LIMIT ? OFFSET ?`,
      [userId, parseInt(limit) || 50, parseInt(offset) || 0]
    );

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

// ============================================
// LISTAR TODOS LOS PAGOS PENDIENTES (Admin)
// ============================================
exports.getAllPendingPayments = async (req, res) => {
  try {
    const { salaType, limit, offset } = req.query;

    let query = `
      SELECT 
        wpi.id,
        wpi.user_id,
        u.username,
        wpi.prize_type,
        wpi.prize_amount,
        wpi.sala_type,
        wpi.bank_account_holder,
        wpi.cbu,
        wpi.bank_name,
        wpi.whatsapp_number,
        wpi.payment_status,
        wpi.submitted_at,
        TIMESTAMPDIFF(HOUR, wpi.submitted_at, NOW()) as hours_pending
      FROM winners_payment_info wpi
      JOIN users u ON wpi.user_id = u.id
      WHERE wpi.payment_status = 'pending'
        AND wpi.bank_account_holder != 'PENDIENTE'
    `;

    const params = [];

    if (salaType) {
      query += ' AND wpi.sala_type = ?';
      params.push(salaType);
    }

    query += ' ORDER BY wpi.submitted_at ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit) || 100, parseInt(offset) || 0);

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
// PROCESAR PAGO A GANADOR (Admin)
// ============================================
exports.processWinnerPayment = async (req, res) => {
  try {
    const { paymentInfoId } = req.params;
    const { paymentReceipt } = req.body;
    const processorId = req.user.userId;

    if (!paymentReceipt) {
      return res.status(400).json({
        success: false,
        message: 'paymentReceipt es requerido'
      });
    }

    const connection = await pool.getConnection();

    try {
      await connection.query('START TRANSACTION');

      // Obtener información del pago
      const [payments] = await connection.query(
        'SELECT * FROM winners_payment_info WHERE id = ? AND payment_status = ?',
        [paymentInfoId, 'pending']
      );

      if (payments.length === 0) {
        throw new Error('Pago no encontrado o ya procesado');
      }

      const payment = payments[0];

      // Actualizar estado del pago
      await connection.query(
        `UPDATE winners_payment_info 
        SET payment_status = 'completed',
            payment_date = NOW(),
            payment_receipt = ?,
            processed_by = ?
        WHERE id = ?`,
        [paymentReceipt, processorId, paymentInfoId]
      );

      await connection.query('COMMIT');

      // Emitir evento Socket.IO al ganador
      const io = req.app.get('io');
      if (io) {
        const { notifyPaymentCompleted } = require('../socket/winnerEvents');
        notifyPaymentCompleted(io, payment.user_id, parseFloat(payment.prize_amount), paymentReceipt);
      }

      res.json({
        success: true,
        message: 'Pago procesado exitosamente',
        data: {
          paymentInfoId: parseInt(paymentInfoId),
          prizeAmount: parseFloat(payment.prize_amount),
          userId: payment.user_id,
          paymentReceipt
        }
      });

    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error procesando pago:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// MARCAR PAGO COMO FALLIDO (Admin)
// ============================================
exports.markPaymentAsFailed = async (req, res) => {
  try {
    const { paymentInfoId } = req.params;
    const { reason } = req.body;
    const processorId = req.user.userId;

    await pool.query(
      `UPDATE winners_payment_info 
      SET payment_status = 'failed',
          payment_receipt = ?,
          processed_by = ?,
          payment_date = NOW()
      WHERE id = ?`,
      [reason || 'Pago fallido', processorId, paymentInfoId]
    );

    res.json({
      success: true,
      message: 'Pago marcado como fallido'
    });

  } catch (error) {
    console.error('Error marcando pago como fallido:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// ESTADÍSTICAS DE PAGOS (Admin)
// ============================================
exports.getPaymentStats = async (req, res) => {
  try {
    // Total por sala
    const [bySala] = await pool.query(`
      SELECT 
        sala_type,
        COUNT(*) as total_winners,
        SUM(prize_amount) as total_prizes,
        SUM(CASE WHEN payment_status = 'pending' THEN prize_amount ELSE 0 END) as pending_amount,
        SUM(CASE WHEN payment_status = 'completed' THEN prize_amount ELSE 0 END) as paid_amount
      FROM winners_payment_info
      GROUP BY sala_type
    `);

    // Total por tipo de premio
    const [byPrizeType] = await pool.query(`
      SELECT 
        prize_type,
        COUNT(*) as total_winners,
        SUM(prize_amount) as total_prizes
      FROM winners_payment_info
      GROUP BY prize_type
    `);

    // Pendientes de pago
    const [pending] = await pool.query(`
      SELECT COUNT(*) as count, SUM(prize_amount) as amount
      FROM winners_payment_info
      WHERE payment_status = 'pending' AND bank_account_holder != 'PENDIENTE'
    `);

    res.json({
      success: true,
      data: {
        bySala,
        byPrizeType,
        pending: {
          count: pending[0].count,
          amount: parseFloat(pending[0].amount) || 0
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  submitPaymentInfo,
  getMyPendingPayments,
  getMyPaymentHistory,
  getAllPendingPayments,
  processWinnerPayment,
  markPaymentAsFailed,
  getPaymentStats
};
