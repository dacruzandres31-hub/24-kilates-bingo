/**
 * INVENTORY SERVICE - Sistema de Cosméticos
 * Gestiona ítems visuales (skins, marcos, efectos)
 */

const pool = require('../db');

/**
 * Obtener inventario del usuario
 * @param {number} userId
 * @returns {array} Items del usuario con estado equipado
 */
async function getUserInventory(userId) {
  try {
    const query = `
      SELECT 
        ui.id,
        ui.equipped,
        ui.obtained_at,
        ci.id as item_id,
        ci.name,
        ci.type,
        ci.asset_url,
        ci.rarity,
        ci.color_hex,
        ci.animation_class
      FROM user_inventory ui
      JOIN cosmetic_items ci ON ui.item_id = ci.id
      WHERE ui.user_id = ?
      ORDER BY ui.obtained_at DESC
    `;
    
    const [result] = await pool.query(query, [userId]);
    return result;
  } catch (error) {
    console.error('❌ getUserInventory error:', error);
    throw error;
  }
}

/**
 * Obtener ítems disponibles en el catálogo
 * @param {string} type - Filtrar por tipo (avatar_frame, card_skin, etc)
 * @returns {array} Todos los ítems disponibles
 */
async function getAvailableItems(type = null) {
  try {
    let query = `
      SELECT id, name, description, type, asset_url, rarity, color_hex
      FROM cosmetic_items
      WHERE is_free_available = true
    `;
    
    if (type) {
      query += ` AND type = ?`;
      const [result] = await pool.query(query, [type]);
      return result;
    }
    
    const [result] = await pool.query(query);
    return result;
  } catch (error) {
    console.error('❌ getAvailableItems error:', error);
    throw error;
  }
}

/**
 * Agregar ítem al inventario del usuario
 * @param {number} userId
 * @param {number} itemId
 * @returns {object} Item agregado
 */
async function addItemToInventory(userId, itemId) {
  try {
    // Verificar que el ítem existe
    const [itemCheck] = await pool.query(
      'SELECT * FROM cosmetic_items WHERE id = ?',
      [itemId]
    );
    
    if (itemCheck.length === 0) {
      throw new Error('Item no encontrado');
    }

    // Insertar en inventario (ignorar si ya existe)
    const [result] = await pool.query(
      `INSERT INTO user_inventory (user_id, item_id, equipped)
       VALUES (?, ?, false)
       ON DUPLICATE KEY UPDATE item_id = item_id`,
      [userId, itemId]
    );
    
    if (result.affectedRows === 1 && result.insertId > 0) {
      // Nuevo insert
      const [newItem] = await pool.query(
        'SELECT id, equipped, obtained_at FROM user_inventory WHERE id = ?',
        [result.insertId]
      );
      return newItem[0];
    } else {
      // Ya lo tenía, obtenerlo
      const [existing] = await pool.query(
        'SELECT id, equipped, obtained_at FROM user_inventory WHERE user_id = ? AND item_id = ?',
        [userId, itemId]
      );
      return existing[0];
    }
  } catch (error) {
    console.error('❌ addItemToInventory error:', error);
    throw error;
  }
}

/**
 * Equipar un ítem del usuario
 * @param {number} userId
 * @param {number} itemId
 * @returns {object} Item equipado con sus detalles
 */
async function equipItem(userId, itemId) {
  try {
    const connection = await pool.getConnection();
    try {
      await connection.query('START TRANSACTION');

      // Verificar que el usuario tiene este ítem
      const [ownCheck] = await connection.query(
        `SELECT ci.type FROM user_inventory ui
         JOIN cosmetic_items ci ON ui.item_id = ci.id
         WHERE ui.user_id = ? AND ui.item_id = ?`,
        [userId, itemId]
      );

      if (ownCheck.length === 0) {
        throw new Error('Usuario no posee este ítem');
      }

      const itemType = ownCheck[0].type;

      // Desmarcar otros ítems del mismo tipo
      const equipColumn = {
        'avatar_frame': 'equipped_avatar_frame_id',
        'card_skin': 'equipped_card_skin_id',
        'chat_effect': 'equipped_chat_effect_id'
      }[itemType];

      if (equipColumn) {
        await connection.query(
          `UPDATE users SET ${equipColumn} = ? WHERE id = ?`,
          [itemId, userId]
        );
      }

      // Marcar en user_inventory
      await connection.query(
        `UPDATE user_inventory SET equipped = true 
         WHERE user_id = ? AND item_id = ?`,
        [userId, itemId]
      );

      await connection.query('COMMIT');

      // Retornar el ítem equipado con detalles
      const query = `
        SELECT 
          ci.id,
          ci.name,
          ci.type,
          ci.asset_url,
          ci.color_hex,
          ci.animation_class
        FROM cosmetic_items ci
        WHERE ci.id = ?
      `;
      
      const [result] = await connection.query(query, [itemId]);
      return result[0];

    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ equipItem error:', error);
    throw error;
  }
}

/**
 * Desequipar un ítem
 * @param {number} userId
 * @param {number} itemId
 */
async function unequipItem(userId, itemId) {
  try {
    const connection = await pool.getConnection();
    try {
      await connection.query('START TRANSACTION');

      // Obtener tipo de ítem
      const [typeCheck] = await connection.query(
        `SELECT ci.type FROM user_inventory ui
         JOIN cosmetic_items ci ON ui.item_id = ci.id
         WHERE ui.user_id = ? AND ui.item_id = ?`,
        [userId, itemId]
      );

      if (typeCheck.length === 0) {
        throw new Error('Usuario no posee este ítem');
      }

      const itemType = typeCheck[0].type;

      // Desmarcar de users
      const equipColumn = {
        'avatar_frame': 'equipped_avatar_frame_id',
        'card_skin': 'equipped_card_skin_id',
        'chat_effect': 'equipped_chat_effect_id'
      }[itemType];

      if (equipColumn) {
        await connection.query(
          `UPDATE users SET ${equipColumn} = NULL WHERE id = ?`,
          [userId]
        );
      }

      // Desmarcar en user_inventory
      await connection.query(
        `UPDATE user_inventory SET equipped = false 
         WHERE user_id = ? AND item_id = ?`,
        [userId, itemId]
      );

      await connection.query('COMMIT');
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ unequipItem error:', error);
    throw error;
  }
}

/**
 * Drop aleatorio de ítem al ganar en STARTER
 * @param {number} userId - Usuario ganador
 * @returns {object} Ítem ganado
 */
async function dropRandomItem(userId) {
  try {
    // Obtener ítems disponibles para ganar
    const availableQuery = `
      SELECT id FROM cosmetic_items 
      WHERE is_free_available = true
      ORDER BY RAND() 
      LIMIT 1
    `;
    
    const [itemResult] = await pool.query(availableQuery);
    
    if (itemResult.length === 0) {
      console.warn('⚠️ No hay ítems disponibles para dropear');
      return null;
    }

    const itemId = itemResult[0].id;

    // Agregar al inventario
    const addedItem = await addItemToInventory(userId, itemId);

    // Obtener detalles completos del ítem
    const query = `
      SELECT id, name, type, asset_url, rarity, description
      FROM cosmetic_items
      WHERE id = ?
    `;
    
    const [result] = await pool.query(query, [itemId]);
    return result[0];
  } catch (error) {
    console.error('❌ dropRandomItem error:', error);
    throw error;
  }
}

/**
 * Obtener ítems equipados del usuario
 * @param {number} userId
 * @returns {object} { avatar_frame, card_skin, chat_effect }
 */
async function getEquippedItems(userId) {
  try {
    const query = `
      SELECT 
        (SELECT ci.* FROM cosmetic_items ci 
         WHERE ci.id = u.equipped_avatar_frame_id) as avatar_frame,
        (SELECT ci.* FROM cosmetic_items ci 
         WHERE ci.id = u.equipped_card_skin_id) as card_skin,
        (SELECT ci.* FROM cosmetic_items ci 
         WHERE ci.id = u.equipped_chat_effect_id) as chat_effect
      FROM users u
      WHERE u.id = ?
    `;
    
    const [result] = await pool.query(query, [userId]);
    return result[0] || {};
  } catch (error) {
    console.error('❌ getEquippedItems error:', error);
    throw error;
  }
}

module.exports = {
  getUserInventory,
  getAvailableItems,
  addItemToInventory,
  equipItem,
  unequipItem,
  dropRandomItem,
  getEquippedItems
};
