const pool = require('../db');
const MoneyMath = require('../utils/moneyMath');
const websocketService = require('./websocketService');

class CardInventoryService {
  /**
   * Acredita cartones al inventario de un usuario (SuperAdmin only)
   * @param {number} userId - ID del usuario
   * @param {string} room - Sala (bronce, plata, oro)
   * @param {number} quantity - Cantidad de cartones
   * @param {boolean} isGift - Si son cartones de regalo
   * @param {number} purchasePrice - Precio de compra por cartón
   * @param {number} executedBy - ID del SuperAdmin que ejecuta
   * @param {string} reason - Razón del crédito
   */
  async creditCards(userId, room, quantity, isGift = false, purchasePrice = null, executedBy, reason = null) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Verificar si ya existe registro para este user/room/gift
      const [existing] = await connection.query(
        `SELECT id, quantity FROM user_card_inventory 
         WHERE user_id = ? AND room = ? AND is_gift = ?`,
        [userId, room, isGift]
      );

      if (existing.length > 0) {
        // Actualizar cantidad existente
        await connection.query(
          `UPDATE user_card_inventory 
           SET quantity = quantity + ?, 
               purchase_price = COALESCE(?, purchase_price),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [quantity, purchasePrice, existing[0].id]
        );
      } else {
        // Insertar nuevo registro
        await connection.query(
          `INSERT INTO user_card_inventory (user_id, room, is_gift, quantity, purchase_price)
           VALUES (?, ?, ?, ?, ?)`,
          [userId, room, isGift, quantity, purchasePrice]
        );
      }

      // Registrar movimiento en log
      await connection.query(
        `INSERT INTO card_movements_log 
         (user_id, room, movement_type, quantity, is_gift, reason, executed_by)
         VALUES (?, ?, 'credit', ?, ?, ?, ?)`,
        [userId, room, quantity, isGift, reason, executedBy]
      );

      await connection.commit();

      return {
        success: true,
        message: `${quantity} cartones ${isGift ? 'de regalo' : 'normales'} acreditados en sala ${room}`,
        newTotal: existing.length > 0 ? existing[0].quantity + quantity : quantity
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Obtiene inventario de un usuario (vista según rol)
   * @param {number} userId - ID del usuario
   * @param {boolean} isSuperAdmin - Si quien consulta es SuperAdmin
   */
  async getInventory(userId, isSuperAdmin = false) {
    const view = isSuperAdmin ? 'v_superadmin_inventory' : 'v_admin_inventory';

    const [inventory] = await pool.query(
      `SELECT * FROM ${view} WHERE user_id = ?`,
      [userId]
    );

    return inventory;
  }

  /**
   * Transfiere cartones entre usuarios manteniendo proporción regalo/normal
   * @param {number} fromUserId - Usuario que envía
   * @param {number} toUserId - Usuario que recibe
   * @param {string} room - Sala
   * @param {number} quantity - Cantidad total a transferir
   * @param {number} executedBy - ID de quien ejecuta la transferencia
   */
  async transferCards(fromUserId, toUserId, room, quantity, executedBy) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Verificar inventario del remitente
      const [fromInventory] = await connection.query(
        `SELECT is_gift, quantity FROM user_card_inventory 
         WHERE user_id = ? AND room = ?`,
        [fromUserId, room]
      );

      if (fromInventory.length === 0) {
        throw new Error('Usuario no tiene cartones en esta sala');
      }

      const totalAvailable = fromInventory.reduce((sum, item) => sum + item.quantity, 0);

      if (totalAvailable < quantity) {
        throw new Error(`Solo tiene ${totalAvailable} cartones disponibles, intentó transferir ${quantity}`);
      }

      // Llamar al procedimiento almacenado que maneja la proporción
      await connection.query(
        'CALL sp_transfer_cards(?, ?, ?, ?, ?)',
        [fromUserId, toUserId, room, quantity, executedBy]
      );

      await connection.commit();

      return {
        success: true,
        message: `${quantity} cartones transferidos de usuario ${fromUserId} a ${toUserId}`,
        room: room
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Valida cartones para un sorteo específico (genera serial number)
   * @param {number} playerId - ID del jugador
   * @param {number} gameSessionId - ID de la sesión de juego
   * @param {string} room - Sala
   * @param {number} quantity - Cantidad de cartones a validar
   */
  async validateCards(playerId, gameSessionId, room, quantity) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // 1. Verificar inventario del jugador
      const [inventory] = await connection.query(
        `SELECT is_gift, quantity, purchase_price FROM user_card_inventory 
         WHERE user_id = ? AND room = ? 
         ORDER BY is_gift ASC`,  // Primero los normales, luego regalo
        [playerId, room]
      );

      if (inventory.length === 0) {
        throw new Error('No tienes cartones en esta sala');
      }

      const totalAvailable = inventory.reduce((sum, item) => sum + item.quantity, 0);

      if (totalAvailable < quantity) {
        throw new Error(`Solo tienes ${totalAvailable} cartones disponibles`);
      }

      // 2. Verificar límite del 10% de cartones de regalo
      const [giftPercentageResult] = await connection.query(
        'SELECT fn_get_gift_percentage(?) AS gift_percentage',
        [gameSessionId]
      );

      const currentGiftPercentage = parseFloat(giftPercentageResult[0].gift_percentage || 0);

      // 3. Obtener información de la sesión y precio (JOIN con room_settings)
      const [session] = await connection.query(
        `SELECT gs.room, rs.card_price 
         FROM game_sessions gs
         JOIN room_settings rs ON gs.room = rs.room
         WHERE gs.id = ?`,
        [gameSessionId]
      );

      if (session.length === 0) {
        throw new Error('Sesión de juego no encontrada');
      }

      const cardPrice = MoneyMath.decimal(session[0].card_price || 0);

      // 4. Determinar cuántos cartones de cada tipo validar
      let remainingToValidate = quantity;
      const validatedCards = [];

      for (const invItem of inventory) {
        if (remainingToValidate === 0) break;

        const availableFromThisType = invItem.quantity;
        const toValidateFromThisType = Math.min(availableFromThisType, remainingToValidate);

        // Si son de regalo, verificar límite del 10%
        if (invItem.is_gift === 1) {
          const [sessionStats] = await connection.query(
            `SELECT total_cards_validated FROM game_sessions WHERE id = ?`,
            [gameSessionId]
          );

          const totalValidated = sessionStats[0].total_cards_validated || 0;
          const maxGiftCards = Math.floor(totalValidated * 0.10);

          const [currentGiftCards] = await connection.query(
            `SELECT COUNT(*) AS gift_count FROM validated_cards 
             WHERE game_session_id = ? AND is_gift = 1`,
            [gameSessionId]
          );

          const currentGift = currentGiftCards[0].gift_count;

          if (currentGift + toValidateFromThisType > maxGiftCards) {
            throw new Error(`Límite del 10% de cartones de regalo alcanzado (${currentGift}/${maxGiftCards})`);
          }
        }

        // Generar cartones validados
        for (let i = 0; i < toValidateFromThisType; i++) {
          const serialNumber = await this._generateSerialNumber(gameSessionId, room);
          const gridNumbers = this._generateBingoGrid();

          // Calcular contribución a jackpots (solo cartones pagos)
          const contributedAmount = invItem.is_gift === 0
            ? MoneyMath.toNumber(cardPrice.times(0.70))  // 70% a jackpots
            : 0;

          validatedCards.push({
            serialNumber,
            gridNumbers,
            isGift: invItem.is_gift,
            contributedAmount
          });

          // Insertar cartón validado
          await connection.query(
            `INSERT INTO validated_cards 
             (player_id, game_session_id, room, serial_number, grid_numbers, is_gift, contributed_amount)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              playerId,
              gameSessionId,
              room,
              serialNumber,
              JSON.stringify(gridNumbers),
              invItem.is_gift,
              contributedAmount
            ]
          );

          // Si es cartón pago, distribuir a jackpots
          if (invItem.is_gift === 0) {
            const jackpotLinea = MoneyMath.toNumber(cardPrice.times(0.15));
            const jackpotBingo = MoneyMath.toNumber(cardPrice.times(0.50));
            const jackpotPre40 = MoneyMath.toNumber(cardPrice.times(0.05));

            await connection.query(
              `UPDATE game_sessions 
               SET jackpot_linea = jackpot_linea + ?,
                   jackpot_bingo = jackpot_bingo + ?,
                   jackpot_pre40 = jackpot_pre40 + ?,
                   total_paid_cards = total_paid_cards + 1,
                   total_cards_validated = total_cards_validated + 1
               WHERE id = ?`,
              [jackpotLinea, jackpotBingo, jackpotPre40, gameSessionId]
            );

            // ACTUALIZACIÓN GLOBAL: Incrementar pozo acumulado de la sala (Pre-40)
            await connection.query(
              `UPDATE room_settings 
               SET accumulated_pot_pre40 = accumulated_pot_pre40 + ?
               WHERE room = ?`,
              [jackpotPre40, room]
            );
          } else {
            await connection.query(
              `UPDATE game_sessions 
               SET total_gift_cards = total_gift_cards + 1,
                   total_cards_validated = total_cards_validated + 1
               WHERE id = ?`,
              [gameSessionId]
            );
          }
        }

        // Reducir inventario
        await connection.query(
          `UPDATE user_card_inventory 
           SET quantity = quantity - ?
           WHERE user_id = ? AND room = ? AND is_gift = ?`,
          [toValidateFromThisType, playerId, room, invItem.is_gift]
        );

        // Registrar movimiento
        await connection.query(
          `INSERT INTO card_movements_log 
           (user_id, room, movement_type, quantity, is_gift, reason, executed_by)
           VALUES (?, ?, 'validated', ?, ?, ?, ?)`,
          [
            playerId,
            room,
            toValidateFromThisType,
            invItem.is_gift,
            `Validados para sesión ${gameSessionId}`,
            playerId
          ]
        );

        remainingToValidate -= toValidateFromThisType;
      }

      // Limpiar inventario vacío
      await connection.query(
        `DELETE FROM user_card_inventory WHERE quantity = 0`,
        []
      );

      await connection.commit();

      // Emitir evento Socket.IO para actualizar pozos en tiempo real
      const websocketService = require('./websocketService');
      websocketService.emitPotsUpdate();

      return {
        success: true,
        message: `${quantity} cartones validados para la sesión ${gameSessionId}`,
        validatedCards: validatedCards.map(c => ({
          serialNumber: c.serialNumber,
          grid: c.gridNumbers,
          isGift: c.isGift === 1
        }))
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Genera un número de serie único para un cartón
   * Formato: ROOM-SESSIONID-TIMESTAMP-RANDOM
   */
  async _generateSerialNumber(gameSessionId, room) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const serial = `${room.toUpperCase()}-${gameSessionId}-${timestamp}-${random}`;

    // Verificar que sea único (muy improbable colisión, pero por seguridad)
    const [existing] = await pool.query(
      'SELECT COUNT(*) AS count FROM validated_cards WHERE serial_number = ?',
      [serial]
    );

    if (existing[0].count > 0) {
      // Recursión si hay colisión (muy raro)
      return this._generateSerialNumber(gameSessionId, room);
    }

    return serial;
  }

  /**
   * Genera una grilla de bingo 5x5 (sin validación de duplicados en esta versión)
   */
  _generateBingoGrid() {
    const grid = [];

    // B: 1-15, I: 16-30, N: 31-45, G: 46-60, O: 61-75
    const ranges = [
      [1, 15],   // B
      [16, 30],  // I
      [31, 45],  // N
      [46, 60],  // G
      [61, 75]   // O
    ];

    for (let col = 0; col < 5; col++) {
      const column = [];
      const [min, max] = ranges[col];
      const usedNumbers = new Set();

      for (let row = 0; row < 5; row++) {
        // Centro es FREE SPACE
        if (col === 2 && row === 2) {
          column.push(0);
          continue;
        }

        let num;
        do {
          num = Math.floor(Math.random() * (max - min + 1)) + min;
        } while (usedNumbers.has(num));

        usedNumbers.add(num);
        column.push(num);
      }

      grid.push(column);
    }

    return grid;
  }

  /**
   * Obtiene historial de movimientos de cartones
   */
  async getMovementsLog(userId, limit = 50) {
    const [movements] = await pool.query(
      `SELECT 
         cm.*,
         u1.username AS user_name,
         u2.username AS from_user_name,
         u3.username AS to_user_name,
         u4.username AS executed_by_name
       FROM card_movements_log cm
       LEFT JOIN users u1 ON cm.user_id = u1.id
       LEFT JOIN users u2 ON cm.from_user_id = u2.id
       LEFT JOIN users u3 ON cm.to_user_id = u3.id
       LEFT JOIN users u4 ON cm.executed_by = u4.id
       WHERE cm.user_id = ?
       ORDER BY cm.created_at DESC
       LIMIT ?`,
      [userId, limit]
    );

    return movements;
  }

  /**
   * Obtiene cartones validados de un jugador para una sesión
   */
  async getValidatedCards(playerId, gameSessionId) {
    const [cards] = await pool.query(
      `SELECT 
         id,
         serial_number,
         grid_numbers,
         is_gift,
         contributed_amount,
         validated_at
       FROM validated_cards
       WHERE player_id = ? AND game_session_id = ?
       ORDER BY validated_at ASC`,
      [playerId, gameSessionId]
    );

    return cards.map(card => ({
      ...card,
      grid_numbers: JSON.parse(card.grid_numbers),
      is_gift: card.is_gift === 1
    }));
  }
}

module.exports = new CardInventoryService();
