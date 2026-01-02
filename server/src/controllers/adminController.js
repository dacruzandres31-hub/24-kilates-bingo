const dbHelper = require('../helpers/dbHelper');
const responseHelper = require('../helpers/responseHelper');
const validationHelper = require('../helpers/validationHelper');
const MoneyMath = require('../utils/moneyMath');
const bcrypt = require('bcryptjs');
const cardInventoryService = require('../services/cardInventoryService');
const auditService = require('../services/auditService');
const metricsService = require('../services/metricsService');

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
 * GET /api/admin/profile
 * Obtiene información del usuario administrador actual
 */
async function getAdminProfile(req, res) {
  try {
    const { userId, role } = req.user;
    console.log(`🔎 [getAdminProfile] Buscando perfil para ID: ${userId}, Role: ${role}`);

    let users;
    // SuperAdmin (o Andy) ve cartones normales y regalo separados
    if (role === 'superadmin' || req.user.username?.toLowerCase() === 'andy') {
      users = await dbHelper.query(
        `SELECT u.id, u.username, u.role, u.balance,
          COALESCE(SUM(CASE WHEN uci.room = 'bronce' AND uci.is_gift = FALSE THEN uci.quantity ELSE 0 END), 0) as cards_bronce,
          COALESCE(SUM(CASE WHEN uci.room = 'plata' AND uci.is_gift = FALSE THEN uci.quantity ELSE 0 END), 0) as cards_plata,
          COALESCE(SUM(CASE WHEN uci.room = 'oro' AND uci.is_gift = FALSE THEN uci.quantity ELSE 0 END), 0) as cards_oro,
          COALESCE(SUM(CASE WHEN uci.room = 'bronce' AND uci.is_gift = TRUE THEN uci.quantity ELSE 0 END), 0) as gift_bronce,
          COALESCE(SUM(CASE WHEN uci.room = 'plata' AND uci.is_gift = TRUE THEN uci.quantity ELSE 0 END), 0) as gift_plata,
          COALESCE(SUM(CASE WHEN uci.room = 'oro' AND uci.is_gift = TRUE THEN uci.quantity ELSE 0 END), 0) as gift_oro
         FROM users u
         LEFT JOIN user_card_inventory uci ON u.id = uci.user_id
         WHERE u.id = ?
         GROUP BY u.id`,
        [userId], 'GetAdminProfileSuper'
      );
    } else {
      // Agentes y jugadores ven solo el total (normales + regalo sumados)
      users = await dbHelper.query(
        `SELECT u.id, u.username, u.role, u.balance,
            COALESCE(SUM(CASE WHEN uci.room = 'bronce' THEN uci.quantity ELSE 0 END), 0) as cards_bronce,
            COALESCE(SUM(CASE WHEN uci.room = 'plata' THEN uci.quantity ELSE 0 END), 0) as cards_plata,
            COALESCE(SUM(CASE WHEN uci.room = 'oro' THEN uci.quantity ELSE 0 END), 0) as cards_oro
           FROM users u
           LEFT JOIN user_card_inventory uci ON u.id = uci.user_id
           WHERE u.id = ?
           GROUP BY u.id`,
        [userId], 'GetAdminProfileStandard'
      );
    }

    if (!users || users.length === 0) {
      console.log(`❌ [getAdminProfile] Usuario ID ${userId} no encontrado en la base de datos`);
      return responseHelper.notFound(res, 'Usuario no encontrado');
    }

    console.log(`✅ [getAdminProfile] Perfil encontrado para ${users[0].username}`);
    return responseHelper.success(res, users[0]);

  } catch (error) {
    return responseHelper.error(res, 500, 'Error obteniendo perfil', error.message);
  }
}

/**
 * GET /api/admin/financial-summary
 * Retorna resumen financiero para el dashboard
 */
async function getFinancialSummary(req, res) {
  try {
    const todayStats = await dbHelper.queryOne(`
      SELECT 
        COALESCE(SUM(CASE WHEN movement_type = 'purchase' THEN amount ELSE 0 END), 0) as sales,
        COALESCE(SUM(CASE WHEN movement_type = 'prize' THEN amount ELSE 0 END), 0) as prizesDistributed,
        COUNT(DISTINCT user_id) as activeUsers
      FROM chips_movements 
      WHERE DATE(created_at) = CURDATE()
    `, [], 'GetFinancialSummary');

    const stats = todayStats || {};
    const netBalance = (stats.sales || 0) - (stats.prizesDistributed || 0);

    return responseHelper.success(res, {
      today: {
        sales: parseFloat(stats.sales || 0),
        prizes: parseFloat(stats.prizesDistributed || 0),
        net: netBalance,
        activeUsers: parseInt(stats.activeUsers || 0)
      }
    });
  } catch (error) {
    return responseHelper.error(res, 500, 'Error obteniendo resumen financiero', error.message);
  }
}

/**
 * GET /api/admin/finances/ggr
 * Reporte de Rentabilidad Real (GGR)
 * Entradas (Dinero Real) vs Salidas (Retiros Pagados)
 */
async function getGGRStats(req, res) {
  try {
    const { startDate, endDate } = req.query;

    // Filtros de fecha base
    let dateFilter = '';
    const params = [];

    if (startDate && endDate) {
      dateFilter = 'AND DATE(created_at) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    } else {
      // Default: Mes actual
      dateFilter = 'AND MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE())';
    }

    // 1. DINERO ENTRADO (Ventas de Cartones + Cargas Manuales)
    // Ventas de cartones (Solo pagados, no regalo)
    const salesResult = await dbHelper.queryOne(`
      SELECT COALESCE(SUM(price), 0) as total
      FROM daily_stock_cards
      WHERE status = 'sold' 
      AND price > 0
      ${dateFilter.replace('created_at', 'play_date')} 
    `, params, 'GGR_Sales');

    // Cargas Manuales de Saldo (Admin Credits)
    const manualLoadsResult = await dbHelper.queryOne(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM chips_movements
      WHERE movement_type = 'admin_adjustment'
      AND amount > 0
      ${dateFilter}
    `, params, 'GGR_Loads');

    const totalIn = parseFloat(salesResult.total) + parseFloat(manualLoadsResult.total);

    // 2. DINERO SALIDO (Retiros Pagados)
    // Nota: params se duplican porque la query es nueva, hay que pasar params de nuevo
    const withdrawalsResult = await dbHelper.queryOne(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM withdrawal_requests
      WHERE status IN ('completed', 'approved')
      ${dateFilter.replace('created_at', 'requested_at')} 
    `, params, 'GGR_Withdrawals');

    const totalOut = parseFloat(withdrawalsResult.total);

    // 3. PASIVO (Liability) - Dinero de jugadores aun no retirado
    const liabilityResult = await dbHelper.queryOne(`
      SELECT COALESCE(SUM(balance), 0) as total FROM users WHERE role = 'jugador'
    `, [], 'GGR_Liability');
    const currentLiability = parseFloat(liabilityResult.total);

    // 4. GGR CÁLCULO
    const ggr = totalIn - totalOut;
    const margin = totalIn > 0 ? ((ggr / totalIn) * 100).toFixed(2) : 0;

    return responseHelper.success(res, {
      data: {
        period: { startDate, endDate },
        metrics: {
          totalIn,
          totalOut,
          ggr,
          margin: parseFloat(margin),
          currentLiability
        },
        breakdown: {
          sales: parseFloat(salesResult.total),
          manualLoads: parseFloat(manualLoadsResult.total),
          withdrawals: totalOut
        }
      }
    });

  } catch (error) {
    return responseHelper.error(res, 500, 'Error calculando rentabilidad', error.message);
  }
}

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
      dbHelper.query(`
        SELECT role, COUNT(*) as count 
        FROM users 
        GROUP BY role
      `, [], 'Dash_Users'),

      // 2. Calcular ventas del día
      dbHelper.query(`
        SELECT 
          SUM(CASE WHEN movement_type = 'deposit' THEN amount ELSE 0 END) as total_deposits,
          SUM(CASE WHEN movement_type = 'withdrawal' THEN amount ELSE 0 END) as total_withdrawals,
          SUM(CASE WHEN movement_type = 'bet' THEN amount ELSE 0 END) as total_bets,
          SUM(CASE WHEN movement_type = 'win' THEN amount ELSE 0 END) as total_wins,
          COUNT(DISTINCT user_id) as active_users_today
        FROM chips_movements 
        WHERE DATE(created_at) = CURDATE()
      `, [], 'Dash_Sales'),

      // 3. Estado de sesiones de juego
      dbHelper.query(`
        SELECT 
          id,
          room,
          status,
          current_pot_linea,
          current_pot_bingo,
          accumulated_pot,
          total_cards_validated,
          start_time,
          end_time
        FROM game_sessions 
        WHERE status IN ('pending', 'active', 'completed')
        ORDER BY start_time DESC 
        LIMIT 10
      `, [], 'Dash_Sessions'),

      // 4. Balance total del sistema
      dbHelper.query(`
        SELECT 
          SUM(balance) as total_balance,
          COUNT(*) as users_with_balance
        FROM users 
        WHERE balance > 0
      `, [], 'Dash_Balances'),

      // 5. Retiros pendientes
      dbHelper.query(`
        SELECT 
          COUNT(*) as pending_count,
          SUM(amount) as pending_amount
        FROM withdrawal_requests 
        WHERE status = 'pending'
      `, [], 'Dash_Withdrawals'),

      // 6. Movimientos recientes
      dbHelper.query(`
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
      `, [], 'Dash_Movements')
    ]);

    // Procesar datos de usuarios
    const usuariosStats = {
      total: usersResult.reduce((sum, r) => sum + parseInt(r.count), 0),
      jugadores: usersResult.find(r => r.role === 'player')?.count || 0,
      cajeros: usersResult.find(r => r.role === 'cajero')?.count || 0,
      admins: usersResult.find(r => r.role === 'admin')?.count || 0,
      superadmins: usersResult.find(r => r.role === 'superadmin')?.count || 0
    };

    // 💰 Procesar datos financieros
    const salesData = salesResult[0] || {};

    const totalDeposits = MoneyMath.decimal(salesData.total_deposits || 0);
    const totalWithdrawals = MoneyMath.decimal(salesData.total_withdrawals || 0);
    const totalBets = MoneyMath.decimal(salesData.total_bets || 0);
    const totalWins = MoneyMath.decimal(salesData.total_wins || 0);

    const ventasNetas = MoneyMath.subtract(
      MoneyMath.toNumber(totalDeposits),
      MoneyMath.toNumber(totalWithdrawals)
    );

    const finanzasHoy = {
      ventas_brutas: MoneyMath.toNumber(totalDeposits),
      ventas_netas: ventasNetas,
      total_retiros: MoneyMath.toNumber(totalWithdrawals),
      total_apuestas: MoneyMath.toNumber(totalBets),
      total_premios: MoneyMath.toNumber(totalWins),

      // 💵 Distribución
      ganancia_casa_10: MoneyMath.percentage(ventasNetas, 10),
      comisiones_admin_5: MoneyMath.percentage(ventasNetas, 5),
      comisiones_cajero_15: MoneyMath.percentage(ventasNetas, 15),
      para_pozos_70: MoneyMath.percentage(ventasNetas, 70),

      usuarios_activos_hoy: salesData.active_users_today || 0
    };

    // Procesar sesiones de juego
    const sesionesActivas = sessionsResult.filter(s => s.status === 'active');
    const sesionesPendientes = sessionsResult.filter(s => s.status === 'pending');

    let totalPozosLinea = MoneyMath.decimal(0);
    let totalPozosBingo = MoneyMath.decimal(0);
    let totalPozosAcumulativos = MoneyMath.decimal(0);

    for (const session of sessionsResult) {
      totalPozosLinea = totalPozosLinea.plus(session.current_pot_linea || 0);
      totalPozosBingo = totalPozosBingo.plus(session.current_pot_bingo || 0);
      totalPozosAcumulativos = totalPozosAcumulativos.plus(session.accumulated_pot || 0);
    }

    const juegoStats = {
      sesiones_activas: sesionesActivas.length,
      sesiones_pendientes: sesionesPendientes.length,
      sesiones_completadas_hoy: sessionsResult.filter(s =>
        s.status === 'completed' &&
        new Date(s.end_time).toDateString() === new Date().toDateString()
      ).length,

      pozos: {
        total_linea: MoneyMath.toNumber(totalPozosLinea),
        total_bingo: MoneyMath.toNumber(totalPozosBingo),
        total_acumulativo: MoneyMath.toNumber(totalPozosAcumulativos),
        suma_total: MoneyMath.toNumber(
          totalPozosLinea.plus(totalPozosBingo).plus(totalPozosAcumulativos)
        )
      },

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
    const balanceData = balancesResult[0] || {};
    const sistemaStats = {
      balance_total_usuarios: balanceData.total_balance || 0,
      usuarios_con_saldo: balanceData.users_with_balance || 0,
      estado_servidor: 'ONLINE 🟢',
      timestamp: new Date().toISOString()
    };

    // Procesar retiros pendientes
    const withdrawalData = withdrawalsResult[0] || {};
    const retirosStats = {
      pendientes_count: withdrawalData.pending_count || 0,
      pendientes_monto: withdrawalData.pending_amount || 0,
      requiere_atencion: (withdrawalData.pending_count || 0) > 0
    };

    // Procesar movimientos recientes
    const movimientosRecientes = recentMovementsResult.map(m => ({
      id: m.id,
      usuario: m.username,
      tipo: m.movement_type,
      monto: m.amount,
      balance_resultante: m.balance_after,
      razon: m.reason,
      fecha: m.created_at
    }));

    return responseHelper.success(res, {
      data: {
        usuarios: usuariosStats,
        finanzas_hoy: finanzasHoy,
        juego: juegoStats,
        sistema: sistemaStats,
        retiros: retirosStats,
        movimientos_recientes: movimientosRecientes,
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
      }
    });

  } catch (error) {
    return responseHelper.error(res, 500, 'Error obteniendo estadísticas del dashboard', error.message);
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

    if (!message || message.trim().length === 0) {
      return responseHelper.error(res, 400, 'El mensaje no puede estar vacío');
    }

    const io = req.app.get('io');
    if (!io) return responseHelper.error(res, 500, 'Socket.IO no está disponible');

    const notification = {
      text: message,
      type: type,
      priority: priority,
      timestamp: new Date().toISOString(),
      sender: 'SISTEMA'
    };

    io.emit('admin_notification', notification);

    await dbHelper.query(`
      INSERT INTO system_notifications (message, type, priority, created_at)
      VALUES (?, ?, ?, NOW())
    `, [message, type, priority], 'AdminBroadcastLog');

    console.log(`📢 Mensaje global enviado: "${message}" [${type}]`);

    return responseHelper.success(res, {
      message: 'Anuncio enviado a toda la red',
      recipients: io.sockets.sockets.size,
      notification
    });

  } catch (error) {
    return responseHelper.error(res, 500, 'Error enviando mensaje global', error.message);
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

    const stats = await dbHelper.queryOne(`
      SELECT 
        COUNT(*) as total_sessions,
        SUM(total_cards_validated) as total_cards,
        SUM(current_pot_linea + current_pot_bingo) as total_revenue,
        AVG(TIMESTAMPDIFF(MINUTE, start_time, end_time)) as avg_duration_minutes,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_sessions
      FROM game_sessions
      WHERE ${dateFilter}
    `, [], 'SessionStats') || {};

    return responseHelper.success(res, {
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
    return responseHelper.error(res, 500, 'Error obteniendo estadísticas de sesiones', error.message);
  }
}

/**
 * GET /api/admin/users/stats
 * Estadísticas detalladas de usuarios
 */
async function getUserStats(req, res) {
  try {
    const stats = await dbHelper.queryOne(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN balance > 0 THEN 1 ELSE 0 END) as users_with_balance,
        SUM(balance) as total_balance,
        AVG(balance) as avg_balance,
        MAX(balance) as max_balance,
        COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as new_users_today,
        COUNT(CASE WHEN DATE(last_login) = CURDATE() THEN 1 END) as active_users_today
      FROM users
    `, [], 'UserStats') || {};

    // Top 10 usuarios por balance
    const topUsersResult = await dbHelper.query(`
      SELECT 
        id,
        username,
        balance,
        role,
        created_at
      FROM users
      ORDER BY balance DESC
      LIMIT 10
    `, [], 'TopUsers');

    return responseHelper.success(res, {
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
    return responseHelper.error(res, 500, 'Error obteniendo estadísticas de usuarios', error.message);
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
    const movementsResult = await dbHelper.query(`
      SELECT 
        movement_type,
        SUM(amount) as total_amount,
        COUNT(*) as transaction_count
      FROM chips_movements
      WHERE DATE(created_at) = ?
      GROUP BY movement_type
    `, [date], 'RevenueBreakdown');

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

    return responseHelper.success(res, {
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
    return responseHelper.error(res, 500, 'Error obteniendo desglose de ingresos', error.message);
  }
}

/**
 * GET /api/admin/stock-summary
 * Retorna el stock disponible de cartones por sala
 */
async function getStockSummary(req, res) {
  try {
    const today = new Date().toISOString().split('T')[0];

    const stockResults = await dbHelper.query(`
      SELECT 
        room,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as disponibles,
        SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as vendidos
      FROM daily_stock_cards
      WHERE play_date = ?
      GROUP BY room
    `, [today], 'StockSummary');

    const stockByRoom = { bronce: 0, plata: 0, oro: 0 };

    stockResults.forEach(row => {
      const room = row.room.toLowerCase();
      if (stockByRoom.hasOwnProperty(room)) {
        stockByRoom[room] = row.disponibles || 0;
      }
    });

    return responseHelper.success(res, {
      ...stockByRoom,
      fecha: today
    });

  } catch (error) {
    return responseHelper.error(res, 500, 'Error obteniendo stock de cartones', error.message);
  }
}

/**
 * GET /api/admin/users/hierarchy
 * Obtiene la jerarquía completa de usuarios en formato árbol
 * Excluye al usuario actual del listado (solo muestra su red descendente)
 */
async function getUsersHierarchy(req, res) {
  try {
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    let allUsers;
    let currentUserData;

    // SuperAdmin (o Andy) ve TODOS los usuarios con cartones normales y regalo separados
    if (currentUserRole === 'superadmin' || req.user.username?.toLowerCase() === 'andy') {
      allUsers = await dbHelper.query(`
        SELECT u.id, u.username, u.role, u.parent_id, u.balance, u.created_at,
               u.nombre_completo, u.documento, u.email, u.telefono,
               u.is_blocked, u.block_reason, u.blocked_at, u.blocked_by, u.subscription_tier_id,
               COALESCE(SUM(CASE WHEN uci.room = 'bronce' AND uci.is_gift = FALSE THEN uci.quantity ELSE 0 END), 0) as cards_bronce,
               COALESCE(SUM(CASE WHEN uci.room = 'plata' AND uci.is_gift = FALSE THEN uci.quantity ELSE 0 END), 0) as cards_plata,
               COALESCE(SUM(CASE WHEN uci.room = 'oro' AND uci.is_gift = FALSE THEN uci.quantity ELSE 0 END), 0) as cards_oro,
               COALESCE(SUM(CASE WHEN uci.room = 'bronce' AND uci.is_gift = TRUE THEN uci.quantity ELSE 0 END), 0) as gift_bronce,
               COALESCE(SUM(CASE WHEN uci.room = 'plata' AND uci.is_gift = TRUE THEN uci.quantity ELSE 0 END), 0) as gift_plata,
               COALESCE(SUM(CASE WHEN uci.room = 'oro' AND uci.is_gift = TRUE THEN uci.quantity ELSE 0 END), 0) as gift_oro
        FROM users u
        LEFT JOIN user_card_inventory uci ON u.id = uci.user_id
        GROUP BY u.id
        ORDER BY u.id
      `, [], 'GetUsersHierarchy_Super');

      // Obtener datos del usuario actual
      currentUserData = allUsers.find(u => u.id === currentUserId);
    }
    // Agentes solo ven su RED (hijos directos y todos los descendientes)
    else if (currentUserRole === 'agente') {
      // Primero obtener datos del agente actual
      const currentUserRow = await dbHelper.queryOne(`
        SELECT u.id, u.username, u.role, u.parent_id, u.balance, u.created_at,
               u.nombre_completo, u.documento, u.email, u.telefono,
               u.is_blocked, u.block_reason, u.blocked_at, u.blocked_by, u.subscription_tier_id,
               COALESCE(SUM(CASE WHEN uci.room = 'bronce' AND uci.is_gift = FALSE THEN uci.quantity ELSE 0 END), 0) as cards_bronce,
               COALESCE(SUM(CASE WHEN uci.room = 'plata' AND uci.is_gift = FALSE THEN uci.quantity ELSE 0 END), 0) as cards_plata,
               COALESCE(SUM(CASE WHEN uci.room = 'oro' AND uci.is_gift = FALSE THEN uci.quantity ELSE 0 END), 0) as cards_oro,
               COALESCE(SUM(CASE WHEN uci.room = 'bronce' AND uci.is_gift = TRUE THEN uci.quantity ELSE 0 END), 0) as gift_bronce,
               COALESCE(SUM(CASE WHEN uci.room = 'plata' AND uci.is_gift = TRUE THEN uci.quantity ELSE 0 END), 0) as gift_plata,
               COALESCE(SUM(CASE WHEN uci.room = 'oro' AND uci.is_gift = TRUE THEN uci.quantity ELSE 0 END), 0) as gift_oro
        FROM users u
        LEFT JOIN user_card_inventory uci ON u.id = uci.user_id
        WHERE u.id = ?
        GROUP BY u.id
      `, [currentUserId], 'GetUsersHierarchy_AgentSelf');

      currentUserData = currentUserRow;

      // Obtener red descendente (CTE recursivo)
      const networkUsers = await dbHelper.query(`
        WITH RECURSIVE network AS (
          SELECT id, username, role, parent_id, balance, created_at, nombre_completo, documento, email, telefono, is_blocked, block_reason, blocked_at, blocked_by, subscription_tier_id 
          FROM users WHERE parent_id = ?
          
          UNION ALL
          
          SELECT u.id, u.username, u.role, u.parent_id, u.balance, u.created_at, u.nombre_completo, u.documento, u.email, u.telefono, u.is_blocked, u.block_reason, u.blocked_at, u.blocked_by, u.subscription_tier_id
          FROM users u
          INNER JOIN network n ON u.parent_id = n.id
        )
        SELECT n.*,
          COALESCE(SUM(CASE WHEN uci.room = 'bronce' AND uci.is_gift = FALSE THEN uci.quantity ELSE 0 END), 0) as cards_bronce,
          COALESCE(SUM(CASE WHEN uci.room = 'plata' AND uci.is_gift = FALSE THEN uci.quantity ELSE 0 END), 0) as cards_plata,
          COALESCE(SUM(CASE WHEN uci.room = 'oro' AND uci.is_gift = FALSE THEN uci.quantity ELSE 0 END), 0) as cards_oro,
          COALESCE(SUM(CASE WHEN uci.room = 'bronce' AND uci.is_gift = TRUE THEN uci.quantity ELSE 0 END), 0) as gift_bronce,
          COALESCE(SUM(CASE WHEN uci.room = 'plata' AND uci.is_gift = TRUE THEN uci.quantity ELSE 0 END), 0) as gift_plata,
          COALESCE(SUM(CASE WHEN uci.room = 'oro' AND uci.is_gift = TRUE THEN uci.quantity ELSE 0 END), 0) as gift_oro
        FROM network n
        LEFT JOIN user_card_inventory uci ON n.id = uci.user_id
        GROUP BY n.id, n.username, n.role, n.parent_id, n.balance, n.created_at, n.nombre_completo, n.documento, n.email, n.telefono, n.is_blocked, n.block_reason, n.blocked_at, n.blocked_by, n.subscription_tier_id
        ORDER BY n.id
      `, [currentUserId], 'GetUsersHierarchy_AgentNetwork');

      allUsers = [currentUserData, ...networkUsers];
    }
    else {
      return responseHelper.error(res, 403, 'No tienes permisos para ver usuarios');
    }

    // Construir árbol jerárquico (JS-only, safe)
    const buildTree = (parentId = null) => {
      return allUsers
        .filter(u => u.parent_id === parentId)
        .map(user => ({
          ...user,
          children: buildTree(user.id)
        }));
    };

    const tree = [{
      ...currentUserData,
      children: buildTree(currentUserId)
    }];

    return responseHelper.success(res, {
      tree,
      all: allUsers,
      currentUser: {
        id: currentUserId,
        role: currentUserRole,
        username: currentUserData?.username
      }
    });

  } catch (error) {
    return responseHelper.error(res, 500, 'Error obteniendo jerarquía de usuarios', error.message);
  }
}

/**
 * POST /api/admin/users/create
 * Crea un nuevo usuario (jugador o agente)
 * 
 * Jerarquía:
 * - SuperAdmin: Puede crear agentes sin parent (raíz) o especificar parent_id
 * - Agente: Crea usuarios bajo su propia red (parent_id = req.user.id automático)
 */
async function createUser(req, res) {
  try {
    const {
      username, password, role, parent_id,
      nombre_completo, documento, email, telefono,
      cbu, alias, bank_name
    } = req.body;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    // Validaciones basicas
    if (!username || !password || !role) {
      return responseHelper.error(res, 400, 'Faltan campos requeridos: username, password, role');
    }

    const validRoles = ['superadmin', 'admin', 'agente', 'jugador'];
    if (!validRoles.includes(role)) {
      return responseHelper.error(res, 400, 'Rol inválido. Debe ser: superadmin, admin, agente o jugador');
    }

    // Determinar parent_id
    let finalParentId;
    if (currentUserRole === 'superadmin') {
      finalParentId = parent_id || null;
    } else if (currentUserRole === 'admin') {
      finalParentId = currentUserId;
      // Admin no puede crear SuperAdmin ni otros Admin
      if (role === 'superadmin' || role === 'admin') {
        return responseHelper.error(res, 403, `No tienes permisos para crear el rol "${role}"`);
      }
    } else if (currentUserRole === 'agente') {
      finalParentId = currentUserId;
      // Agente no puede crear SuperAdmin ni Admin
      if (role === 'superadmin' || role === 'admin') {
        return responseHelper.error(res, 403, `No tienes permisos para crear el rol "${role}"`);
      }
    } else {
      return responseHelper.error(res, 403, 'No tienes permisos para crear usuarios');
    }

    // Verificar existencia
    const existingUser = await dbHelper.queryOne('SELECT id, username FROM users WHERE username = ?', [username], 'CheckUserExists');
    if (existingUser) {
      return responseHelper.error(res, 409, `El usuario "${username}" ya existe. Por favor elige otro nombre.`);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Transacción para crear usuario y metadatos
    const result = await dbHelper.transaction(async (connection) => {
      const [insertResult] = await connection.query(
        `INSERT INTO users (username, password_hash, role, parent_id, balance)
         VALUES (?, ?, ?, ?, ?)`,
        [username, hashedPassword, role, finalParentId, 0]
      );

      const newUserId = insertResult.insertId;

      // Campos opcionales
      const updates = [];
      const values = [];

      if (nombre_completo) { updates.push('nombre_completo = ?'); values.push(nombre_completo); }
      if (documento) { updates.push('documento = ?'); values.push(documento); }
      if (email) { updates.push('email = ?'); values.push(email); }
      if (telefono) { updates.push('telefono = ?'); values.push(telefono); }
      if (cbu) { updates.push('cbu = ?'); values.push(cbu); }
      if (alias) { updates.push('alias = ?'); values.push(alias); }
      if (bank_name) { updates.push('bank_name = ?'); values.push(bank_name); }

      if (updates.length > 0) {
        values.push(newUserId);
        await connection.query(
          `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
          values
        );
      }

      return newUserId;
    });

    return responseHelper.success(res, {
      userId: result,
      message: `${role.toUpperCase()} "${username}" creado exitosamente bajo ${currentUserRole === 'agente' ? 'tu red' : 'la jerarquía especificada'}`,
      parent_id: finalParentId
    });

  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return responseHelper.error(res, 409, 'El nombre de usuario ya existe');
    }
    return responseHelper.error(res, 500, 'Error creando usuario', error.message);
  }
}

/**
 * Helper: Verificar si un usuario pertenece a la red de un agente
 * Usa CTE recursivo para verificar toda la jerarquía descendente
 */
async function canModifyUser(currentUserId, currentUserRole, targetUserId) {
  // SuperAdmin puede modificar a todos
  if (currentUserRole === 'superadmin') return true;

  // Agentes pueden modificarse a sí mismos
  if (currentUserRole === 'agente' && parseInt(currentUserId) === parseInt(targetUserId)) return true;

  // Agentes pueden modificar TODOS sus descendientes (sin límite de profundidad)
  if (currentUserRole === 'agente') {
    const result = await dbHelper.queryOne(`
      WITH RECURSIVE network AS (
        -- Caso base
        SELECT id FROM users WHERE id = ? OR parent_id = ?
        UNION ALL
        -- Recursion
        SELECT u.id FROM users u
        INNER JOIN network n ON u.parent_id = n.id
      )
      SELECT COUNT(*) as count FROM network WHERE id = ?
    `, [currentUserId, currentUserId, targetUserId], 'CanModifyUserCheck');

    return result.count > 0;
  }

  return false;
}

/**
 * POST /api/admin/users/add-cards
 * Agrega o quita cartones a un usuario
 * Validación jerárquica: Agentes solo pueden modificar su red
 */
async function addCardsToUser(req, res) {
  try {
    const { userId, room, quantity } = req.body;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    if (!userId || !room || quantity === undefined) {
      return responseHelper.error(res, 400, 'Faltan campos requeridos');
    }

    const hasPermission = await canModifyUser(currentUserId, currentUserRole, userId);
    if (!hasPermission) return responseHelper.error(res, 403, 'No tienes permisos para modificar a este usuario');

    const validRooms = ['bronce', 'plata', 'oro'];
    if (!validRooms.includes(room)) return responseHelper.error(res, 400, 'Sala inválida');

    // Agregar o quitar cartones
    if (quantity > 0) {
      // Verificar rol del destinatario
      const recipientData = await dbHelper.queryOne('SELECT role FROM users WHERE id = ?', [userId], 'GetRole');
      const recipientRole = recipientData?.role;

      if (recipientRole === 'agente') {
        // --- CASO AGENTE: CARGA 100% + BONO EXTRA 10% ---
        await cardInventoryService.transferCards(currentUserId, userId, room, quantity, currentUserId);

        // ACREDITACIÓN AUTOMÁTICA DE BONO (10%)
        try {
          const roomSettings = await dbHelper.queryOne('SELECT agent_bonus_percentage FROM room_settings WHERE room = ?', [room], 'GetBonusPct');
          const bonusPct = roomSettings ? parseFloat(roomSettings.agent_bonus_percentage) : 10.0;
          const bonusQty = Math.floor(quantity * (bonusPct / 100));

          if (bonusQty > 0) {
            await dbHelper.transaction(async (connection) => {
              await connection.query(
                `INSERT INTO user_card_inventory (user_id, room, quantity, is_gift) VALUES (?, ?, ?, TRUE)
                 ON DUPLICATE KEY UPDATE quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP`,
                [userId, room, bonusQty, bonusQty]
              );
              await connection.query(
                `INSERT INTO card_movements_log (user_id, from_user_id, to_user_id, room, quantity, movement_type, is_gift, reason, executed_by)
                 VALUES (?, ?, ?, ?, ?, 'transfer_bonus', TRUE, 'Bono automático Agente', ?)`,
                [userId, currentUserId, userId, room, bonusQty, currentUserId]
              );
            });
            console.log(`🎁 [Bonus] Acreditando bono extra: ${bonusQty} regalo para agente ${userId}`);
          }
        } catch (err) {
          console.error('❌ Error bono agente:', err);
        }
      } else {
        // --- CASO JUGADOR: SPLIT 90/10 ---
        console.log(`👤 [Transfer] Destinatario es JUGADOR. Aplicando Split 90/10.`);
        const targetPaid = Math.floor(quantity * 0.9);
        const targetGift = quantity - targetPaid;

        await dbHelper.transaction(async (connection) => {
          // 1. Obtener stock disponible
          const [stocks] = await connection.query(
            `SELECT is_gift, SUM(quantity) as total FROM user_card_inventory 
             WHERE user_id = ? AND room = ? GROUP BY is_gift`,
            [currentUserId, room]
          );

          let senderPaid = 0; let senderGift = 0;
          if (stocks && stocks.length) {
            stocks.forEach(s => { if (s.is_gift) senderGift = parseInt(s.total) || 0; else senderPaid = parseInt(s.total) || 0; });
          }

          let tPaid = Math.min(targetPaid, senderPaid);
          let tGift = Math.min(targetGift, senderGift);

          // Si falta stock
          if (tPaid + tGift < quantity) {
            let needed = quantity - (tPaid + tGift);
            if (tPaid < targetPaid) {
              let extra = Math.min(needed, senderGift - tGift);
              tGift += extra; needed -= extra;
            }
            if (needed > 0 && tGift < targetGift) {
              let extra = Math.min(needed, senderPaid - tPaid);
              tPaid += extra; needed -= extra;
            }
            if (tPaid + tGift < quantity) throw new Error(`Stock insuficiente. Solo tienes ${tPaid + tGift} cartones.`);
          }

          // Función interna para transferir
          const executeTransfer = async (conn, from, to, q, isGift) => {
            if (q <= 0) return;
            let rem = q;
            const [recs] = await conn.query(`SELECT id, quantity FROM user_card_inventory WHERE user_id = ? AND room = ? AND is_gift = ? ORDER BY id ASC`, [from, room, isGift]);
            for (const r of recs) {
              if (rem <= 0) break;
              const sub = Math.min(r.quantity, rem);
              await conn.query(`UPDATE user_card_inventory SET quantity = quantity - ? WHERE id = ?`, [sub, r.id]);
              rem -= sub;
            }
            await conn.query(`INSERT INTO user_card_inventory (user_id, room, quantity, is_gift) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + ?`, [to, room, q, isGift, q]);
            await conn.query(`INSERT INTO card_movements_log (user_id, from_user_id, to_user_id, room, quantity, movement_type, is_gift, reason, executed_by)
                             VALUES (?, ?, ?, ?, ?, 'transfer', ?, 'Venta Jugador (Split)', ?)`, [to, from, to, room, q, isGift, from]);
          };

          await executeTransfer(connection, currentUserId, userId, tPaid, false);
          await executeTransfer(connection, currentUserId, userId, tGift, true);
        });

        console.log(`✅ [Split] Transferidos ${tPaid} pagos y ${tGift} regalo a jugador ${userId}`);
      }
    } else if (quantity < 0) {
      // QUITAR cartones
      const quantityToRemove = Math.abs(quantity);

      await dbHelper.transaction(async (connection) => {
        const [inventory] = await connection.query(
          `SELECT COALESCE(SUM(quantity), 0) as total FROM user_card_inventory WHERE user_id = ? AND room = ?`,
          [userId, room]
        );
        const totalAvailable = parseInt(inventory[0]?.total || 0);

        if (totalAvailable < quantityToRemove) {
          throw new Error(`Usuario solo tiene ${totalAvailable} cartones de ${room}, no se pueden quitar ${quantityToRemove}`);
        }

        let remaining = quantityToRemove;

        // Función interna para quitar
        const removeCards = async (isGift) => {
          if (remaining <= 0) return;
          const [cards] = await connection.query(
            `SELECT id, quantity FROM user_card_inventory WHERE user_id = ? AND room = ? AND is_gift = ? ORDER BY id ASC`,
            [userId, room, isGift]
          );
          for (const card of cards) {
            if (remaining <= 0) break;
            const toRemove = Math.min(card.quantity, remaining);
            await connection.query(`UPDATE user_card_inventory SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [toRemove, card.id]);
            remaining -= toRemove;
          }
        };

        await removeCards(0); // Primero normales
        await removeCards(1); // Luego gift

        await connection.query(`DELETE FROM user_card_inventory WHERE quantity = 0`);

        // Devolver al admin
        await connection.query(
          `INSERT INTO user_card_inventory (user_id, room, quantity, is_gift, created_at)
             VALUES (?, ?, ?, FALSE, CURRENT_TIMESTAMP)
             ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
          [currentUserId, room, quantityToRemove, quantityToRemove]
        );

        // Logs
        await connection.query(
          `INSERT INTO card_movements_log (user_id, room, movement_type, quantity, is_gift, reason, executed_by, created_at)
           VALUES (?, ?, 'debit', ?, FALSE, 'Cartones quitados por admin', ?, CURRENT_TIMESTAMP),
                  (?, ?, 'credit', ?, FALSE, 'Cartones recuperados de usuario', ?, CURRENT_TIMESTAMP)`,
          [userId, room, quantityToRemove, currentUserId, currentUserId, room, quantityToRemove, currentUserId]
        );
      });
      console.log(`✅ Cartones quitados: ${quantityToRemove} ${room} de usuario ${userId} → admin ${currentUserId}`);
    }

    // Respuesta y WebSocket logic
    const updatedUser = await dbHelper.queryOne(
      `SELECT u.*, 
        COALESCE(SUM(CASE WHEN uci.room = 'bronce' AND uci.is_gift = FALSE THEN uci.quantity ELSE 0 END), 0) as cards_bronce,
        COALESCE(SUM(CASE WHEN uci.room = 'plata' AND uci.is_gift = FALSE THEN uci.quantity ELSE 0 END), 0) as cards_plata,
        COALESCE(SUM(CASE WHEN uci.room = 'oro' AND uci.is_gift = FALSE THEN uci.quantity ELSE 0 END), 0) as cards_oro,
        COALESCE(SUM(CASE WHEN uci.room = 'bronce' AND uci.is_gift = TRUE THEN uci.quantity ELSE 0 END), 0) as gift_bronce,
        COALESCE(SUM(CASE WHEN uci.room = 'plata' AND uci.is_gift = TRUE THEN uci.quantity ELSE 0 END), 0) as gift_plata,
        COALESCE(SUM(CASE WHEN uci.room = 'oro' AND uci.is_gift = TRUE THEN uci.quantity ELSE 0 END), 0) as gift_oro
       FROM users u
       LEFT JOIN user_card_inventory uci ON u.id = uci.user_id
       WHERE u.id = ?
       GROUP BY u.id`,
      [userId], 'GetUserAfterTransfer'
    );

    // Emitir evento WebSocket (Simplificado para el refactor, pero manteniendo lógica)
    const io = req.app.get('io');
    if (io) {
      // Reutilizar lógica existente para emitir eventos
      // ... (La lógica de socket se mantuvo compleja en el original, la resumiré un poco manteniendo funcionalidad)
      // Obtener inventario detallado
      const updatedInventory = await dbHelper.queryOne(`
        SELECT 
          COALESCE(SUM(CASE WHEN room = 'bronce' AND is_gift = FALSE THEN quantity ELSE 0 END), 0) as cards_bronce,
          COALESCE(SUM(CASE WHEN room = 'plata' AND is_gift = FALSE THEN quantity ELSE 0 END), 0) as cards_plata,
          COALESCE(SUM(CASE WHEN room = 'oro' AND is_gift = FALSE THEN quantity ELSE 0 END), 0) as cards_oro,
          COALESCE(SUM(CASE WHEN room = 'bronce' AND is_gift = TRUE THEN quantity ELSE 0 END), 0) as gift_bronce,
          COALESCE(SUM(CASE WHEN room = 'plata' AND is_gift = TRUE THEN quantity ELSE 0 END), 0) as gift_plata,
          COALESCE(SUM(CASE WHEN room = 'oro' AND is_gift = TRUE THEN quantity ELSE 0 END), 0) as gift_oro
        FROM user_card_inventory
        WHERE user_id = ?
      `, [userId], 'GetInvForSocket');

      const inv = updatedInventory || {};
      const cartonesTotal = {
        bronce: (parseInt(inv.cards_bronce) || 0) + (parseInt(inv.gift_bronce) || 0),
        plata: (parseInt(inv.cards_plata) || 0) + (parseInt(inv.gift_plata) || 0),
        oro: (parseInt(inv.cards_oro) || 0) + (parseInt(inv.gift_oro) || 0)
      };

      io.to(`user_${userId}`).emit('resources_updated', {
        userId,
        cartones: cartonesTotal,
        cards_bronce: parseInt(inv.cards_bronce) || 0,
        cards_plata: parseInt(inv.cards_plata) || 0,
        cards_oro: parseInt(inv.cards_oro) || 0,
        gift_bronce: parseInt(inv.gift_bronce) || 0,
        gift_plata: parseInt(inv.gift_plata) || 0,
        gift_oro: parseInt(inv.gift_oro) || 0,
        message: `Tus cartones ${room} han sido ${quantity > 0 ? 'incrementados' : 'reducidos'} en ${Math.abs(quantity)}`
      });

      io.emit('resources_updated', {
        userId,
        cartones: cartonesTotal,
        cards_bronce: parseInt(inv.cards_bronce) || 0,
        cards_plata: parseInt(inv.cards_plata) || 0,
        cards_oro: parseInt(inv.cards_oro) || 0,
        gift_bronce: parseInt(inv.gift_bronce) || 0,
        gift_plata: parseInt(inv.gift_plata) || 0,
        gift_oro: parseInt(inv.gift_oro) || 0
      });

      if (userId !== currentUserId) {
        // Notificar al admin (sender)
        const adminUser = await dbHelper.queryOne(`
           SELECT 
             COALESCE(SUM(CASE WHEN uci.room = 'bronce' THEN uci.quantity ELSE 0 END), 0) as cards_bronce,
             COALESCE(SUM(CASE WHEN uci.room = 'plata' THEN uci.quantity ELSE 0 END), 0) as cards_plata,
             COALESCE(SUM(CASE WHEN uci.room = 'oro' THEN uci.quantity ELSE 0 END), 0) as cards_oro
            FROM users u
            LEFT JOIN user_card_inventory uci ON u.id = uci.user_id
            WHERE u.id = ?
            GROUP BY u.id
        `, [currentUserId], 'GetAdminInvForSocket');

        if (adminUser) {
          io.to(`user_${currentUserId}`).emit('resources_updated', {
            cartones: {
              bronce: parseInt(adminUser.cards_bronce) || 0,
              plata: parseInt(adminUser.cards_plata) || 0,
              oro: parseInt(adminUser.cards_oro) || 0
            },
            message: `Transferencia de cartones ${quantity > 0 ? 'enviada' : 'recibida'}`
          });
        }
      }
    }

    // Audit Log
    auditService.log({
      adminId: currentUserId,
      action: quantity > 0 ? 'ADD_CARDS' : 'REMOVE_CARDS',
      targetUserId: parseInt(userId),
      details: { room, quantity, isGift },
      ipAddress: req.ip
    });

    return responseHelper.success(res, {
      message: `${Math.abs(quantity)} cartón(es) de ${room} ${quantity > 0 ? 'agregado(s)' : 'descargado(s)'} exitosamente`,
      user: updatedUser
    });

  } catch (error) {
    if (error.message.includes('Stock insuficiente') || error.message.includes('Usuario solo tiene')) {
      return responseHelper.error(res, 400, error.message);
    }
    return responseHelper.error(res, 500, 'Error gestionando cartones', error.message);
  }
}

/**
 * POST /api/admin/users/add-balance
 * Agrega o quita saldo a un usuario
 */
async function addBalanceToUser(req, res) {
  try {
    const { userId, amount } = req.body;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    if (!userId || amount === undefined) return responseHelper.error(res, 400, 'Faltan campos requeridos (userId, amount)');

    const hasPermission = await canModifyUser(currentUserId, currentUserRole, userId);
    if (!hasPermission) return responseHelper.error(res, 403, 'No tienes permisos para modificar a este usuario');

    if (isNaN(amount)) return responseHelper.error(res, 400, 'El monto debe ser un número válido');

    const amountDecimal = MoneyMath.decimal(amount);

    const user = await dbHelper.queryOne('SELECT username, balance FROM users WHERE id = ?', [userId], 'GetUserForBalance');
    if (!user) return responseHelper.notFound(res, 'Usuario no encontrado');

    const currentBalance = MoneyMath.decimal(user.balance);
    const username = user.username;
    const newBalance = currentBalance.plus(amountDecimal);

    if (amount < 0) {
      if (currentBalance.lessThanOrEqualTo(0)) return responseHelper.error(res, 400, `El usuario ${username} no tiene saldo disponible para descargar`);
      if (newBalance.lessThan(0)) return responseHelper.error(res, 400, `El usuario solo tiene $${MoneyMath.toNumber(currentBalance).toLocaleString('es-CO')}, no se pueden descargar $${Math.abs(amount).toLocaleString('es-CO')}`);
    }

    await dbHelper.transaction(async (connection) => {
      // Actualizar usuario
      await connection.query('UPDATE users SET balance = ? WHERE id = ?', [MoneyMath.toNumber(newBalance), userId]);

      // Si es descarga y no es auto-descarga, acreditar al admin
      if (amount < 0 && parseInt(userId) !== parseInt(currentUserId)) {
        const adminData = await connection.query('SELECT balance FROM users WHERE id = ?', [currentUserId]);
        if (adminData.length > 0) {
          const adminB = MoneyMath.decimal(adminData[0].balance);
          const newAdminB = adminB.plus(MoneyMath.decimal(Math.abs(amount)));
          await connection.query('UPDATE users SET balance = ? WHERE id = ?', [MoneyMath.toNumber(newAdminB), currentUserId]);
          await connection.query('INSERT INTO chips_movements (user_id, movement_type, amount, balance_after, description, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
            [currentUserId, 'deposit', Math.abs(amount), MoneyMath.toNumber(newAdminB), `Descarga desde usuario ${username}`]);
        }
      }
      // Si es carga y no es auto-carga, debitar al admin
      else if (amount > 0 && parseInt(userId) !== parseInt(currentUserId)) {
        const adminData = await connection.query('SELECT balance FROM users WHERE id = ?', [currentUserId]);
        if (adminData.length > 0) {
          const adminB = MoneyMath.decimal(adminData[0].balance);
          const newAdminB = adminB.minus(amountDecimal);
          await connection.query('UPDATE users SET balance = ? WHERE id = ?', [MoneyMath.toNumber(newAdminB), currentUserId]);
          await connection.query('INSERT INTO chips_movements (user_id, movement_type, amount, balance_after, description, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
            [currentUserId, 'withdrawal', amount, MoneyMath.toNumber(newAdminB), `Carga a usuario ${username}`]);
        }
      }

      const mType = amount > 0 ? 'deposit' : 'withdrawal';
      const desc = amount > 0 ? 'Carga manual desde panel admin' : 'Descarga manual desde panel admin';
      await connection.query('INSERT INTO chips_movements (user_id, movement_type, amount, balance_after, description, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [userId, mType, Math.abs(amount), MoneyMath.toNumber(newBalance), desc]);
    });

    // Socket emission logic remains similar but using helper/safe patterns
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('resources_updated', {
        balance: MoneyMath.toNumber(newBalance),
        message: `Tu balance ha sido ${amount > 0 ? 'incrementado' : 'reducido'} en $${Math.abs(amount).toLocaleString('es-CO')}`
      });

      if (parseInt(userId) !== parseInt(currentUserId)) {
        // Re-fetch admin balance for accuracy
        const admin = await dbHelper.queryOne('SELECT balance FROM users WHERE id = ?', [currentUserId], 'GetAdminBalSocket');
        if (admin) {
          io.to(`user_${currentUserId}`).emit('resources_updated', {
            balance: MoneyMath.toNumber(admin.balance),
            message: `Transferencia ${amount > 0 ? 'enviada' : 'recibida'}`
          });
        }
      }
    }

    // Audit Log
    auditService.log({
      adminId: req.user.id,
      action: 'ADD_BALANCE',
      targetUserId: userId,
      details: { amount: parseFloat(amount), newBalance: MoneyMath.toNumber(newBalance) },
      ipAddress: req.ip
    });

    return responseHelper.success(res, {
      newBalance: MoneyMath.toNumber(newBalance),
      message: `Se han acreditado $${parseFloat(amount).toLocaleString('es-CO')} al usuario ${user.username}`
    });

  } catch (error) {
    return responseHelper.error(res, 500, 'Error gestionando balance', error.message);
  }
}

/**
 * GET /api/admin/cards/inventory
 * Obtiene inventario de cartones del admin actual (vista filtrada - solo totales)
 */
async function getMyCardInventory(req, res) {
  try {
    const inventory = await cardInventoryService.getInventory(req.user.id, false);
    return responseHelper.success(res, {
      user_id: req.user.id,
      username: req.user.username,
      inventory: inventory
    });
  } catch (error) {
    return responseHelper.error(res, 500, 'Error obteniendo inventario de cartones', error.message);
  }
}

/**
 * POST /api/admin/cards/transfer
 * Transfiere cartones a usuarios de su red (cajeros/jugadores)
 */
async function transferCardsToUser(req, res) {
  try {
    const { to_user_id, room, quantity } = req.body;

    if (!to_user_id || !room || !quantity) return responseHelper.error(res, 400, 'Faltan campos requeridos: to_user_id, room, quantity');
    if (!['bronce', 'plata', 'oro'].includes(room)) return responseHelper.error(res, 400, 'Sala inválida');
    if (quantity <= 0) return responseHelper.error(res, 400, 'La cantidad debe ser mayor a 0');

    // Verificar red
    const targetUser = await dbHelper.queryOne(`
       WITH RECURSIVE network AS (
         SELECT id, username, parent_id, 1 as level 
         FROM users WHERE id = ?
         UNION ALL
         SELECT u.id, u.username, u.parent_id, n.level + 1
         FROM users u 
         JOIN network n ON u.parent_id = n.id
       )
       SELECT id, username FROM network WHERE id = ?`,
      [req.user.id, to_user_id], 'CheckTargetInNetwork');

    if (!targetUser) return responseHelper.error(res, 403, 'Solo puede transferir cartones a usuarios de su red');

    const result = await cardInventoryService.transferCards(req.user.id, to_user_id, room, quantity, req.user.id);

    // Bono automático
    try {
      const roomSettings = await dbHelper.queryOne('SELECT agent_bonus_percentage FROM room_settings WHERE room = ?', [room], 'GetBonusForTransfer');
      const bonusPercentage = roomSettings ? parseFloat(roomSettings.agent_bonus_percentage) : 10.00;
      const bonusQuantity = Math.floor(quantity * (bonusPercentage / 100));

      if (bonusQuantity > 0) {
        await dbHelper.transaction(async (connection) => {
          await connection.query(
            `INSERT INTO user_card_inventory (user_id, room, quantity, is_gift) VALUES (?, ?, ?, TRUE)
                 ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
            [to_user_id, room, bonusQuantity, bonusQuantity]
          );
          await connection.query(
            `INSERT INTO card_movements_log (user_id, room, movement_type, quantity, is_gift, reason, executed_by)
                 VALUES (?, ?, 'credit', ?, TRUE, ?, ?)`,
            [to_user_id, room, bonusQuantity, `Bono automático ${bonusPercentage}% por compra de ${quantity} cartones`, req.user.id]
          );
        });
      }
    } catch (err) {
      console.error('❌ Error aplicando bono automático:', err);
    }

    // Socket
    const io = req.app.get('io');
    if (io) {
      const userData = await dbHelper.queryOne('SELECT balance FROM users WHERE id = ?', [to_user_id], 'GetUserBalSocket');
      const inv = await dbHelper.queryOne(`
          SELECT 
            COALESCE(SUM(CASE WHEN room = 'bronce' AND is_gift = FALSE THEN quantity ELSE 0 END), 0) as cards_bronce,
            COALESCE(SUM(CASE WHEN room = 'bronce' AND is_gift = TRUE THEN quantity ELSE 0 END), 0) as gift_bronce
          FROM user_card_inventory WHERE user_id = ?
        `, [to_user_id], 'GetInvSocket');

      io.to(`user_${to_user_id}`).emit('resources_updated', {
        userId: to_user_id,
        balance: parseFloat(userData?.balance || 0),
        cartones: result.targetNewStock,
        cards_bronce: parseInt(inv?.cards_bronce) || 0,
        gift_bronce: parseInt(inv?.gift_bronce) || 0,
        message: `Has recibido ${quantity} cartones de ${room.toUpperCase()} 🎁`
      });
    }

    // Audit Log
    auditService.log({
      adminId: req.user.id,
      action: 'TRANSFER_CARDS',
      targetUserId: to_user_id,
      details: { room, quantity, fromUserId: req.user.id },
      ipAddress: req.ip
    });

    return res.json(result); // cardInventoryService.transferCards already returns a structured object

  } catch (error) {
    return responseHelper.error(res, 500, 'Error transfiriendo cartones', error.message);
  }
}

/**
 * GET /api/admin/cards/movements
 * Obtiene historial de movimientos de cartones del admin actual
 */
async function getMyCardMovements(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const movements = await cardInventoryService.getMovementsLog(req.user.id, limit);

    return responseHelper.success(res, {
      user_id: req.user.id,
      total: movements.length,
      movements: movements
    });
  } catch (error) {
    return responseHelper.error(res, 500, 'Error obteniendo movimientos de cartones', error.message);
  }
}

/**
 * POST /api/admin/change-password
 * Cambia la contraseña del usuario actual
 */
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) return responseHelper.error(res, 400, 'Faltan campos requeridos');
    if (newPassword.length < 6) return responseHelper.error(res, 400, 'La nueva contraseña debe tener al menos 6 caracteres');

    const user = await dbHelper.queryOne('SELECT id, username, password FROM users WHERE id = ?', [userId], 'GetUserForPassChange');
    if (!user) return responseHelper.notFound(res, 'Usuario no encontrado');

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) return responseHelper.error(res, 401, 'La contraseña actual es incorrecta');

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await dbHelper.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

    console.log(`✅ Contraseña cambiada para usuario ${user.username} (ID: ${userId})`);
    // Audit Log
    auditService.log({
      adminId: req.user.id,
      action: 'CHANGE_PASSWORD',
      targetUserId: userId,
      details: { targetUsername: user.username },
      ipAddress: req.ip
    });

    return responseHelper.success(res, 'Contraseña actualizada correctamente');

  } catch (error) {
    return responseHelper.error(res, 500, 'Error al cambiar la contraseña', error.message);
  }
}

/**
 * POST /api/admin/users/change-password
 * Cambia la contraseña de cualquier usuario (sin necesitar contraseña actual)
 * Solo para administradores
 */
async function changeUserPassword(req, res) {
  try {
    const { userId, newPassword } = req.body;
    const adminId = req.user.id;
    const adminRole = req.user.role;

    if (!userId || !newPassword) return responseHelper.error(res, 400, 'userId y newPassword son requeridos');
    if (newPassword.length < 6) return responseHelper.error(res, 400, 'La contraseña debe tener al menos 6 caracteres');

    const targetUser = await dbHelper.queryOne('SELECT id, username, role, parent_id FROM users WHERE id = ?', [userId], 'GetUserForAdminPassChange');
    if (!targetUser) return responseHelper.notFound(res, 'Usuario no encontrado');

    if (adminRole !== 'superadmin') {
      const permission = await dbHelper.queryOne(`
        WITH RECURSIVE network AS (
          SELECT id FROM users WHERE id = ?
          UNION ALL
          SELECT u.id FROM users u
          INNER JOIN network n ON u.parent_id = n.id
        )
        SELECT 1 FROM network WHERE id = ?`,
        [adminId, userId], 'CheckPermissionAdminPassChange');

      if (!permission) return responseHelper.error(res, 403, 'No tienes permisos para modificar este usuario');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await dbHelper.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, userId]);

    console.log(`✅ Admin ${adminId} cambió contraseña del usuario ${userId} (${targetUser.username})`);
    // Audit Log
    auditService.log({
      adminId: req.user.id,
      action: 'CHANGE_USER_PASSWORD',
      targetUserId: userId,
      details: { targetUsername: targetUser.username },
      ipAddress: req.ip
    });
    return responseHelper.success(res, { message: `Contraseña de ${targetUser.username} actualizada correctamente` });

  } catch (error) {
    return responseHelper.error(res, 500, 'Error al cambiar la contraseña', error.message);
  }
}

/**
 * PUT /api/admin/users/:userId/personal-data
 * Actualiza los datos personales de un usuario
 * Solo para administradores
 */
async function updateUserPersonalData(req, res) {
  try {
    const { userId } = req.params;
    const { nombre_completo, documento, email, telefono, cbu, alias, bank_name } = req.body;
    const adminId = req.user.id;
    const adminRole = req.user.role;

    const targetUser = await dbHelper.queryOne('SELECT id, username, role, parent_id FROM users WHERE id = ?', [userId], 'GetUserForUpdate');
    if (!targetUser) return responseHelper.notFound(res, 'Usuario no encontrado');

    if (adminRole !== 'superadmin') {
      const permission = await dbHelper.queryOne(`
        WITH RECURSIVE network AS (
          SELECT id FROM users WHERE id = ?
          UNION ALL
          SELECT u.id FROM users u
          INNER JOIN network n ON u.parent_id = n.id
        )
        SELECT 1 FROM network WHERE id = ?`,
        [adminId, userId], 'CheckPermissionUpdateUser');

      if (!permission) return responseHelper.error(res, 403, 'No tienes permisos para modificar este usuario');
    }

    const updates = [];
    const values = [];
    const updatedFields = {};

    if (nombre_completo !== undefined) { updates.push('nombre_completo = ?'); values.push(nombre_completo || null); updatedFields.nombre_completo = nombre_completo; }
    if (documento !== undefined) { updates.push('documento = ?'); values.push(documento || null); updatedFields.documento = documento; }
    if (email !== undefined) { updates.push('email = ?'); values.push(email || null); updatedFields.email = email; }
    if (telefono !== undefined) { updates.push('telefono = ?'); values.push(telefono || null); updatedFields.telefono = telefono; }
    if (cbu !== undefined) { updates.push('cbu = ?'); values.push(cbu || null); updatedFields.cbu = cbu; }
    if (alias !== undefined) { updates.push('alias = ?'); values.push(alias || null); updatedFields.alias = alias; }
    if (bank_name !== undefined) { updates.push('bank_name = ?'); values.push(bank_name || null); updatedFields.bank_name = bank_name; }

    if (updates.length === 0) return responseHelper.error(res, 400, 'No se proporcionaron campos para actualizar');

    values.push(userId);
    await dbHelper.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    console.log(`✅ Admin ${adminId} actualizó datos personales del usuario ${userId} (${targetUser.username})`);
    // Audit Log
    auditService.log({
      adminId: req.user.id,
      action: 'UPDATE_USER_DATA',
      targetUserId: parseInt(userId),
      details: { targetUsername: targetUser.username, updatedFields },
      ipAddress: req.ip
    });
    return responseHelper.success(res, { message: `Datos de ${targetUser.username} actualizados correctamente` });

  } catch (error) {
    return responseHelper.error(res, 500, 'Error al actualizar los datos', error.message);
  }
}

const bulkTransferCards = async (req, res) => {
  try {
    const { targetUserId, items, applyBonus } = req.body;
    // items: [{ room, quantity, bonusQuantity? }, ...]

    if (!targetUserId || !items || !Array.isArray(items)) return responseHelper.error(res, 400, 'Datos de carga masiva inválidos.');

    const adminId = req.user.id;
    const results = [];

    await dbHelper.transaction(async (connection) => {
      for (const item of items) {
        const { room, quantity } = item;
        if (quantity <= 0) continue;

        const recipientData = await connection.query('SELECT role FROM users WHERE id = ?', [targetUserId]);
        const recipientRole = recipientData[0]?.role;

        if (recipientRole === 'agente') {
          const stock = await connection.query('SELECT quantity FROM user_card_inventory WHERE user_id = ? AND room = ? AND is_gift = FALSE FOR UPDATE', [adminId, room]);
          if (!stock.length || stock[0].quantity < quantity) throw new Error(`Stock insuficiente de cartones pagos en sala ${room} para transferir a agente.`);

          await connection.query('UPDATE user_card_inventory SET quantity = quantity - ? WHERE user_id = ? AND room = ? AND is_gift = FALSE', [quantity, adminId, room]);
          await connection.query('INSERT INTO user_card_inventory (user_id, room, quantity, is_gift) VALUES (?, ?, ?, FALSE) ON DUPLICATE KEY UPDATE quantity = quantity + ?', [targetUserId, room, quantity, quantity]);
          await connection.query('INSERT INTO card_movements_log (user_id, from_user_id, to_user_id, room, quantity, movement_type, is_gift, executed_by) VALUES (?, ?, ?, ?, ?, "transfer", FALSE, ?)', [targetUserId, adminId, targetUserId, room, quantity, adminId]);

          let bonusQty = 0;
          if (applyBonus) {
            const roomSettings = await connection.query('SELECT agent_bonus_percentage FROM room_settings WHERE room = ?', [room]);
            const bonusPct = roomSettings.length > 0 ? parseFloat(roomSettings[0].agent_bonus_percentage) : 10.0;
            bonusQty = Math.floor(quantity * (bonusPct / 100));
            if (bonusQty > 0) {
              await connection.query('INSERT INTO user_card_inventory (user_id, room, quantity, is_gift) VALUES (?, ?, ?, TRUE) ON DUPLICATE KEY UPDATE quantity = quantity + ?', [targetUserId, room, bonusQty, bonusQty]);
              await connection.query('INSERT INTO card_movements_log (user_id, from_user_id, to_user_id, room, quantity, movement_type, is_gift, reason, executed_by) VALUES (?, ?, ?, ?, ?, "transfer_bonus", TRUE, "Bono masivo Agente", ?)', [targetUserId, adminId, targetUserId, room, bonusQty, adminId]);
            }
          }
          results.push({ room, quantity, bonusQty });
        } else {
          // Player split logic
          const targetPaid = Math.floor(quantity * 0.9);
          const targetGift = quantity - targetPaid;
          const stocks = await connection.query('SELECT is_gift, SUM(quantity) as total FROM user_card_inventory WHERE user_id = ? AND room = ? GROUP BY is_gift', [adminId, room]);
          let sPaid = 0, sGift = 0;
          stocks.forEach(s => { if (s.is_gift) sGift = parseInt(s.total) || 0; else sPaid = parseInt(s.total) || 0; });

          let tPaid = Math.min(targetPaid, sPaid);
          let tGift = Math.min(targetGift, sGift);
          if (tPaid + tGift < quantity) {
            let needed = quantity - (tPaid + tGift);
            if (tPaid < targetPaid) { let extra = Math.min(needed, sGift - tGift); tGift += extra; needed -= extra; }
            if (needed > 0 && tGift < targetGift) { let extra = Math.min(needed, sPaid - tPaid); tPaid += extra; needed -= extra; }
            if (tPaid + tGift < quantity) throw new Error(`Stock insuficiente en ${room}. Solo tienes ${tPaid + tGift} cartones totales.`);
          }

          const debitStock = async (conn, uid, rm, q, isG) => {
            if (q <= 0) return;
            let rem = q;
            const recs = await conn.query('SELECT id, quantity FROM user_card_inventory WHERE user_id = ? AND room = ? AND is_gift = ? ORDER BY id ASC', [uid, rm, isG]);
            for (const r of recs) {
              if (rem <= 0) break;
              const sub = Math.min(r.quantity, rem);
              await conn.query('UPDATE user_card_inventory SET quantity = quantity - ? WHERE id = ?', [sub, r.id]);
              rem -= sub;
            }
          };

          if (tPaid > 0) {
            await debitStock(connection, adminId, room, tPaid, false);
            await connection.query('INSERT INTO user_card_inventory (user_id, room, quantity, is_gift) VALUES (?, ?, ?, FALSE) ON DUPLICATE KEY UPDATE quantity = quantity + ?', [targetUserId, room, tPaid, tPaid]);
            await connection.query('INSERT INTO card_movements_log (user_id, from_user_id, to_user_id, room, quantity, movement_type, is_gift, reason, executed_by) VALUES (?, ?, ?, ?, ?, "transfer", FALSE, "Split Jugador", ?)', [targetUserId, adminId, targetUserId, room, tPaid, adminId]);
          }
          if (tGift > 0) {
            await debitStock(connection, adminId, room, tGift, true);
            await connection.query('INSERT INTO user_card_inventory (user_id, room, quantity, is_gift) VALUES (?, ?, ?, TRUE) ON DUPLICATE KEY UPDATE quantity = quantity + ?', [targetUserId, room, tGift, tGift]);
            await connection.query('INSERT INTO card_movements_log (user_id, from_user_id, to_user_id, room, quantity, movement_type, is_gift, reason, executed_by) VALUES (?, ?, ?, ?, ?, "transfer", TRUE, "Split Jugador", ?)', [targetUserId, adminId, targetUserId, room, tGift, adminId]);
          }
          results.push({ room, quantity, tPaid, tGift });
        }
      }
    });

    // Socket emission
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${targetUserId}`).emit('resources_updated', { type: 'bulk_transfer', data: results });
      io.to(`user_${adminId}`).emit('resources_updated', { type: 'bulk_transfer_sent', data: results });
    }

    // Audit Log
    auditService.log({
      adminId: req.user.id,
      action: 'BULK_TRANSFER_CARDS',
      targetUserId: targetUserId,
      details: { items, applyBonus, results },
      ipAddress: req.ip
    });

    return responseHelper.success(res, { message: 'Carga masiva completada', results });

  } catch (error) {
    return responseHelper.error(res, 500, error.message || 'Error en carga masiva');
  }
};



/**
 * GET /api/admin/users
 * Obtiene lista de todos los usuarios
 */
async function getAllUsers(req, res) {
  try {
    const users = await dbHelper.query(`
      SELECT id, username, role, balance, created_at, phone_number,
      (SELECT COUNT(*) FROM users u2 WHERE u2.created_by = u.id) as agents_count
      FROM users u
      ORDER BY created_at DESC
    `, [], 'GetAllUsers');
    return res.json(users);
  } catch (error) {
    return responseHelper.error(res, 500, 'Error obteniendo usuarios', error.message);
  }
}


/**
 * POST /api/admin/users/remove-cards
 * Retira cartones de un usuario (Corrección)
 */
async function removeCardsFromUser(req, res) {
  try {
    const { userId, room, quantity, isGift } = req.body;
    const adminId = req.user.id;

    if (!quantity || quantity <= 0) return responseHelper.error(res, 400, 'Cantidad inválida');

    await dbHelper.transaction(async (connection) => {
      await cardInventoryService.deductUserInventory(
        connection,
        userId,
        room,
        parseInt(quantity),
        isGift || false
      );

      await connection.query(
        `INSERT INTO chips_movements (user_id, amount, movement_type, description, created_by)
           VALUES (?, 0, 'admin_adjustment', ?, ?)`,
        [userId, `Retiro de ${quantity} cartones ${room} (Regalo: ${isGift ? 'SI' : 'NO'})`, adminId]
      );
    });

    // Audit Log
    auditService.log({
      adminId: req.user.id,
      action: 'REMOVE_CARDS_FORCE',
      targetUserId: parseInt(userId),
      details: { room, quantity, isGift },
      ipAddress: req.ip
    });

    return responseHelper.success(res, { message: 'Cartones retirados exitosamente' });

  } catch (error) {
    return responseHelper.error(res, 500, error.message);
  }
}

/**
 * GET /api/admin/users/superior-info
 * Obtiene la información del superior inmediato (CBU, Alias, Contacto)
 */
async function getSuperiorInfo(req, res) {
  try {
    const userId = req.user.userId || req.user.id;

    const user = await dbHelper.queryOne('SELECT parent_id FROM users WHERE id = ?', [userId], 'GetUserParent');
    if (!user) return responseHelper.notFound(res, 'Usuario no encontrado');

    let parentId = user.parent_id;
    if (!parentId && userId !== 1) parentId = 1;

    if (!parentId) return res.json({ hasSuperior: false, message: 'Eres Andy (SuperAdmin Raíz). No tienes superior para solicitudes.' });

    const parent = await dbHelper.queryOne('SELECT id, username, email, cbu, alias, bank_name, phone_number FROM users WHERE id = ?', [parentId], 'GetSuperiorInfo');
    if (!parent) return responseHelper.notFound(res, 'Superior no encontrado');

    try {
      const DepositService = require('../services/depositService');
      const account = await DepositService.getActiveAccount(parentId);

      return res.json({
        hasSuperior: true,
        superior: {
          id: parent.id,
          username: parent.username,
          cbu: account.cbu || 'No definido',
          alias: account.alias || 'No definido',
          bank_name: account.bank_name || 'No definido',
          holder_name: account.holder_name || parent.username,
          contact: parent.phone_number || parent.email
        }
      });
    } catch (accountError) {
      console.warn('⚠️ Superior identified but has no active accounts with limit:', accountError.message);
      return res.json({
        hasSuperior: true,
        error: 'Tu superior no tiene cuentas habilitadas con cupo diario en este momento.',
        superior: {
          id: parent.id,
          username: parent.username,
          cbu: 'No disponible',
          alias: 'Sin cupo diario',
          bank_name: 'Contactar superior',
          holder_name: parent.username,
          contact: parent.phone_number || parent.email
        }
      });
    }
  } catch (error) {
    return responseHelper.error(res, 500, 'Error interno obteniendo info del superior', error.message);
  }
}

/**
 * POST /api/admin/stock/request
 * Crea una solicitud de stock B2B hacia el superior
 */
async function createStockRequest(req, res) {
  try {
    const { room, quantity, items, proofUrl, amount, superiorId } = req.body;
    const userId = req.user.userId || req.user.id;

    if (!superiorId) return responseHelper.error(res, 400, 'Superior ID requerido');

    let detailsObj = null;
    if (items && Array.isArray(items)) {
      detailsObj = { items };
    } else if (room && quantity) {
      detailsObj = { room, quantity };
    }

    if (!detailsObj) return responseHelper.error(res, 400, 'Debe especificar al menos una sala y cantidad');

    const result = await dbHelper.query(
      `INSERT INTO deposit_requests 
       (user_id, target_user_id, amount_declared, proof_image_url, status, details, request_type)
       VALUES (?, ?, ?, ?, 'pending', ?, 'b2b_stock')`,
      [
        userId,
        superiorId,
        amount || 0,
        proofUrl || null,
        JSON.stringify(detailsObj)
      ], 'CreateStockRequest'
    );

    // Audit Log
    auditService.log({
      adminId: req.user.id,
      action: 'CREATE_STOCK_REQUEST',
      targetUserId: superiorId,
      details: { requestId: result.insertId, room, quantity, items, amount },
      ipAddress: req.ip
    });

    return responseHelper.success(res, {
      requestId: result.insertId,
      message: 'Solicitud enviada al superior'
    });

  } catch (error) {
    return responseHelper.error(res, 500, 'Error al enviar solicitud', error.message);
  }
}

module.exports = {
  getAdminProfile,
  getFinancialSummary,
  getGGRStats,
  getAllUsers,
  getDashboardStats,
  sendGlobalMessage,
  getSessionStats,
  getUserStats,
  getRevenueBreakdown,
  getStockSummary,
  getUsersHierarchy,
  createUser,
  addCardsToUser,
  removeCardsFromUser,
  addBalanceToUser,
  getMyCardInventory,
  transferCardsToUser,
  getMyCardMovements,
  changePassword,
  changeUserPassword,
  updateUserPersonalData,
  bulkTransferCards,
  getSuperiorInfo,
  createStockRequest,
  getAuditLogs,
  getSystemHealth
};

/**
 * GET /api/admin/audit-logs
 * Fetch administrative action logs
 */
async function getAuditLogs(req, res) {
  try {
    const { adminId, targetUserId, action, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await auditService.getLogs({
      adminId,
      targetUserId,
      action
    }, parseInt(limit), offset);

    return responseHelper.success(res, result);
  } catch (error) {
    return responseHelper.error(res, 500, 'Error obteniendo logs de auditoría', error.message);
  }
}

/**
 * GET /api/admin/system/health
 * Fetch real-time system metrics
 */
async function getSystemHealth(req, res) {
  try {
    // Only SuperAdmin or Andy can see the full health stats
    const isSuper = req.user.role === 'superadmin' || req.user.username?.toLowerCase() === 'andy';

    const metrics = metricsService.getMetrics();

    if (!isSuper) {
      // Return a redacted version for standard admins
      return responseHelper.success(res, {
        status: 'ok',
        uptime: metrics.uptimeSeconds,
        timestamp: metrics.timestamp
      });
    }

    return responseHelper.success(res, metrics);
  } catch (error) {
    return responseHelper.error(res, 500, 'Error obteniendo salud del sistema', error.message);
  }
}
