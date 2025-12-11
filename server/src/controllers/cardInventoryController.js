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
    const { user_id, room, quantity, is_gift, purchase_price, reason } = req.body;

    // Validaciones
    if (!user_id || !room || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: user_id, room, quantity'
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

    const result = await cardInventoryService.creditCards(
      user_id,
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
        message: 'user_id es requerido'
      });
    }

    const inventory = await cardInventoryService.getInventory(
      parseInt(userId),
      true  // isSuperAdmin = true (ve regalo/normal separados)
    );

    res.json({
      success: true,
      user_id: parseInt(userId),
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
        message: 'user_id es requerido'
      });
    }

    const movements = await cardInventoryService.getMovementsLog(
      parseInt(userId),
      limit
    );

    res.json({
      success: true,
      user_id: parseInt(userId),
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
    const { from_user_id, to_user_id, room, quantity } = req.body;

    // Validaciones
    if (!from_user_id || !to_user_id || !room || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: from_user_id, to_user_id, room, quantity'
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

    if (from_user_id === to_user_id) {
      return res.status(400).json({
        success: false,
        message: 'No puede transferir cartones a sí mismo'
      });
    }

    const result = await cardInventoryService.transferCards(
      from_user_id,
      to_user_id,
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
