const cardInventoryService = require('../services/cardInventoryService');

/**
 * ENDPOINTS EXCLUSIVOS PARA SUPERADMIN
 * Gestión completa de inventario de cartones
 */

/**
 * POST /api/superadmin/cards/credit
 * Acredita cartones al inventario de un usuario
 */
exports.creditCards = async (req, res) => {
  try {
    const { user_id, username, room, quantity, is_gift, purchase_price, reason } = req.body;

    // Validaciones
    if (!user_id && !username) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar user_id o username'
      });
    }

    if (!room || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: room, quantity'
      });
    }

    // Si se proporciona username, buscar el user_id
    let targetUserId = user_id;
    if (username && !user_id) {
      const db = require('../config/database');
      const [users] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
      
      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Usuario "${username}" no encontrado`
        });
      }
      
      targetUserId = users[0].id;
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

    const result = await cardInventoryService.creditCards(
      targetUserId,
      room,
      quantity,
      is_gift || false,
      purchase_price || null,
      req.user.id,  // SuperAdmin que ejecuta
      reason || `Acreditación manual por ${req.user.username}`
    );

    res.json(result);

  } catch (error) {
    console.error('Error al acreditar cartones:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al acreditar cartones'
    });
  }
};

/**
 * GET /api/superadmin/cards/inventory/:userId
 * Obtiene inventario completo de un usuario (con separación regalo/normal)
 */
exports.getUserInventory = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'user_id o username es requerido'
      });
    }

    // Determinar si es username o ID
    const db = require('../config/database');
    let targetUserId;

    // Si es solo números, es un ID
    if (/^\d+$/.test(userId)) {
      targetUserId = parseInt(userId);
    } else {
      // Es un username, buscarlo
      const [users] = await db.query('SELECT id FROM users WHERE username = ?', [userId]);
      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Usuario "${userId}" no encontrado`
        });
      }
      targetUserId = users[0].id;
    }

    const inventory = await cardInventoryService.getInventory(
      targetUserId,
      true  // isSuperAdmin = true (ve regalo/normal separados)
    );

    res.json({
      success: true,
      user_id: targetUserId,
      inventory: inventory
    });

  } catch (error) {
    console.error('Error al obtener inventario:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener inventario'
    });
  }
};

/**
 * GET /api/superadmin/cards/movements/:userId
 * Obtiene historial de movimientos de cartones de un usuario
 */
exports.getMovementsLog = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'user_id o username es requerido'
      });
    }

    // Determinar si es username o ID
    const db = require('../config/database');
    let targetUserId;

    // Si es solo números, es un ID
    if (/^\d+$/.test(userId)) {
      targetUserId = parseInt(userId);
    } else {
      // Es un username, buscarlo
      const [users] = await db.query('SELECT id FROM users WHERE username = ?', [userId]);
      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Usuario "${userId}" no encontrado`
        });
      }
      targetUserId = users[0].id;
    }

    const movements = await cardInventoryService.getMovementsLog(
      targetUserId,
      limit
    );

    res.json({
      success: true,
      user_id: targetUserId,
      total: movements.length,
      movements: movements
    });

  } catch (error) {
    console.error('Error al obtener movimientos:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener movimientos'
    });
  }
};

/**
 * POST /api/superadmin/cards/transfer
 * Transfiere cartones entre usuarios (SuperAdmin puede transferir entre cualquier usuario)
 */
exports.transferCards = async (req, res) => {
  try {
    const { from_user_id, from_username, to_user_id, to_username, room, quantity } = req.body;

    // Validaciones
    if ((!from_user_id && !from_username) || (!to_user_id && !to_username)) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar from_user_id/from_username y to_user_id/to_username'
      });
    }

    if (!room || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: room, quantity'
      });
    }

    // Resolver usernames a IDs si es necesario
    const db = require('../config/database');
    let fromUserId = from_user_id;
    let toUserId = to_user_id;

    if (from_username && !from_user_id) {
      const [users] = await db.query('SELECT id FROM users WHERE username = ?', [from_username]);
      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Usuario origen "${from_username}" no encontrado`
        });
      }
      fromUserId = users[0].id;
    }

    if (to_username && !to_user_id) {
      const [users] = await db.query('SELECT id FROM users WHERE username = ?', [to_username]);
      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Usuario destino "${to_username}" no encontrado`
        });
      }
      toUserId = users[0].id;
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

    if (fromUserId === toUserId) {
      return res.status(400).json({
        success: false,
        message: 'No puede transferir cartones a sí mismo'
      });
    }

    const result = await cardInventoryService.transferCards(
      fromUserId,
      toUserId,
      room,
      quantity,
      req.user.id  // SuperAdmin que ejecuta
    );

    res.json(result);

  } catch (error) {
    console.error('Error al transferir cartones:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al transferir cartones'
    });
  }
};

/**
 * GET /api/superadmin/cards/all-inventories
 * Obtiene inventario de todos los usuarios (resumen)
 */
exports.getAllInventories = async (req, res) => {
  try {
    const db = require('../db');
    const isSuperAdmin = req.user.role === 'superadmin';
    
    if (isSuperAdmin) {
      // SUPERADMIN: Vista completa con distinción pagos/gratis
      const [inventories] = await db.query(
        `SELECT 
           i.user_id,
           u.username,
           u.role,
           i.room,
           i.normal_cards,
           i.gift_cards,
           i.total_cards,
           i.free_percentage
         FROM v_superadmin_inventory i
         JOIN users u ON i.user_id = u.id
         WHERE u.parent_id = ? OR u.id = ?
         ORDER BY u.username, 
                  FIELD(i.room, 'bronce', 'plata', 'oro')`,
        [req.user.id, req.user.id]
      );

      // Agrupar por usuario
      const grouped = inventories.reduce((acc, item) => {
        if (!acc[item.user_id]) {
          acc[item.user_id] = {
            user_id: item.user_id,
            username: item.username,
            role: item.role,
            rooms: {},
            total_all: 0,
            total_paid: 0,
            total_free: 0,
            avg_free_percentage: 0
          };
        }

        acc[item.user_id].rooms[item.room] = {
          normal_cards: item.normal_cards,
          gift_cards: item.gift_cards,
          total_cards: item.total_cards,
          free_percentage: item.free_percentage
        };

        acc[item.user_id].total_all += item.total_cards;
        acc[item.user_id].total_paid += item.normal_cards;
        acc[item.user_id].total_free += item.gift_cards;

        return acc;
      }, {});

      // Calcular promedio de % gratis por usuario
      Object.values(grouped).forEach(user => {
        user.avg_free_percentage = user.total_all > 0 
          ? Math.round((user.total_free / user.total_all) * 100) 
          : 0;
      });

      // Estadísticas globales
      const totalUsers = Object.keys(grouped).length;
      const totalCards = Object.values(grouped).reduce((sum, u) => sum + u.total_all, 0);
      const totalPaid = Object.values(grouped).reduce((sum, u) => sum + u.total_paid, 0);
      const totalFree = Object.values(grouped).reduce((sum, u) => sum + u.total_free, 0);
      const usersWithAlerts = Object.values(grouped).filter(u => u.avg_free_percentage > 10).length;

      res.json({
        success: true,
        role: 'superadmin',
        total_users: totalUsers,
        stats: {
          total_cards: totalCards,
          total_paid: totalPaid,
          total_free: totalFree,
          global_free_percentage: totalCards > 0 ? Math.round((totalFree / totalCards) * 100) : 0,
          users_with_alerts: usersWithAlerts,
          compliance_rate: totalUsers > 0 ? Math.round(((totalUsers - usersWithAlerts) / totalUsers) * 100) : 100
        },
        inventories: Object.values(grouped)
      });

    } else {
      // AGENTES: Vista simplificada SIN distinción pagos/gratis
      const [inventories] = await db.query(
        `SELECT 
           i.user_id,
           u.username,
           u.role,
           i.room,
           i.total_cards
         FROM v_admin_inventory i
         JOIN users u ON i.user_id = u.id
         WHERE u.parent_id = ? OR u.id = ?
         ORDER BY u.username, 
                  FIELD(i.room, 'bronce', 'plata', 'oro')`,
        [req.user.id, req.user.id]
      );

      // Agrupar por usuario
      const grouped = inventories.reduce((acc, item) => {
        if (!acc[item.user_id]) {
          acc[item.user_id] = {
            user_id: item.user_id,
            username: item.username,
            role: item.role,
            rooms: {},
            total_all: 0
          };
        }

        acc[item.user_id].rooms[item.room] = {
          total_cards: item.total_cards
        };

        acc[item.user_id].total_all += item.total_cards;

        return acc;
      }, {});

      const totalUsers = Object.keys(grouped).length;
      const totalCards = Object.values(grouped).reduce((sum, u) => sum + u.total_all, 0);

      res.json({
        success: true,
        role: 'agente',
        total_users: totalUsers,
        stats: {
          total_cards: totalCards
        },
        inventories: Object.values(grouped)
      });
    }

  } catch (error) {
    console.error('Error al obtener todos los inventarios:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener inventarios'
    });
  }
};

/**
 * GET /api/admin/cards/movements
 * GET /api/superadmin/cards/movements
 * Obtiene historial de movimientos de cartones
 * SuperAdmin: ve todos los detalles incluyendo is_gift
 * Agentes: solo ven totales sin distinción
 */
exports.getAllMovements = async (req, res) => {
  try {
    const db = require('../db');
    const isSuperAdmin = req.user.role === 'superadmin';
    const { user_id, room, movement_type, date_from, date_to, limit = 50, offset = 0 } = req.query;

    let whereConditions = [];
    let queryParams = [];

    // Filtro por jerarquía (solo ver movimientos de su red)
    if (isSuperAdmin) {
      // SuperAdmin ve todo
      whereConditions.push('1=1');
    } else {
      // Agentes solo ven su red
      whereConditions.push(`(
        cm.user_id IN (SELECT id FROM users WHERE parent_id = ? OR id = ?)
        OR cm.from_user_id IN (SELECT id FROM users WHERE parent_id = ? OR id = ?)
        OR cm.to_user_id IN (SELECT id FROM users WHERE parent_id = ? OR id = ?)
      )`);
      queryParams.push(req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id);
    }

    // Filtros opcionales
    if (user_id) {
      whereConditions.push('cm.user_id = ?');
      queryParams.push(user_id);
    }

    if (room) {
      whereConditions.push('cm.room = ?');
      queryParams.push(room);
    }

    if (movement_type) {
      whereConditions.push('cm.movement_type = ?');
      queryParams.push(movement_type);
    }

    if (date_from) {
      whereConditions.push('cm.created_at >= ?');
      queryParams.push(date_from);
    }

    if (date_to) {
      whereConditions.push('cm.created_at <= ?');
      queryParams.push(date_to);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    if (isSuperAdmin) {
      // SUPERADMIN: Ve is_gift y todos los detalles
      const [movements] = await db.query(
        `SELECT 
           cm.id,
           cm.created_at,
           cm.user_id,
           u.username,
           cm.room,
           cm.movement_type,
           cm.quantity,
           cm.is_gift,
           cm.from_user_id,
           u_from.username as from_username,
           cm.to_user_id,
           u_to.username as to_username,
           cm.reason,
           cm.executed_by,
           u_exec.username as executed_by_username
         FROM card_movements_log cm
         LEFT JOIN users u ON cm.user_id = u.id
         LEFT JOIN users u_from ON cm.from_user_id = u_from.id
         LEFT JOIN users u_to ON cm.to_user_id = u_to.id
         LEFT JOIN users u_exec ON cm.executed_by = u_exec.id
         ${whereClause}
         ORDER BY cm.created_at DESC
         LIMIT ? OFFSET ?`,
        [...queryParams, parseInt(limit), parseInt(offset)]
      );

      // Count total
      const [countResult] = await db.query(
        `SELECT COUNT(*) as total FROM card_movements_log cm ${whereClause}`,
        queryParams
      );

      res.json({
        success: true,
        role: 'superadmin',
        total: countResult[0].total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        movements
      });

    } else {
      // AGENTES: NO ven is_gift, solo totales
      const [movements] = await db.query(
        `SELECT 
           cm.id,
           cm.created_at,
           cm.user_id,
           u.username,
           cm.room,
           cm.movement_type,
           cm.quantity,
           cm.from_user_id,
           u_from.username as from_username,
           cm.to_user_id,
           u_to.username as to_username,
           cm.reason,
           cm.executed_by,
           u_exec.username as executed_by_username
         FROM card_movements_log cm
         LEFT JOIN users u ON cm.user_id = u.id
         LEFT JOIN users u_from ON cm.from_user_id = u_from.id
         LEFT JOIN users u_to ON cm.to_user_id = u_to.id
         LEFT JOIN users u_exec ON cm.executed_by = u_exec.id
         ${whereClause}
         ORDER BY cm.created_at DESC
         LIMIT ? OFFSET ?`,
        [...queryParams, parseInt(limit), parseInt(offset)]
      );

      const [countResult] = await db.query(
        `SELECT COUNT(*) as total FROM card_movements_log cm ${whereClause}`,
        queryParams
      );

      res.json({
        success: true,
        role: 'agente',
        total: countResult[0].total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        movements
      });
    }

  } catch (error) {
    console.error('Error al obtener movimientos:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener movimientos'
    });
  }
};
