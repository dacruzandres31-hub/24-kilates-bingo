const pool = require('../db');
const MoneyMath = require('../utils/moneyMath');

/**
 * MÓDULO 7: API del Dashboard Administrativo
 * 
 * Proporciona estadísticas en tiempo real para el panel de administración:
 * - Ganancia neta (10% casa)
 * - Comisiones pendientes (5% admins + 15% cajeros)
 * - Usuarios y roles
 * - Estado de pozos (3 líneas, 3 bingos, 3 acumulativos)
 * - Métricas de sesiones activas
 * 
 * ⚡ Optimizado con consultas paralelas (Promise.all)
 * 💰 Usa MoneyMath para cálculos precisos
 */

/**
 * GET /api/admin/dashboard/stats
 * Retorna estadísticas consolidadas del sistema
 */
async function getDashboardStats(req, res) {
  try {
    // ⚡ Ejecutar consultas en paralelo para velocidad máxima
    const [
      usersResult,
      salesResult,
      sessionsResult,
      balancesResult,
      withdrawalsResult,
      recentMovementsResult
    ] = await Promise.all([
      // 1. Contar usuarios por rol
      pool.query(`
        SELECT role, COUNT(*) as count 
        FROM users 
        GROUP BY role
      `),
      
      // 2. Calcular ventas del día (basado en chips_movements)
      pool.query(`
        SELECT 
          SUM(CASE WHEN movement_type = 'deposit' THEN amount ELSE 0 END) as total_deposits,
          SUM(CASE WHEN movement_type = 'withdrawal' THEN amount ELSE 0 END) as total_withdrawals,
          SUM(CASE WHEN movement_type = 'bet' THEN amount ELSE 0 END) as total_bets,
          SUM(CASE WHEN movement_type = 'win' THEN amount ELSE 0 END) as total_wins,
          COUNT(DISTINCT user_id) as active_users_today
        FROM chips_movements 
        WHERE DATE(created_at) = CURDATE()
      `),

      // 3. Estado de sesiones de juego (pozos actuales)
      pool.query(`
        SELECT 
          id,
          room,
          status,
          current_pot_linea,
          current_pot_bingo,
          accumulated_pot,
          total_cards_sold,
          start_time,
          end_time
        FROM game_sessions 
        WHERE status IN ('pending', 'active', 'completed')
        ORDER BY start_time DESC 
        LIMIT 10
      `),

      // 4. Balance total del sistema
      pool.query(`
        SELECT 
          SUM(balance) as total_balance,
          COUNT(*) as users_with_balance
        FROM users 
        WHERE balance > 0
      `),

      // 5. Retiros pendientes
      pool.query(`
        SELECT 
          COUNT(*) as pending_count,
          SUM(amount) as pending_amount
        FROM withdrawal_requests 
        WHERE status = 'pending'
      `),

      // 6. Movimientos recientes (últimos 20)
      pool.query(`
        SELECT 
          cm.id,
          cm.user_id,
          u.username,
          cm.movement_type,
          cm.amount,
          cm.balance_after,
          cm.reason,
          cm.created_at
        FROM chips_movements cm
        JOIN users u ON cm.user_id = u.id
        ORDER BY cm.created_at DESC
        LIMIT 20
      `)
    ]);

    // Procesar datos de usuarios
    const [usersRows] = usersResult;
    const usuariosStats = {
      total: usersRows.reduce((sum, r) => sum + parseInt(r.count), 0),
      jugadores: usersRows.find(r => r.role === 'player')?.count || 0,
      cajeros: usersRows.find(r => r.role === 'cajero')?.count || 0,
      admins: usersRows.find(r => r.role === 'admin')?.count || 0,
      superadmins: usersRows.find(r => r.role === 'superadmin')?.count || 0
    };

    // 💰 Procesar datos financieros con MoneyMath
    const [salesRows] = salesResult;
    const salesData = salesRows[0] || {};
    
    const totalDeposits = MoneyMath.decimal(salesData.total_deposits || 0);
    const totalWithdrawals = MoneyMath.decimal(salesData.total_withdrawals || 0);
    const totalBets = MoneyMath.decimal(salesData.total_bets || 0);
    const totalWins = MoneyMath.decimal(salesData.total_wins || 0);
    
    // Calcular ventas netas del día (depósitos - retiros)
    const ventasNetas = MoneyMath.subtract(
      MoneyMath.toNumber(totalDeposits),
      MoneyMath.toNumber(totalWithdrawals)
    );

    // Aplicar reglas de distribución:
    // - 10% Casa (ganancia neta)
    // - 5% Admins (deuda con socios)
    // - 15% Cajeros (comisiones)
    // - 70% Pozos y premios
    const finanzasHoy = {
      ventas_brutas: MoneyMath.toNumber(totalDeposits),
      ventas_netas: ventasNetas,
      total_retiros: MoneyMath.toNumber(totalWithdrawals),
      total_apuestas: MoneyMath.toNumber(totalBets),
      total_premios: MoneyMath.toNumber(totalWins),
      
      // 💵 Distribución según reglas del negocio
      ganancia_casa_10: MoneyMath.percentage(ventasNetas, 10),
      comisiones_admin_5: MoneyMath.percentage(ventasNetas, 5),
      comisiones_cajero_15: MoneyMath.percentage(ventasNetas, 15),
      para_pozos_70: MoneyMath.percentage(ventasNetas, 70),
      
      usuarios_activos_hoy: salesData.active_users_today || 0
    };

    // Procesar sesiones de juego (pozos)
    const [sessionsRows] = sessionsResult;
    const sesionesActivas = sessionsRows.filter(s => s.status === 'active');
    const sesionesPendientes = sessionsRows.filter(s => s.status === 'pending');
    
    // Calcular pozos totales
    let totalPozosLinea = MoneyMath.decimal(0);
    let totalPozosBingo = MoneyMath.decimal(0);
    let totalPozosAcumulativos = MoneyMath.decimal(0);

    for (const session of sessionsRows) {
      totalPozosLinea = totalPozosLinea.plus(session.current_pot_linea || 0);
      totalPozosBingo = totalPozosBingo.plus(session.current_pot_bingo || 0);
      totalPozosAcumulativos = totalPozosAcumulativos.plus(session.accumulated_pot || 0);
    }

    const juegoStats = {
      sesiones_activas: sesionesActivas.length,
      sesiones_pendientes: sesionesPendientes.length,
      sesiones_completadas_hoy: sessionsRows.filter(s => 
        s.status === 'completed' && 
        new Date(s.end_time).toDateString() === new Date().toDateString()
      ).length,
      
      // Estado de pozos (3 salas: sala1, sala2, sala3)
      pozos: {
        total_linea: MoneyMath.toNumber(totalPozosLinea),
        total_bingo: MoneyMath.toNumber(totalPozosBingo),
        total_acumulativo: MoneyMath.toNumber(totalPozosAcumulativos),
        suma_total: MoneyMath.toNumber(
          totalPozosLinea.plus(totalPozosBingo).plus(totalPozosAcumulativos)
        )
      },
      
      // Próximas sesiones por sala
      proximas_sesiones: sesionesPendientes.slice(0, 3).map(s => ({
        id: s.id,
        sala: s.room,
        pozo_linea: s.current_pot_linea,
        pozo_bingo: s.current_pot_bingo,
        pozo_acumulativo: s.accumulated_pot,
        inicio_estimado: s.start_time
      }))
    };

    // Procesar balances
    const [balancesRows] = balancesResult;
    const balanceData = balancesRows[0] || {};
    
    const sistemaStats = {
      balance_total_usuarios: balanceData.total_balance || 0,
      usuarios_con_saldo: balanceData.users_with_balance || 0,
      estado_servidor: 'ONLINE 🟢',
      timestamp: new Date().toISOString()
    };

    // Procesar retiros pendientes
    const [withdrawalsRows] = withdrawalsResult;
    const withdrawalData = withdrawalsRows[0] || {};
    
    const retirosStats = {
      pendientes_count: withdrawalData.pending_count || 0,
      pendientes_monto: withdrawalData.pending_amount || 0,
      requiere_atencion: (withdrawalData.pending_count || 0) > 0
    };

    // Procesar movimientos recientes
    const [movementsRows] = recentMovementsResult;
    const movimientosRecientes = movementsRows.map(m => ({
      id: m.id,
      usuario: m.username,
      tipo: m.movement_type,
      monto: m.amount,
      balance_resultante: m.balance_after,
      razon: m.reason,
      fecha: m.created_at
    }));

    // 📊 Respuesta consolidada
    const stats = {
      usuarios: usuariosStats,
      finanzas_hoy: finanzasHoy,
      juego: juegoStats,
      sistema: sistemaStats,
      retiros: retirosStats,
      movimientos_recientes: movimientosRecientes,
      
      // Alertas automáticas
      alertas: [
        ...(retirosStats.requiere_atencion ? [{
          tipo: 'warning',
          mensaje: `${retirosStats.pendientes_count} retiros pendientes por $${MoneyMath.format(retirosStats.pendientes_monto)}`,
          accion: '/admin/withdrawals'
        }] : []),
        ...(juegoStats.sesiones_activas === 0 ? [{
          tipo: 'info',
          mensaje: 'No hay sesiones activas en este momento',
          accion: '/admin/sessions/create'
        }] : [])
      ]
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas del dashboard:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error obteniendo estadísticas del dashboard',
      details: error.message 
    });
  }
}

/**
 * POST /api/admin/broadcast
 * Envía mensaje global a todos los clientes conectados (Socket.IO)
 * 
 * Body:
 * {
 *   "message": "Mantenimiento en 5 minutos",
 *   "type": "warning",  // 'info', 'warning', 'success', 'error'
 *   "priority": "high"  // 'low', 'medium', 'high'
 * }
 */
async function sendGlobalMessage(req, res) {
  try {
    const { message, type = 'info', priority = 'medium' } = req.body;
    
    // Validar mensaje
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'El mensaje no puede estar vacío'
      });
    }

    // Obtener instancia de Socket.IO desde el servidor
    const io = req.app.get('io');
    
    if (!io) {
      return res.status(500).json({
        success: false,
        error: 'Socket.IO no está disponible'
      });
    }

    // 📢 Emitir mensaje a TODOS los clientes conectados
    const notification = {
      text: message,
      type: type,
      priority: priority,
      timestamp: new Date().toISOString(),
      sender: 'SISTEMA'
    };

    io.emit('admin_notification', notification);

    // Registrar en base de datos (opcional)
    await pool.query(`
      INSERT INTO system_notifications (message, type, priority, created_at)
      VALUES (?, ?, ?, NOW())
    `, [message, type, priority]);

    console.log(`📢 Mensaje global enviado: "${message}" [${type}]`);

    res.json({ 
      success: true, 
      message: 'Anuncio enviado a toda la red',
      recipients: io.sockets.sockets.size,
      notification
    });

  } catch (error) {
    console.error('❌ Error enviando mensaje global:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error enviando mensaje global',
      details: error.message 
    });
  }
}

/**
 * GET /api/admin/sessions/stats
 * Estadísticas detalladas de sesiones
 */
async function getSessionStats(req, res) {
  try {
    const { period = 'today' } = req.query; // 'today', 'week', 'month'
    
    let dateFilter = 'DATE(start_time) = CURDATE()';
    if (period === 'week') {
      dateFilter = 'start_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    } else if (period === 'month') {
      dateFilter = 'start_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    }

    const [sessionsResult] = await pool.query(`
      SELECT 
        COUNT(*) as total_sessions,
        SUM(total_cards_sold) as total_cards,
        SUM(current_pot_linea + current_pot_bingo) as total_revenue,
        AVG(TIMESTAMPDIFF(MINUTE, start_time, end_time)) as avg_duration_minutes,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_sessions
      FROM game_sessions
      WHERE ${dateFilter}
    `);

    const stats = sessionsResult[0];

    res.json({
      success: true,
      period,
      data: {
        total_sesiones: stats.total_sessions || 0,
        total_cartones_vendidos: stats.total_cards || 0,
        ingresos_totales: stats.total_revenue || 0,
        duracion_promedio_minutos: Math.round(stats.avg_duration_minutes || 0),
        sesiones_completadas: stats.completed_sessions || 0,
        tasa_completado: stats.total_sessions > 0 
          ? ((stats.completed_sessions / stats.total_sessions) * 100).toFixed(2) + '%'
          : '0%'
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas de sesiones:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error obteniendo estadísticas de sesiones',
      details: error.message 
    });
  }
}

/**
 * GET /api/admin/users/stats
 * Estadísticas detalladas de usuarios
 */
async function getUserStats(req, res) {
  try {
    const [statsResult] = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN balance > 0 THEN 1 ELSE 0 END) as users_with_balance,
        SUM(balance) as total_balance,
        AVG(balance) as avg_balance,
        MAX(balance) as max_balance,
        COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as new_users_today,
        COUNT(CASE WHEN DATE(last_login) = CURDATE() THEN 1 END) as active_users_today
      FROM users
    `);

    const stats = statsResult[0];

    // Top 10 usuarios por balance
    const [topUsersResult] = await pool.query(`
      SELECT 
        id,
        username,
        balance,
        role,
        created_at
      FROM users
      ORDER BY balance DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        total_usuarios: stats.total_users || 0,
        usuarios_con_saldo: stats.users_with_balance || 0,
        balance_total_sistema: stats.total_balance || 0,
        balance_promedio: stats.avg_balance || 0,
        balance_maximo: stats.max_balance || 0,
        nuevos_hoy: stats.new_users_today || 0,
        activos_hoy: stats.active_users_today || 0,
        top_usuarios: topUsersResult
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas de usuarios:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error obteniendo estadísticas de usuarios',
      details: error.message 
    });
  }
}

/**
 * GET /api/admin/revenue/breakdown
 * Desglose detallado de ingresos y distribución
 */
async function getRevenueBreakdown(req, res) {
  try {
    const { date = new Date().toISOString().split('T')[0] } = req.query;

    // Obtener todos los movimientos del día
    const [movementsResult] = await pool.query(`
      SELECT 
        movement_type,
        SUM(amount) as total_amount,
        COUNT(*) as transaction_count
      FROM chips_movements
      WHERE DATE(created_at) = ?
      GROUP BY movement_type
    `, [date]);

    // Calcular distribución
    const movements = {};
    movementsResult.forEach(row => {
      movements[row.movement_type] = {
        total: row.total_amount,
        count: row.transaction_count
      };
    });

    const deposits = MoneyMath.decimal(movements.deposit?.total || 0);
    const withdrawals = MoneyMath.decimal(movements.withdrawal?.total || 0);
    const wins = MoneyMath.decimal(movements.win?.total || 0);
    const bets = MoneyMath.decimal(movements.bet?.total || 0);

    const netRevenue = MoneyMath.subtract(
      MoneyMath.toNumber(deposits),
      MoneyMath.toNumber(withdrawals)
    );

    res.json({
      success: true,
      date,
      data: {
        ingresos: {
          depositos: MoneyMath.toNumber(deposits),
          transacciones: movements.deposit?.count || 0
        },
        egresos: {
          retiros: MoneyMath.toNumber(withdrawals),
          premios: MoneyMath.toNumber(wins),
          transacciones: (movements.withdrawal?.count || 0) + (movements.win?.count || 0)
        },
        balance_neto: netRevenue,
        
        // Distribución según reglas (10% casa, 5% admin, 15% cajeros, 70% pozos)
        distribucion: {
          casa_10: MoneyMath.percentage(netRevenue, 10),
          admins_5: MoneyMath.percentage(netRevenue, 5),
          cajeros_15: MoneyMath.percentage(netRevenue, 15),
          pozos_70: MoneyMath.percentage(netRevenue, 70)
        },
        
        movimientos_detalle: movements
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo desglose de ingresos:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error obteniendo desglose de ingresos',
      details: error.message 
    });
  }
}

module.exports = {
  getDashboardStats,
  sendGlobalMessage,
  getSessionStats,
  getUserStats,
  getRevenueBreakdown
};
