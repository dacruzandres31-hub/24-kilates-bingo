// ============================================
// SERVICIO DE GESTIÓN DE FICHAS (CHIPS)
// ============================================
// Sistema de depósitos/retiros de fichas SIN pasarela de pagos
// Los pagos se gestionan FUERA de la plataforma
// Este servicio solo maneja movimientos internos y auditoría
//
// ⚠️ IMPORTANTE - 3 PUNTOS CLAVE:
// 1. Usa MoneyMath (decimal.js) para cálculos precisos de dinero
// 2. Todas las operaciones son TRANSACCIONES ATÓMICAS (COMMIT/ROLLBACK)
// 3. Se valida balance antes y después para auditoría

const pool = require('../db');
const MoneyMath = require('../utils/moneyMath');

class ChipsService {
  
  // ============================================
  // DEPÓSITO DE FICHAS (Manual - Admin/Cajero)
  // ============================================
  static async depositChips(userId, amount, adminId, reason = 'Depósito manual') {
    if (amount <= 0) {
      throw new Error('La cantidad debe ser mayor a 0');
    }

    const connection = await pool.getConnection();
    
    try {
      // ⚠️ PUNTO CLAVE #3: TRANSACCIÓN ATÓMICA
      // Si falla cualquier paso, TODO se revierte (ROLLBACK)
      await connection.query('START TRANSACTION');

      // Obtener balance actual
      const [users] = await connection.query(
        'SELECT balance FROM users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        throw new Error('Usuario no encontrado');
      }

      // ⚠️ PUNTO CLAVE #1: MATEMÁTICAS PRECISAS
      // Usar MoneyMath en lugar de parseFloat
      const balanceBefore = MoneyMath.decimal(users[0].balance);
      const amountDecimal = MoneyMath.decimal(amount);
      const balanceAfter = balanceBefore.plus(amountDecimal);

      // Actualizar balance del usuario
      await connection.query(
        'UPDATE users SET balance = ? WHERE id = ?',
        [MoneyMath.toNumber(balanceAfter), userId]
      );

      // Registrar movimiento en el historial
      const [result] = await connection.query(
        `INSERT INTO chips_movements 
        (user_id, movement_type, amount, balance_before, balance_after, 
         admin_id, reason, metadata, created_at)
        VALUES (?, 'deposit', ?, ?, ?, ?, ?, ?, NOW())`,
        [
          userId,
          MoneyMath.toNumber(amountDecimal),
          MoneyMath.toNumber(balanceBefore),
          MoneyMath.toNumber(balanceAfter),
          adminId,
          reason,
          JSON.stringify({ ip: null, browser: null })
        ]
      );

      // ⚠️ PUNTO CLAVE #3: COMMIT solo si TODO fue exitoso
      await connection.query('COMMIT');

      return {
        success: true,
        movementId: result.insertId,
        userId,
        amount: MoneyMath.toNumber(amountDecimal),
        balanceBefore: MoneyMath.toNumber(balanceBefore),
        balanceAfter: MoneyMath.toNumber(balanceAfter),
        timestamp: new Date()
      };

    } catch (error) {
      // ⚠️ PUNTO CLAVE #3: ROLLBACK si algo falló
      // Si se corta la luz aquí, nada se guarda
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  }

  // ============================================
  // SOLICITUD DE RETIRO (Por el jugador)
  // ============================================
  static async createWithdrawalRequest(userId, amount, bankAccountHolder, cbu, bankName = null, accountType = 'savings') {
    if (amount <= 0) {
      throw new Error('La cantidad debe ser mayor a 0');
    }

    if (!bankAccountHolder || !cbu) {
      throw new Error('Datos bancarios incompletos');
    }

    if (cbu.length !== 22) {
      throw new Error('CBU inválido. Debe tener 22 dígitos');
    }

    const connection = await pool.getConnection();
    
    try {
      await connection.query('START TRANSACTION');

      // Verificar balance del usuario
      const [users] = await connection.query(
        'SELECT balance FROM users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        throw new Error('Usuario no encontrado');
      }

      const balance = parseFloat(users[0].balance);

      if (balance < amount) {
        throw new Error(`Fondos insuficientes. Balance: ${balance}, Solicitado: ${amount}`);
      }

      if (amount < 100) {
        throw new Error('El monto mínimo de retiro es 100 fichas');
      }

      // Crear solicitud de retiro
      const [result] = await connection.query(
        `INSERT INTO withdrawal_requests 
        (user_id, amount, bank_account_holder, cbu, bank_name, account_type, status, requested_at)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
        [userId, amount, bankAccountHolder, cbu, bankName, accountType]
      );

      await connection.query('COMMIT');

      return {
        success: true,
        withdrawalRequestId: result.insertId,
        userId,
        amount,
        status: 'pending',
        timestamp: new Date()
      };

    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  }

  // ============================================
  // PROCESAR RETIRO (Admin/Cajero con regla de 20 min)
  // ============================================
  static async processWithdrawalRequest(withdrawalRequestId, processorId, processorRole, transferReceipt = null) {
    const connection = await pool.getConnection();
    
    try {
      await connection.query('START TRANSACTION');

      // Obtener solicitud de retiro
      const [requests] = await connection.query(
        'SELECT * FROM withdrawal_requests WHERE id = ? AND status = \'pending\'',
        [withdrawalRequestId]
      );

      if (requests.length === 0) {
        throw new Error('Solicitud de retiro no encontrada o ya procesada');
      }

      const request = requests[0];
      const userId = request.user_id;
      const amount = parseFloat(request.amount);

      // Verificar regla de 20 minutos usando función SQL
      const [canProcess] = await connection.query(
        'SELECT can_process_withdrawal_time_rule(?, ?, ?) as can_process',
        [userId, amount, processorRole]
      );

      if (!canProcess[0].can_process) {
        const [minutesData] = await connection.query(
          'SELECT get_minutes_since_last_credit(?) as minutes',
          [userId]
        );
        const minutes = minutesData[0].minutes;

        throw new Error(
          `No tiene permisos para procesar este retiro. ` +
          `Han pasado ${minutes} minutos desde la última acreditación. ` +
          `Solo un superadmin puede procesar retiros después de 20 minutos.`
        );
      }

      // Obtener balance actual
      const [users] = await connection.query(
        'SELECT balance FROM users WHERE id = ?',
        [userId]
      );

      // ⚠️ PUNTO CLAVE #1: Usar MoneyMath para precisión
      const balanceBefore = MoneyMath.decimal(users[0].balance);
      const amountDecimal = MoneyMath.decimal(amount);

      if (MoneyMath.isLessThan(balanceBefore, amountDecimal)) {
        throw new Error(
          `Fondos insuficientes. Balance: ${MoneyMath.toString(balanceBefore)}, ` +
          `Requerido: ${MoneyMath.toString(amountDecimal)}`
        );
      }

      const balanceAfter = balanceBefore.minus(amountDecimal);

      // Registrar movimiento de fichas
      const [movementResult] = await connection.query(
        `INSERT INTO chips_movements 
        (user_id, movement_type, amount, balance_before, balance_after, 
         admin_id, reason, metadata, created_at)
        VALUES (?, 'withdrawal', ?, ?, ?, ?, ?, ?, NOW())`,
        [
          userId,
          MoneyMath.toNumber(amountDecimal.negated()), // Negativo para retiro
          MoneyMath.toNumber(balanceBefore),
          MoneyMath.toNumber(balanceAfter),
          processorId,
          `Retiro procesado - CBU: ${request.cbu}`,
          JSON.stringify({
            withdrawal_request_id: withdrawalRequestId,
            processor_role: processorRole,
            cbu: request.cbu,
            bank_account_holder: request.bank_account_holder
          })
        ]
      );

      const chipsMovementId = movementResult.insertId;

      // Actualizar solicitud de retiro
      await connection.query(
        `UPDATE withdrawal_requests 
        SET status = 'completed', 
            processed_at = NOW(), 
            completed_at = NOW(),
            processed_by = ?,
            processor_role = ?,
            chips_movement_id = ?,
            transfer_receipt = ?
        WHERE id = ?`,
        [processorId, processorRole, chipsMovementId, transferReceipt, withdrawalRequestId]
      );

      // Debitar fichas del usuario
      await connection.query(
        'UPDATE users SET balance = ? WHERE id = ?',
        [MoneyMath.toNumber(balanceAfter), userId]
      );

      // ⚠️ PUNTO CLAVE #3: COMMIT - Todo o nada
      await connection.query('COMMIT');

      return {
        success: true,
        withdrawalRequestId,
        chipsMovementId,
        userId,
        amount: MoneyMath.toNumber(amountDecimal),
        balanceBefore: MoneyMath.toNumber(balanceBefore),
        balanceAfter: MoneyMath.toNumber(balanceAfter),
        processorRole,
        timestamp: new Date()
      };

    } catch (error) {
      // ⚠️ PUNTO CLAVE #3: ROLLBACK - Si falla, nada se guarda
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  }

  // ============================================
  // RECHAZAR SOLICITUD DE RETIRO
  // ============================================
  static async rejectWithdrawalRequest(withdrawalRequestId, processorId, rejectionReason) {
    const connection = await pool.getConnection();
    
    try {
      await connection.query('START TRANSACTION');

      const [result] = await connection.query(
        `UPDATE withdrawal_requests 
        SET status = 'rejected',
            processed_at = NOW(),
            processed_by = ?,
            rejection_reason = ?
        WHERE id = ? AND status = 'pending'`,
        [processorId, rejectionReason, withdrawalRequestId]
      );

      if (result.affectedRows === 0) {
        throw new Error('Solicitud de retiro no encontrada o ya procesada');
      }

      await connection.query('COMMIT');

      return {
        success: true,
        withdrawalRequestId,
        status: 'rejected',
        reason: rejectionReason
      };

    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  }

  // ============================================
  // OBTENER SOLICITUDES DE RETIRO PENDIENTES
  // ============================================
  static async getPendingWithdrawals(filters = {}) {
    const { userId, limit = 100, offset = 0 } = filters;

    let query = `
      SELECT 
        wr.*,
        u.username,
        u.balance,
        get_minutes_since_last_credit(wr.user_id) as minutes_since_credit,
        CASE 
          WHEN get_minutes_since_last_credit(wr.user_id) < 20 THEN 'cajero_can_process'
          ELSE 'superadmin_only'
        END as processing_permission
      FROM withdrawal_requests wr
      JOIN users u ON wr.user_id = u.id
      WHERE wr.status = 'pending'
    `;

    const params = [];

    if (userId) {
      query += ' AND wr.user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY wr.requested_at ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [requests] = await pool.query(query, params);

    return requests;
  }

  // ============================================
  // OBTENER HISTORIAL DE RETIROS
  // ============================================
  static async getWithdrawalHistory(userId = null, filters = {}) {
    const { status, startDate, endDate, limit = 100, offset = 0 } = filters;

    let query = `
      SELECT 
        wr.*,
        u.username,
        u_processor.username as processor_username,
        TIMESTAMPDIFF(MINUTE, wr.requested_at, wr.completed_at) as processing_time_minutes
      FROM withdrawal_requests wr
      JOIN users u ON wr.user_id = u.id
      LEFT JOIN users u_processor ON wr.processed_by = u_processor.id
      WHERE 1=1
    `;

    const params = [];

    if (userId) {
      query += ' AND wr.user_id = ?';
      params.push(userId);
    }

    if (status) {
      query += ' AND wr.status = ?';
      params.push(status);
    }

    if (startDate) {
      query += ' AND wr.requested_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND wr.requested_at <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY wr.requested_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [requests] = await pool.query(query, params);

    return requests;
  }

  // ============================================
  // TRANSFERENCIA ENTRE USUARIOS
  // ============================================
  static async transferChips(fromUserId, toUserId, amount, reason = 'Transferencia entre usuarios') {
    if (amount <= 0) {
      throw new Error('La cantidad debe ser mayor a 0');
    }

    if (fromUserId === toUserId) {
      throw new Error('No puedes transferir fichas a ti mismo');
    }

    const connection = await pool.getConnection();
    
    try {
      await connection.query('START TRANSACTION');

      // Obtener balance del remitente
      const [fromUsers] = await connection.query(
        'SELECT balance FROM users WHERE id = ?',
        [fromUserId]
      );

      if (fromUsers.length === 0) {
        throw new Error('Usuario remitente no encontrado');
      }

      const fromBalanceBefore = parseFloat(fromUsers[0].balance);

      // Verificar fondos suficientes
      if (fromBalanceBefore < amount) {
        throw new Error(`Fondos insuficientes. Balance: ${fromBalanceBefore}, Solicitado: ${amount}`);
      }

      // Obtener balance del destinatario
      const [toUsers] = await connection.query(
        'SELECT balance FROM users WHERE id = ?',
        [toUserId]
      );

      if (toUsers.length === 0) {
        throw new Error('Usuario destinatario no encontrado');
      }

      const toBalanceBefore = parseFloat(toUsers[0].balance);

      const fromBalanceAfter = fromBalanceBefore - amount;
      const toBalanceAfter = toBalanceBefore + amount;

      // Actualizar balance del remitente
      await connection.query(
        'UPDATE users SET balance = balance - ? WHERE id = ?',
        [amount, fromUserId]
      );

      // Actualizar balance del destinatario
      await connection.query(
        'UPDATE users SET balance = balance + ? WHERE id = ?',
        [amount, toUserId]
      );

      // Registrar movimiento del remitente (salida)
      await connection.query(
        `INSERT INTO chips_movements 
        (user_id, movement_type, amount, balance_before, balance_after, 
         related_user_id, reason, metadata, created_at)
        VALUES (?, 'transfer_out', ?, ?, ?, ?, ?, ?, NOW())`,
        [
          fromUserId,
          amount,
          fromBalanceBefore,
          fromBalanceAfter,
          toUserId,
          reason,
          JSON.stringify({ to_user_id: toUserId })
        ]
      );

      // Registrar movimiento del destinatario (entrada)
      const [result] = await connection.query(
        `INSERT INTO chips_movements 
        (user_id, movement_type, amount, balance_before, balance_after, 
         related_user_id, reason, metadata, created_at)
        VALUES (?, 'transfer_in', ?, ?, ?, ?, ?, ?, NOW())`,
        [
          toUserId,
          amount,
          toBalanceBefore,
          toBalanceAfter,
          fromUserId,
          reason,
          JSON.stringify({ from_user_id: fromUserId })
        ]
      );

      await connection.query('COMMIT');

      return {
        success: true,
        fromUserId,
        toUserId,
        amount,
        fromBalanceBefore,
        fromBalanceAfter,
        toBalanceBefore,
        toBalanceAfter,
        timestamp: new Date()
      };

    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  }

  // ============================================
  // AJUSTE DE FICHAS (Admin - Corrección)
  // ============================================
  static async adjustChips(userId, amount, adminId, reason) {
    if (amount === 0) {
      throw new Error('El ajuste no puede ser 0');
    }

    const connection = await pool.getConnection();
    
    try {
      await connection.query('START TRANSACTION');

      // Obtener balance actual
      const [users] = await connection.query(
        'SELECT balance FROM users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        throw new Error('Usuario no encontrado');
      }

      const balanceBefore = parseFloat(users[0].balance);
      const balanceAfter = balanceBefore + amount;

      // Verificar que el ajuste negativo no deje balance negativo
      if (balanceAfter < 0) {
        throw new Error(`Ajuste inválido. Balance resultante sería negativo: ${balanceAfter}`);
      }

      // Actualizar balance del usuario
      await connection.query(
        'UPDATE users SET balance = balance + ? WHERE id = ?',
        [amount, userId]
      );

      // Registrar movimiento en el historial
      const [result] = await connection.query(
        `INSERT INTO chips_movements 
        (user_id, movement_type, amount, balance_before, balance_after, 
         admin_id, reason, metadata, created_at)
        VALUES (?, 'adjustment', ?, ?, ?, ?, ?, ?, NOW())`,
        [
          userId,
          amount,
          balanceBefore,
          balanceAfter,
          adminId,
          reason,
          JSON.stringify({ adjustment_type: amount > 0 ? 'positive' : 'negative' })
        ]
      );

      await connection.query('COMMIT');

      return {
        success: true,
        movementId: result.insertId,
        userId,
        amount,
        balanceBefore,
        balanceAfter,
        timestamp: new Date()
      };

    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  }

  // ============================================
  // REGISTRAR MOVIMIENTO DE JUEGO (Apuesta/Premio)
  // ============================================
  static async recordGameMovement(userId, amount, gameSessionId, movementType, reason) {
    const connection = await pool.getConnection();
    
    try {
      // ⚠️ PUNTO CLAVE #3: TRANSACCIÓN ATÓMICA
      await connection.query('START TRANSACTION');

      // Obtener balance actual
      const [users] = await connection.query(
        'SELECT balance FROM users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        throw new Error('Usuario no encontrado');
      }

      // ⚠️ PUNTO CLAVE #1: MATEMÁTICAS PRECISAS con MoneyMath
      const balanceBefore = MoneyMath.decimal(users[0].balance);
      const amountDecimal = MoneyMath.decimal(amount);
      const balanceAfter = balanceBefore.plus(amountDecimal);

      // Actualizar balance del usuario
      await connection.query(
        'UPDATE users SET balance = ? WHERE id = ?',
        [MoneyMath.toNumber(balanceAfter), userId]
      );

      // Registrar movimiento en el historial
      const [result] = await connection.query(
        `INSERT INTO chips_movements 
        (user_id, movement_type, amount, balance_before, balance_after, 
         game_session_id, reason, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          userId,
          movementType, // 'bet', 'win', 'refund'
          MoneyMath.toNumber(amountDecimal),
          MoneyMath.toNumber(balanceBefore),
          MoneyMath.toNumber(balanceAfter),
          gameSessionId,
          reason,
          JSON.stringify({ game_session_id: gameSessionId })
        ]
      );

      // ⚠️ PUNTO CLAVE #3: COMMIT - Todo o nada
      await connection.query('COMMIT');

      return {
        success: true,
        movementId: result.insertId,
        userId,
        amount: MoneyMath.toNumber(amountDecimal),
        balanceBefore: MoneyMath.toNumber(balanceBefore),
        balanceAfter: MoneyMath.toNumber(balanceAfter)
      };

    } catch (error) {
      // ⚠️ PUNTO CLAVE #3: ROLLBACK si falla
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  }

  // ============================================
  // OBTENER HISTORIAL DE MOVIMIENTOS
  // ============================================
  static async getMovementHistory(userId, filters = {}) {
    const { movementType, startDate, endDate, limit = 100, offset = 0 } = filters;

    let query = `
      SELECT 
        cm.*,
        u_admin.username as admin_username,
        u_related.username as related_username
      FROM chips_movements cm
      LEFT JOIN users u_admin ON cm.admin_id = u_admin.id
      LEFT JOIN users u_related ON cm.related_user_id = u_related.id
      WHERE cm.user_id = ?
    `;
    const params = [userId];

    if (movementType) {
      query += ' AND cm.movement_type = ?';
      params.push(movementType);
    }

    if (startDate) {
      query += ' AND cm.created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND cm.created_at <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY cm.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [movements] = await pool.query(query, params);

    // Obtener balance actual
    const [users] = await pool.query('SELECT balance FROM users WHERE id = ?', [userId]);
    const currentBalance = users.length > 0 ? parseFloat(users[0].balance) : 0;

    return {
      movements,
      currentBalance,
      total: movements.length
    };
  }

  // ============================================
  // AUDITORÍA: VERIFICAR INTEGRIDAD DEL BALANCE
  // ============================================
  static async auditUserBalance(userId) {
    const connection = await pool.getConnection();
    
    try {
      // Obtener balance actual del usuario
      const [users] = await connection.query(
        'SELECT balance, username FROM users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        throw new Error('Usuario no encontrado');
      }

      const currentBalance = parseFloat(users[0].balance);
      const username = users[0].username;

      // Obtener todos los movimientos
      const [movements] = await connection.query(
        'SELECT * FROM chips_movements WHERE user_id = ? ORDER BY created_at ASC',
        [userId]
      );

      // Calcular balance esperado basado en movimientos
      let calculatedBalance = 0;
      const discrepancies = [];

      for (const movement of movements) {
        const expectedBefore = calculatedBalance;
        const amount = parseFloat(movement.amount);
        const balanceBefore = parseFloat(movement.balance_before);
        const balanceAfter = parseFloat(movement.balance_after);

        // Verificar que balance_before coincida con el calculado
        if (Math.abs(expectedBefore - balanceBefore) > 0.01) {
          discrepancies.push({
            movementId: movement.id,
            timestamp: movement.created_at,
            expected: expectedBefore,
            recorded: balanceBefore,
            difference: balanceBefore - expectedBefore
          });
        }

        // Actualizar balance calculado
        calculatedBalance = balanceAfter;
      }

      // Verificar que el balance final coincida
      const finalDiscrepancy = Math.abs(calculatedBalance - currentBalance);
      const isValid = finalDiscrepancy < 0.01 && discrepancies.length === 0;

      return {
        userId,
        username,
        currentBalance,
        calculatedBalance,
        finalDiscrepancy,
        isValid,
        discrepancies,
        totalMovements: movements.length
      };

    } finally {
      connection.release();
    }
  }

  // ============================================
  // ESTADÍSTICAS DE MOVIMIENTOS
  // ============================================
  static async getMovementStats(userId, period = '30d') {
    let dateFilter = 'DATE_SUB(NOW(), INTERVAL 30 DAY)';
    if (period === '7d') dateFilter = 'DATE_SUB(NOW(), INTERVAL 7 DAY)';
    if (period === '90d') dateFilter = 'DATE_SUB(NOW(), INTERVAL 90 DAY)';

    const [stats] = await pool.query(
      `SELECT 
        movement_type,
        COUNT(*) as count,
        SUM(amount) as total,
        AVG(amount) as average,
        MIN(amount) as min,
        MAX(amount) as max
      FROM chips_movements
      WHERE user_id = ? AND created_at >= ${dateFilter}
      GROUP BY movement_type`,
      [userId]
    );

    return stats;
  }
}

module.exports = ChipsService;
