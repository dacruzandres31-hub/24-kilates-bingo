const pool = require('../db');
const MoneyMath = require('../utils/moneyMath');
const bcrypt = require('bcryptjs');
const cardInventoryService = require('../services/cardInventoryService');

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
    const { userId } = req.user;

    const [users] = await pool.query(
      'SELECT id, username, role, balance FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(users[0]);

  } catch (error) {
    console.error('❌ Error obteniendo perfil:', error);
    res.status(500).json({ error: 'Error obteniendo perfil' });
  }
}

/**
 * GET /api/admin/financial-summary
 * Retorna resumen financiero para el dashboard
 */
async function getFinancialSummary(req, res) {
  try {
    const [todayStats] = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN movement_type = 'purchase' THEN amount ELSE 0 END), 0) as sales,
        COALESCE(SUM(CASE WHEN movement_type = 'prize' THEN amount ELSE 0 END), 0) as prizesDistributed,
        COUNT(DISTINCT user_id) as activeUsers
      FROM chips_movements 
      WHERE DATE(created_at) = CURDATE()
    `);

    const stats = todayStats[0] || {};
    const netBalance = (stats.sales || 0) - (stats.prizesDistributed || 0);

    res.json({
      success: true,
      today: {
        sales: stats.sales || 0,
        prizesDistributed: stats.prizesDistributed || 0,
        netBalance: netBalance,
        activeUsers: stats.activeUsers || 0
      },
      pots: {
        linea: 0,
        bingo: 0,
        acumulado: 0
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo resumen financiero:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error obteniendo resumen financiero' 
    });
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

/**
 * GET /api/admin/stock-summary
 * Retorna el stock disponible de cartones por sala
 */
async function getStockSummary(req, res) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const [stockResults] = await pool.query(`
      SELECT 
        room,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as disponibles,
        SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as vendidos
      FROM daily_stock_cards
      WHERE play_date = ?
      GROUP BY room
    `, [today]);

    const stockByRoom = {
      bronce: 0,
      plata: 0,
      oro: 0
    };

    stockResults.forEach(row => {
      const room = row.room.toLowerCase();
      if (stockByRoom.hasOwnProperty(room)) {
        stockByRoom[room] = row.disponibles || 0;
      }
    });

    res.json({
      success: true,
      bronce: stockByRoom.bronce,
      plata: stockByRoom.plata,
      oro: stockByRoom.oro,
      fecha: today
    });

  } catch (error) {
    console.error('❌ Error obteniendo stock de cartones:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error obteniendo stock de cartones',
      details: error.message 
    });
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

    // SuperAdmin ve TODOS los usuarios (incluyéndose a sí mismo)
    if (currentUserRole === 'superadmin') {
      [allUsers] = await pool.query(`
        SELECT id, username, role, parent_id, balance,
               (SELECT COUNT(*) FROM user_cards WHERE user_id = users.id AND room = 'bronce') as cards_bronce,
               (SELECT COUNT(*) FROM user_cards WHERE user_id = users.id AND room = 'plata') as cards_plata,
               (SELECT COUNT(*) FROM user_cards WHERE user_id = users.id AND room = 'oro') as cards_oro
        FROM users
        ORDER BY id
      `);
      
      // Obtener datos del usuario actual
      currentUserData = allUsers.find(u => u.id === currentUserId);
    } 
    // Agentes solo ven su RED (hijos directos y todos los descendientes)
    else if (currentUserRole === 'agente') {
      // Primero obtener datos del agente actual
      const [currentUserRow] = await pool.query(`
        SELECT id, username, role, parent_id, balance,
               (SELECT COUNT(*) FROM user_cards WHERE user_id = users.id AND room = 'bronce') as cards_bronce,
               (SELECT COUNT(*) FROM user_cards WHERE user_id = users.id AND room = 'plata') as cards_plata,
               (SELECT COUNT(*) FROM user_cards WHERE user_id = users.id AND room = 'oro') as cards_oro
        FROM users
        WHERE id = ?
      `, [currentUserId]);
      
      currentUserData = currentUserRow[0];
      
      // Usar CTE recursivo para obtener toda la red del agente
      const [networkUsers] = await pool.query(`
        WITH RECURSIVE network AS (
          -- Caso base: hijos directos del agente actual
          SELECT id, username, role, parent_id, balance
          FROM users 
          WHERE parent_id = ?
          
          UNION ALL
          
          -- Caso recursivo: hijos de los hijos
          SELECT u.id, u.username, u.role, u.parent_id, u.balance
          FROM users u
          INNER JOIN network n ON u.parent_id = n.id
        )
        SELECT 
          n.id, 
          n.username, 
          n.role, 
          n.parent_id, 
          n.balance,
          (SELECT COUNT(*) FROM user_cards WHERE user_id = n.id AND room = 'bronce') as cards_bronce,
          (SELECT COUNT(*) FROM user_cards WHERE user_id = n.id AND room = 'plata') as cards_plata,
          (SELECT COUNT(*) FROM user_cards WHERE user_id = n.id AND room = 'oro') as cards_oro
        FROM network n
        ORDER BY n.id
      `, [currentUserId]);
      
      // Combinar: agente actual + su red
      allUsers = [currentUserData, ...networkUsers];
    }
    // Jugadores no tienen acceso a este endpoint (pero por si acaso)
    else {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para ver usuarios'
      });
    }

    // Construir árbol jerárquico
    const buildTree = (parentId = null) => {
      return allUsers
        .filter(u => u.parent_id === parentId)
        .map(user => ({
          ...user,
          children: buildTree(user.id)
        }));
    };

    // Crear árbol con el usuario actual como raíz
    const tree = [{
      ...currentUserData,
      children: buildTree(currentUserId)
    }];

    res.json({
      success: true,
      tree,
      all: allUsers,
      currentUser: {
        id: currentUserId,
        role: currentUserRole,
        username: currentUserData?.username
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo jerarquía:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error obteniendo jerarquía de usuarios',
      details: error.message 
    });
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
    console.log('🔍 [CREATE-USER] req.user =', JSON.stringify(req.user));
    console.log('🔍 [CREATE-USER] req.body =', JSON.stringify(req.body));
    
    const { username, password, role, parent_id, nombre_completo, documento, email, telefono } = req.body;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    console.log('🔍 [CREATE-USER] Parsed - username:', username, 'role:', role, 'parent_id:', parent_id, 'currentUserId:', currentUserId, 'currentUserRole:', currentUserRole);

    if (!username || !password || !role) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: username, password, role'
      });
    }

    // Validar que el role sea válido
    const validRoles = ['superadmin', 'agente', 'jugador'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Rol inválido. Debe ser: superadmin, agente o jugador'
      });
    }

    // Determinar el parent_id según la lógica jerárquica
    let finalParentId;

    if (currentUserRole === 'superadmin') {
      // SuperAdmin puede especificar parent_id o dejarlo null (raíz)
      finalParentId = parent_id || null;
    } else if (currentUserRole === 'agente') {
      // Agentes siempre crean usuarios bajo su red
      finalParentId = currentUserId;

      // Agentes NO pueden crear SuperAdmins
      if (role === 'superadmin') {
        return res.status(403).json({
          success: false,
          error: 'No tienes permisos para crear SuperAdmins'
        });
      }
    } else {
      // Jugadores no pueden crear usuarios
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para crear usuarios'
      });
    }

    // Verificar si el usuario ya existe
    const [existingUser] = await pool.query(
      'SELECT id, username FROM users WHERE username = ?',
      [username]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({
        success: false,
        error: `El usuario "${username}" ya existe. Por favor elige otro nombre.`
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // DEBUG: Log para verificar parent_id
    console.log(`🔍 [JWT-FIX] Creating user: ${username}, Role: ${role}, CurrentUser: ${currentUserId}, CurrentRole: ${currentUserRole}, FinalParentId: ${finalParentId}, ReqUser:`, JSON.stringify(req.user));

    // Insertar usuario con campos básicos primero
    const [result] = await pool.query(
      `INSERT INTO users (username, password_hash, role, parent_id, balance)
       VALUES (?, ?, ?, ?, ?)`,
      [username, hashedPassword, role, finalParentId, 0]
    );

    // Intentar actualizar campos opcionales si existen
    if (nombre_completo || documento || email || telefono) {
      try {
        const updates = [];
        const values = [];
        
        if (nombre_completo) {
          updates.push('nombre_completo = ?');
          values.push(nombre_completo);
        }
        if (documento) {
          updates.push('documento = ?');
          values.push(documento);
        }
        if (email) {
          updates.push('email = ?');
          values.push(email);
        }
        if (telefono) {
          updates.push('telefono = ?');
          values.push(telefono);
        }

        if (updates.length > 0) {
          values.push(result.insertId);
          await pool.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
            values
          );
        }
      } catch (updateError) {
        // Ignorar errores de campos opcionales que no existen en la tabla
        console.log('⚠️  Campos opcionales no disponibles en la tabla:', updateError.message);
      }
    }

    res.json({
      success: true,
      userId: result.insertId,
      message: `${role.toUpperCase()} "${username}" creado exitosamente bajo ${currentUserRole === 'agente' ? 'tu red' : 'la jerarquía especificada'}`,
      parent_id: finalParentId
    });

  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        error: 'El nombre de usuario ya existe'
      });
    }

    console.error('❌ Error creando usuario:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error creando usuario',
      details: error.message 
    });
  }
}

/**
 * Helper: Verificar si un usuario pertenece a la red de un agente
 * Usa CTE recursivo para verificar toda la jerarquía descendente
 */
async function canModifyUser(currentUserId, currentUserRole, targetUserId) {
  // SuperAdmin puede modificar a todos
  if (currentUserRole === 'superadmin') {
    return true;
  }

  // Agentes solo pueden modificar usuarios de su red
  if (currentUserRole === 'agente') {
    const [result] = await pool.query(`
      WITH RECURSIVE network AS (
        -- Caso base: hijos directos
        SELECT id FROM users WHERE parent_id = ?
        
        UNION ALL
        
        -- Caso recursivo: descendientes
        SELECT u.id FROM users u
        INNER JOIN network n ON u.parent_id = n.id
      )
      SELECT COUNT(*) as count FROM network WHERE id = ?
    `, [currentUserId, targetUserId]);

    return result[0].count > 0;
  }

  // Jugadores no pueden modificar a nadie
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
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos'
      });
    }

    // VALIDACIÓN JERÁRQUICA: Verificar permisos
    const hasPermission = await canModifyUser(currentUserId, currentUserRole, userId);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para modificar a este usuario (fuera de tu red)'
      });
    }

    // Validar que la sala sea válida
    const validRooms = ['bronce', 'plata', 'oro'];
    if (!validRooms.includes(room)) {
      return res.status(400).json({
        success: false,
        error: 'Sala inválida. Debe ser: bronce, plata u oro'
      });
    }

    // Agregar o quitar cartones
    if (quantity > 0) {
      // AGREGAR cartones
      if (currentUserRole === 'superadmin') {
        // SUPERADMIN: Crear cartones desde cero (ilimitado)
        await cardInventoryService.creditCards(
          userId,         // userId
          room,           // room
          quantity,       // quantity
          false,          // isGift
          null,           // purchasePrice
          currentUserId,  // executedBy
          'Admin credit'  // reason
        );
      } else {
        // AGENTE/ADMIN: Transferir desde su inventario al usuario
        await cardInventoryService.transferCards(
          currentUserId,  // from (admin)
          userId,         // to (usuario)
          room,
          quantity,
          currentUserId   // executedBy
        );
      }
    } else if (quantity < 0) {
      // QUITAR cartones = Decrementar directamente del inventario del usuario
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        // Verificar que tenga suficientes cartones
        const [inventory] = await connection.query(
          `SELECT SUM(quantity) as total FROM user_card_inventory 
           WHERE user_id = ? AND room = ?`,
          [userId, room]
        );

        const totalAvailable = inventory[0]?.total || 0;
        const quantityToRemove = Math.abs(quantity);

        if (totalAvailable < quantityToRemove) {
          throw new Error(`Usuario solo tiene ${totalAvailable} cartones, no se pueden quitar ${quantityToRemove}`);
        }

        // Decrementar proporcionalmente (primero los normales, luego los de regalo)
        let remaining = quantityToRemove;
        
        // Primero quitar de cartones normales
        const [normalCards] = await connection.query(
          `SELECT id, quantity FROM user_card_inventory 
           WHERE user_id = ? AND room = ? AND is_gift = FALSE
           ORDER BY id ASC`,
          [userId, room]
        );

        for (const card of normalCards) {
          if (remaining <= 0) break;
          
          const toRemove = Math.min(card.quantity, remaining);
          await connection.query(
            `UPDATE user_card_inventory 
             SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [toRemove, card.id]
          );
          
          remaining -= toRemove;
        }

        // Si aún quedan por quitar, sacar de los de regalo
        if (remaining > 0) {
          const [giftCards] = await connection.query(
            `SELECT id, quantity FROM user_card_inventory 
             WHERE user_id = ? AND room = ? AND is_gift = TRUE
             ORDER BY id ASC`,
            [userId, room]
          );

          for (const card of giftCards) {
            if (remaining <= 0) break;
            
            const toRemove = Math.min(card.quantity, remaining);
            await connection.query(
              `UPDATE user_card_inventory 
               SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP
               WHERE id = ?`,
              [toRemove, card.id]
            );
            
            remaining -= toRemove;
          }
        }

        // Eliminar registros con cantidad 0
        await connection.query(
          `DELETE FROM user_card_inventory WHERE quantity = 0`
        );

        // Registrar movimiento en log
        await connection.query(
          `INSERT INTO card_movements_log 
           (user_id, room, movement_type, quantity, is_gift, reason, executed_by)
           VALUES (?, ?, 'debit', ?, FALSE, 'Admin removed cards', ?)`,
          [userId, room, quantityToRemove, currentUserId]
        );

        await connection.commit();
        connection.release();

      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    }

    res.json({
      success: true,
      message: `${Math.abs(quantity)} cartón(es) de ${room} ${quantity > 0 ? 'agregado(s)' : 'descargado(s)'} exitosamente`
    });

  } catch (error) {
    console.error('❌ Error gestionando cartones:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error gestionando cartones',
      details: error.message 
    });
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

    if (!userId || amount === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos (userId, amount)'
      });
    }

    // VALIDACIÓN JERÁRQUICA: Verificar permisos
    const hasPermission = await canModifyUser(currentUserId, currentUserRole, userId);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para modificar a este usuario (fuera de tu red)'
      });
    }

    // Validar que amount sea un número válido
    if (isNaN(amount)) {
      return res.status(400).json({
        success: false,
        error: 'El monto debe ser un número válido'
      });
    }

    const amountDecimal = MoneyMath.decimal(amount);

    // Obtener balance actual y username
    const [users] = await pool.query(
      'SELECT username, balance FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const currentBalance = MoneyMath.decimal(users[0].balance);
    const username = users[0].username;
    const newBalance = currentBalance.plus(amountDecimal);

    // Validaciones específicas para descarga de saldo
    if (amount < 0) {
      // Verificar que tenga saldo disponible
      if (currentBalance.lessThanOrEqualTo(0)) {
        return res.status(400).json({
          success: false,
          error: `El usuario ${username} no tiene saldo disponible para descargar`
        });
      }

      // Verificar que no se descargue más de lo que tiene
      if (newBalance.lessThan(0)) {
        return res.status(400).json({
          success: false,
          error: `El usuario solo tiene $${MoneyMath.toNumber(currentBalance).toLocaleString('es-CO')}, no se pueden descargar $${Math.abs(amount).toLocaleString('es-CO')}`
        });
      }
    }

    // Actualizar balance
    await pool.query(
      'UPDATE users SET balance = ? WHERE id = ?',
      [MoneyMath.toNumber(newBalance), userId]
    );

    // Registrar movimiento
    const movementType = amount > 0 ? 'deposit' : 'withdrawal';
    const description = amount > 0 
      ? `Carga manual desde panel admin` 
      : `Descarga manual desde panel admin`;

    await pool.query(
      `INSERT INTO chips_movements 
       (user_id, movement_type, amount, balance_after, description, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [userId, movementType, Math.abs(amount), MoneyMath.toNumber(newBalance), description]
    );

    res.json({
      success: true,
      message: `${amount > 0 ? 'Cargado' : 'Descargado'} $${Math.abs(amount).toLocaleString('es-CO')} ${amount > 0 ? 'a' : 'de'} ${username}`,
      newBalance: MoneyMath.toNumber(newBalance)
    });

  } catch (error) {
    console.error('❌ Error gestionando balance:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error gestionando balance',
      details: error.message 
    });
  }
}

/**
 * GET /api/admin/cards/inventory
 * Obtiene inventario de cartones del admin actual (vista filtrada - solo totales)
 */
async function getMyCardInventory(req, res) {
  try {
    const inventory = await cardInventoryService.getInventory(
      req.user.id,
      false  // isSuperAdmin = false (solo ve totales, NO regalo/normal)
    );

    res.json({
      success: true,
      user_id: req.user.id,
      username: req.user.username,
      inventory: inventory
    });

  } catch (error) {
    console.error('❌ Error obteniendo inventario de cartones:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo inventario de cartones',
      details: error.message
    });
  }
}

/**
 * POST /api/admin/cards/transfer
 * Transfiere cartones a usuarios de su red (cajeros/jugadores)
 */
async function transferCardsToUser(req, res) {
  try {
    const { to_user_id, room, quantity } = req.body;

    // Validaciones
    if (!to_user_id || !room || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: to_user_id, room, quantity'
      });
    }

    if (!['bronce', 'plata', 'oro'].includes(room)) {
      return res.status(400).json({
        success: false,
        message: 'Sala inválida. Debe ser: bronce, plata u oro'
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'La cantidad debe ser mayor a 0'
      });
    }

    // Verificar que el destinatario esté en su red (jerárquicamente bajo él)
    const [targetUser] = await pool.query(
      `WITH RECURSIVE network AS (
         SELECT id, username, parent_id, 1 as level 
         FROM users WHERE id = ?
         UNION ALL
         SELECT u.id, u.username, u.parent_id, n.level + 1
         FROM users u 
         JOIN network n ON u.parent_id = n.id
       )
       SELECT id, username FROM network WHERE id = ?`,
      [req.user.id, to_user_id]
    );

    if (targetUser.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Solo puede transferir cartones a usuarios de su red'
      });
    }

    const result = await cardInventoryService.transferCards(
      req.user.id,
      to_user_id,
      room,
      quantity,
      req.user.id
    );

    res.json(result);

  } catch (error) {
    console.error('❌ Error transfiriendo cartones:', error);
    res.status(500).json({
      success: false,
      error: 'Error transfiriendo cartones',
      details: error.message
    });
  }
}

/**
 * GET /api/admin/cards/movements
 * Obtiene historial de movimientos de cartones del admin actual
 */
async function getMyCardMovements(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 50;

    const movements = await cardInventoryService.getMovementsLog(
      req.user.id,
      limit
    );

    res.json({
      success: true,
      user_id: req.user.id,
      total: movements.length,
      movements: movements
    });

  } catch (error) {
    console.error('❌ Error obteniendo movimientos:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo movimientos de cartones',
      details: error.message
    });
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

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }

    // Obtener usuario actual
    const [users] = await pool.query(
      'SELECT id, username, password FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const user = users[0];

    // Verificar contraseña actual
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'La contraseña actual es incorrecta'
      });
    }

    // Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña
    await pool.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, userId]
    );

    console.log(`✅ Contraseña cambiada para usuario ${user.username} (ID: ${userId})`);

    res.json({
      success: true,
      message: 'Contraseña cambiada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error cambiando contraseña:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cambiar la contraseña',
      details: error.message
    });
  }
}

module.exports = {
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
  // Card Inventory (Admin/Cajero)
  getMyCardInventory,
  transferCardsToUser,
  getMyCardMovements,
  changePassword
};
