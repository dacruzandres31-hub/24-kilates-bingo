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
  static async createWithdrawalRequest(userId, amount, bankAccountHolder, cbu, bankName = null, accountType = 'savings', isReferralEarnings = false) {
    if (amount <= 0) {
      throw new Error('La cantidad debe ser mayor a 0');
    }

    if (!bankAccountHolder || !cbu) {
      throw new Error('Datos bancarios incompletos');
    }

    // Validar CBU/CVU: si es solo números, debe tener 22 dígitos
    const onlyDigits = cbu.replace(/\D/g, '');
    if (onlyDigits.length > 0 && onlyDigits.length === cbu.length) {
      // Es un CBU/CVU numérico
      if (onlyDigits.length !== 22) {
        throw new Error('El CBU/CVU debe tener exactamente 22 dígitos');
      }
    }

    // --- REGLA: Retiro de ganancias por referidos solo del 1 al 10 ---
    if (isReferralEarnings) {
      const today = new Date().getDate();
      if (today < 1 || today > 10) {
        throw new Error('Los retiros de ganancias por referidos solo están permitidos del 1 al 10 de cada mes.');
      }
    }

    const connection = await pool.getConnection();

    try {
      await connection.query('START TRANSACTION');

      // Verificar balance del usuario (dependiendo de si es retiro de ganancias o chips normales)
      const balanceColumn = isReferralEarnings ? 'referral_balance' : 'balance';
      const [users] = await connection.query(
        `SELECT ${balanceColumn} as current_balance FROM users WHERE id = ? FOR UPDATE`,
        [userId]
      );

      if (users.length === 0) {
        throw new Error('Usuario no encontrado');
      }

      // ⚠️ PUNTO CLAVE #1: MATEMÁTICAS PRECISAS
      const balanceDecimal = MoneyMath.decimal(users[0].current_balance);
      const amountDecimal = MoneyMath.decimal(amount);

      if (balanceDecimal.lessThan(amountDecimal)) {
        throw new Error(`Fondos insuficientes en balance de ${isReferralEarnings ? 'referidos' : 'fichas'}. Balance: ${MoneyMath.toString(balanceDecimal)}, Solicitado: ${MoneyMath.toString(amountDecimal)}`);
      }

      if (!isReferralEarnings && amount < 100) {
        throw new Error('El monto mínimo de retiro es 100 fichas');
      }

      const balanceAfter = balanceDecimal.minus(amountDecimal);

      // 1. DEBITAR BALANCE INMEDIATAMENTE
      await connection.query(
        `UPDATE users SET ${balanceColumn} = ? WHERE id = ?`,
        [MoneyMath.toNumber(balanceAfter), userId]
      );

      // 2. REGISTRAR MOVIMIENTO (WITHDRAWAL_HOLD)
      // Usamos 'withdrawal' pero queda asociado a la request pending
      const [movementResult] = await connection.query(
        `INSERT INTO chips_movements 
        (user_id, movement_type, amount, balance_before, balance_after, 
         reason, metadata, created_at)
        VALUES (?, 'withdrawal', ?, ?, ?, ?, ?, NOW())`,
        [
          userId,
          MoneyMath.toNumber(amountDecimal.negated()), // Negativo
          MoneyMath.toNumber(balanceDecimal),
          MoneyMath.toNumber(balanceAfter),
          'Solicitud de Retiro (Hold)',
          JSON.stringify({ cbu, bankAccountHolder, status: 'pending' })
        ]
      );

      const chipsMovementId = movementResult.insertId;

      // 3. CREAR SOLICITUD DE RETIRO
      const [result] = await connection.query(
        `INSERT INTO withdrawal_requests 
        (user_id, amount, bank_account_holder, cbu, bank_name, account_type, status, requested_at, chips_movement_id)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW(), ?)`,
        [userId, amount, bankAccountHolder, cbu, bankName, accountType, chipsMovementId]
      );

      await connection.query('COMMIT');

      // Emitir evento WebSocket para nueva solicitud de retiro
      if (global.io) {
        // Notificar a todos los admins
        global.io.emit('withdrawal_request_created', {
          requestId: result.insertId,
          userId,
          amount,
          username: users[0].username,
          timestamp: new Date().toISOString()
        });
        console.log(`[ChipsService] 📡 Emitido withdrawal_request_created para request #${result.insertId}`);
      }

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

      // Verificar regla de 20 minutos - lógica en JavaScript
      // SuperAdmin siempre puede procesar
      if (processorRole !== 'superadmin') {
        // Obtener última acreditación de fichas
        const [creditData] = await connection.query(
          `SELECT MAX(created_at) as last_credit 
           FROM chips_movements 
           WHERE user_id = ? 
             AND movement_type IN ('deposit', 'win', 'bonus', 'transfer_in')
             AND amount > 0`,
          [userId]
        );

        const lastCredit = creditData[0].last_credit;
        
        if (!lastCredit) {
          throw new Error('No hay acreditaciones registradas para este usuario.');
        }

        const minutesElapsed = Math.floor((Date.now() - new Date(lastCredit).getTime()) / 60000);

        // Cajero solo puede procesar si pasaron MENOS de 20 minutos
        if (minutesElapsed >= 20) {
          throw new Error(
            `No tiene permisos para procesar este retiro. ` +
            `Han pasado ${minutesElapsed} minutos desde la última acreditación. ` +
            `Solo un superadmin puede procesar retiros después de 20 minutos.`
          );
        }
      }

      // YA NO DEBITAMOS AQUÍ (Se debitó al solicitar)
      // Solo actualizamos el estado de la solicitud a 'completed'

      await connection.query(
        `UPDATE withdrawal_requests 
         SET status = 'completed', 
             processed_at = NOW(), 
             processed_by = ?,
             transfer_receipt = ?
         WHERE id = ?`,
        [processorId, transferReceipt, withdrawalRequestId]
      );

      // Obtener el balance actual del usuario para el reporte
      const [userBalance] = await connection.query(
        'SELECT balance FROM users WHERE id = ?',
        [userId]
      );

      await connection.query('COMMIT');

      // Emitir eventos WebSocket
      if (global.io) {
        // Notificar al jugador
        global.io.to(`user_${userId}`).emit('withdrawal_status_updated', {
          status: 'completed',
          requestId: withdrawalRequestId,
          amount: amount,
          message: '✅ Tu retiro ha sido procesado exitosamente'
        });
        
        // Notificar a todos los admins
        global.io.emit('withdrawal_request_processed', {
          requestId: withdrawalRequestId,
          status: 'completed',
          userId,
          amount,
          processedBy: processorId,
          timestamp: new Date().toISOString()
        });
      }

      return {
        success: true,
        withdrawalRequestId,
        userId,
        amount,
        currentBalance: parseFloat(userBalance[0].balance),
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

      const [withdrawalReqs] = await connection.query(
        'SELECT user_id, amount FROM withdrawal_requests WHERE id = ? AND status = \'pending\'',
        [withdrawalRequestId]
      );

      if (withdrawalReqs.length === 0) {
        throw new Error('Solicitud no encontrada o ya procesada');
      }

      const { user_id: userId, amount } = withdrawalReqs[0];

      // 1. ACTUALIZAR ESTADO A REJECTED
      await connection.query(
        `UPDATE withdrawal_requests 
        SET status = 'rejected',
            processed_at = NOW(),
            processed_by = ?,
            rejection_reason = ?
        WHERE id = ?`,
        [processorId, rejectionReason, withdrawalRequestId]
      );

      // 2. DEVOLVER EL DINERO (REFUND)
      const [users] = await connection.query('SELECT balance FROM users WHERE id = ?', [userId]);
      const balanceBefore = MoneyMath.decimal(users[0].balance);
      const amountDecimal = MoneyMath.decimal(amount);
      const balanceAfter = balanceBefore.plus(amountDecimal);

      await connection.query('UPDATE users SET balance = ? WHERE id = ?', [MoneyMath.toNumber(balanceAfter), userId]);

      // 3. REGISTRAR MOVIMIENTO (REFUND)
      await connection.query(
        `INSERT INTO chips_movements 
          (user_id, movement_type, amount, balance_before, balance_after, 
           admin_id, reason, metadata, created_at)
          VALUES (?, 'refund', ?, ?, ?, ?, ?, ?, NOW())`,
        [
          userId,
          MoneyMath.toNumber(amountDecimal),
          MoneyMath.toNumber(balanceBefore),
          MoneyMath.toNumber(balanceAfter),
          processorId,
          `Reintegro por rechazo de retiro #${withdrawalRequestId}: ${rejectionReason}`,
          JSON.stringify({ withdrawal_request_id: withdrawalRequestId })
        ]
      );

      if (result.affectedRows === 0) {
        throw new Error('Solicitud de retiro no encontrada o ya procesada');
      }

      await connection.query('COMMIT');

      // Emitir eventos WebSocket
      if (global.io) {
        // Notificar al jugador que su retiro fue rechazado y el dinero devuelto
        global.io.to(`user_${userId}`).emit('withdrawal_status_updated', {
          status: 'rejected',
          requestId: withdrawalRequestId,
          amount: MoneyMath.toNumber(amountDecimal),
          reason: rejectionReason,
          message: `❌ Tu retiro fue rechazado. Razón: ${rejectionReason}. El monto fue devuelto a tu balance.`
        });
        
        // También notificar resources_updated para que se actualice el balance en UI
        global.io.to(`user_${userId}`).emit('resources_updated', {
          trigger: 'withdrawal_rejected',
          balance: MoneyMath.toNumber(balanceAfter)
        });
        
        // Notificar a todos los admins
        global.io.emit('withdrawal_request_processed', {
          requestId: withdrawalRequestId,
          status: 'rejected',
          userId,
          amount: MoneyMath.toNumber(amountDecimal),
          processedBy: processorId,
          reason: rejectionReason,
          timestamp: new Date().toISOString()
        });
      }

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
        u_admin.username as admin_username
      FROM chips_movements cm
      LEFT JOIN users u_admin ON cm.created_by = u_admin.id
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
