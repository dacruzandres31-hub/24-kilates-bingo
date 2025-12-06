/**
 * INVENTORY CONTROLLER
 * Endpoints para gestionar cosméticos del usuario
 */

const inventoryService = require('../services/inventoryService');

/**
 * GET /api/inventory
 * Obtener inventario del usuario actual
 */
exports.getInventory = async (req, res) => {
  try {
    const userId = req.user.id;

    const inventory = await inventoryService.getUserInventory(userId);

    res.json({
      success: true,
      inventory,
      count: inventory.length
    });
  } catch (error) {
    console.error('❌ getInventory error:', error);
    res.status(500).json({ error: 'Error al obtener inventario' });
  }
};

/**
 * GET /api/inventory/available
 * Obtener catálogo de ítems disponibles
 */
exports.getAvailableItems = async (req, res) => {
  try {
    const { type } = req.query;

    const items = await inventoryService.getAvailableItems(type);

    res.json({
      success: true,
      items,
      count: items.length
    });
  } catch (error) {
    console.error('❌ getAvailableItems error:', error);
    res.status(500).json({ error: 'Error al obtener catálogo' });
  }
};

/**
 * POST /api/inventory/equip/:itemId
 * Equipar un ítem del inventario
 */
exports.equipItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    if (!itemId) {
      return res.status(400).json({ error: 'itemId requerido' });
    }

    const equipedItem = await inventoryService.equipItem(userId, parseInt(itemId));

    res.json({
      success: true,
      message: `${equipedItem.name} equipado`,
      item: equipedItem
    });
  } catch (error) {
    console.error('❌ equipItem error:', error);
    
    if (error.message === 'Usuario no posee este ítem') {
      return res.status(403).json({ error: 'No posees este ítem' });
    }
    
    res.status(500).json({ error: 'Error al equipar ítem' });
  }
};

/**
 * POST /api/inventory/unequip/:itemId
 * Desequipar un ítem
 */
exports.unequipItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    if (!itemId) {
      return res.status(400).json({ error: 'itemId requerido' });
    }

    await inventoryService.unequipItem(userId, parseInt(itemId));

    res.json({
      success: true,
      message: 'Ítem desequipado'
    });
  } catch (error) {
    console.error('❌ unequipItem error:', error);
    res.status(500).json({ error: 'Error al desequipar ítem' });
  }
};

/**
 * GET /api/inventory/equipped
 * Obtener ítems equipados del usuario
 */
exports.getEquippedItems = async (req, res) => {
  try {
    const userId = req.user.id;

    const equipped = await inventoryService.getEquippedItems(userId);

    res.json({
      success: true,
      equipped
    });
  } catch (error) {
    console.error('❌ getEquippedItems error:', error);
    res.status(500).json({ error: 'Error al obtener ítems equipados' });
  }
};

module.exports = exports;
