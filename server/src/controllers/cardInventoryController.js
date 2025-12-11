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
    
    const [inventories] = await db.query(
      `SELECT 
         i.user_id,
         u.username,
         u.role,
         i.room,
         i.normal_cards,
         i.gift_cards,
         i.total_cards
       FROM v_superadmin_inventory i
       JOIN users u ON i.user_id = u.id
       ORDER BY u.username, 
                FIELD(i.room, 'bronce', 'plata', 'oro')`
    );

    // Agrupar por usuario
    const grouped = inventories.reduce((acc, item) => {
      if (!acc[item.user_id]) {
        acc[item.user_id] = {
          user_id: item.user_id,
          username: item.username,
          role: item.role,
          rooms: {}
        };
      }

      acc[item.user_id].rooms[item.room] = {
        normal_cards: item.normal_cards,
        gift_cards: item.gift_cards,
        total_cards: item.total_cards
      };

      return acc;
    }, {});

    res.json({
      success: true,
      total_users: Object.keys(grouped).length,
      inventories: Object.values(grouped)
    });

  } catch (error) {
    console.error('Error al obtener todos los inventarios:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener inventarios'
    });
  }
};
