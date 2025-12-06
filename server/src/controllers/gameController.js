const pool = require('../db');
const gameEngine = require('../services/gameEngine');
const cascadeLogic = require('../services/cascadeLogic');
const gamificationEngine = require('../services/gamification_engine');
const questManager = require('../services/quest_manager');
const rankingEngine = require('../services/ranking_engine');
const notificationService = require('../services/notificationService');
const inventoryService = require('../services/inventoryService');

// COMPRAR CARTÓN - Agregar a session del usuario
exports.buyCard = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cardId, roomType, playDate } = req.body;

    if (!cardId || !roomType || !playDate) {
      return res.status(400).json({ error: 'Parámetros requeridos' });
    }

    // Obtener usuario y su balance
    const [userResult] = await pool.query(
      'SELECT id, balance, parent_id, role FROM users WHERE id = ?',
      [userId]
    );

    if (userResult.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = userResult[0];

    // Obtener cartón y su precio
    const [cardResult] = await pool.query(
      `SELECT id, price, status FROM daily_stock_cards 
       WHERE id = ? AND status = 'available' AND room = ?`,
      [cardId, roomType]
    );

    if (cardResult.length === 0) {
      return res.status(404).json({ error: 'Cartón no disponible' });
    }

    const card = cardResult[0];

    // Validar balance suficiente
    if (user.balance < card.price) {
      return res.status(400).json({ error: 'Balance insuficiente' });
    }

    // Iniciar transacción
    const connection = await pool.getConnection();
    try {
      await connection.query('START TRANSACTION');

      // 1. Marcar cartón como vendido
      await connection.query(
        `UPDATE daily_stock_cards 
         SET status = 'sold', buyer_id = ?, updated_at = NOW()
         WHERE id = ?`,
        [userId, cardId]
      );

      // 2. Descontar del balance del jugador
      await connection.query(
        `UPDATE users SET balance = balance - ? WHERE id = ?`,
        [card.price, userId]
      );

      // 3. Registrar transacción en auditoría
      const { agent_path } = await getAgentPath(userId);
      await connection.query(
        `INSERT INTO audit_revenue (player_id, agent_path, amount, transaction_type)
         VALUES (?, ?, ?, ?)`,
        [userId, JSON.stringify(agent_path), card.price, 'card_purchase']
      );

      // 4. Distribuir comisiones (50% Bingo, 15% Línea, 5% Jackpot, 30% House)
      const bigoAmount = card.price * 0.50;
      const lineaAmount = card.price * 0.15;
      const jackpotAmount = card.price * 0.05;
      // 30% se queda en house (no entra aquí)

      // Actualizar pots de la sesión
      const [sessionResult] = await connection.query(
        `SELECT id FROM game_sessions 
         WHERE room = ? AND status = 'pending' AND play_date = ?
         ORDER BY created_at DESC LIMIT 1`,
        [roomType, playDate]
      );

      if (sessionResult.length > 0) {
        const sessionId = sessionResult[0].id;
        await connection.query(
          `UPDATE game_sessions 
           SET current_pot_bingo = current_pot_bingo + ?,
               current_pot_linea = current_pot_linea + ?,
               current_pot_jackpot = current_pot_jackpot + ?,
               updated_at = NOW()
           WHERE id = ?`,
          [bigoAmount, lineaAmount, jackpotAmount, sessionId]
        );
      }

      await connection.query('COMMIT');

      // ===== GAMIFICACIÓN: Agregar XP al jugador =====
      try {
        const xpResult = await gamificationEngine.addXPToPlayer(userId, card.price);
        
        // Registrar compra en sala para misión "Explorador"
        if (user.role === 'jugador') {
          await questManager.recordRoomPlay(userId, roomType);
        }

        // Si es agente, registrar venta para ranking
        if (user.role === 'agente' && user.parent_id) {
          await rankingEngine.recordSale(user.parent_id, 1, card.price, roomType);
        }

        // Broadcast si hay level-up
        if (xpResult.leveledUp && xpResult.newLevel) {
          const levelNames = {
            1: 'Novato',
            2: 'Cobre',
            3: 'Plata Fina',
            4: 'Oro Puro',
            5: 'Diamante 24K'
          };
          const rankName = levelNames[xpResult.newLevel] || `Nivel ${xpResult.newLevel}`;
          notificationService.broadcastLevelUp(user.username, xpResult.newLevel, rankName);
        }

        res.json({
          success: true,
          message: 'Cartón comprado exitosamente',
          card: {
            id: card.id,
            price: card.price
          },
          gamification: {
            xpAdded: xpResult.xpAdded,
            leveledUp: xpResult.leveledUp,
            newLevel: xpResult.newLevel,
            rewards: xpResult.rewards
          }
        });
      } catch (gamError) {
        console.error('Gamification error (non-critical):', gamError);
        res.json({
          success: true,
          message: 'Cartón comprado exitosamente',
          card: {
            id: card.id,
            price: card.price
          }
        });
      }

    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Buy card error:', error);
    res.status(500).json({ error: 'Error comprando cartón' });
  }
};

// OBTENER CARTONES DEL JUGADOR
exports.getPlayerCards = async (req, res) => {
  try {
    const userId = req.user.id;
    const { roomType, playDate } = req.query;

    let query = `SELECT id, serial_number, grid_numbers, room, price 
                 FROM daily_stock_cards 
                 WHERE buyer_id = ? AND status = 'sold'`;
    const params = [userId];

    if (roomType) {
      query += ` AND room = ?`;
      params.push(roomType);
    }

    if (playDate) {
      query += ` AND play_date = ?`;
      params.push(playDate);
    }

    query += ` ORDER BY created_at DESC`;

    const [result] = await pool.query(query, params);

    res.json({
      cards: result,
      total: result.length
    });
  } catch (error) {
    console.error('Get player cards error:', error);
    res.status(500).json({ error: 'Error obteniendo cartones' });
  }
};

// TERMINAR PARTIDA - Detectar ganadores y distribuir premios
exports.finishSession = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID requerido' });
    }

    // Obtener sesión
    const [sessionResult] = await pool.query(
      `SELECT id, room, current_pot_bingo, current_pot_linea, 
              current_pot_jackpot, is_preventa FROM game_sessions WHERE id = ?`,
      [sessionId]
    );

    if (sessionResult.length === 0) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    const session = sessionResult[0];

    // Ejecutar game engine (sorteo y detección de ganadores)
    const gameResult = await gameEngine.executeGame(session);

    // Procesar cascada de jackpot si es necesario
    if (gameResult.jackpotWinner && gameResult.boleaNumber > 40) {
      await cascadeLogic.transferJackpot(sessionId, session.room);
    }

    // Registrar premios
    for (const winner of gameResult.winners) {
      const { userId, amount, type } = winner;

      const connection = await pool.getConnection();
      try {
        await connection.query('START TRANSACTION');

        // Acreditar al jugador
        await connection.query(
          `UPDATE users SET balance = balance + ? WHERE id = ?`,
          [amount, userId]
        );

        // Registrar claim
        await connection.query(
          `INSERT INTO prize_claims (user_id, amount, status)
           VALUES (?, ?, 'completed')`,
          [userId, amount]
        );

        // Auditoría
        await connection.query(
          `INSERT INTO audit_revenue (player_id, amount, transaction_type)
           VALUES (?, ?, ?)`,
          [userId, amount, `prize_${type}`]
        );

        await connection.query('COMMIT');

        // Broadcast de big win a todos los jugadores
        const [userRes] = await pool.query('SELECT username FROM users WHERE id = ?', [userId]);
        if (userRes.length > 0) {
          const username = userRes[0].username;
          notificationService.broadcastBigWin(username, amount, session.room, type);
        }

      } catch (error) {
        await connection.query('ROLLBACK');
        throw error;
      } finally {
        connection.release();
      }
    }

    // Marcar sesión como finalizada
    await pool.query(
      `UPDATE game_sessions SET status = 'completed', updated_at = NOW()
       WHERE id = ?`,
      [sessionId]
    );

    res.json({
      success: true,
      gameResult,
      winners: gameResult.winners
    });
  } catch (error) {
    console.error('Finish session error:', error);
    res.status(500).json({ error: 'Error finalizando sesión' });
  }
};

// OBTENER ESTADO DE SESIÓN
exports.getSessionStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const [result] = await pool.query(
      `SELECT id, room, status, current_pot_bingo, current_pot_linea, 
              current_pot_jackpot, is_preventa FROM game_sessions WHERE id = ?`,
      [sessionId]
    );

    if (result.length === 0) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    res.json({ session: result[0] });
  } catch (error) {
    console.error('Get session status error:', error);
    res.status(500).json({ error: 'Error obteniendo estado de sesión' });
  }
};

// OBTENER ÚLTIMAS SESIONES DISPONIBLES
exports.getActiveSessions = async (req, res) => {
  try {
    const { roomType } = req.query;

    let query = `SELECT id, room, status, current_pot_bingo, current_pot_linea, 
                        current_pot_jackpot, start_time 
                 FROM game_sessions 
                 WHERE status IN ('pending', 'active')`;
    const params = [];

    if (roomType) {
      query += ` AND room = ?`;
      params.push(roomType);
    }

    query += ` ORDER BY start_time DESC LIMIT 10`;

    const [result] = await pool.query(query, params);

    res.json({ sessions: result });
  } catch (error) {
    console.error('Get active sessions error:', error);
    res.status(500).json({ error: 'Error obteniendo sesiones' });
  }
};

// COMPRAR CARTÓN GRATIS - Sala Starter (Free-to-Play)
exports.buyCardFree = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cardId, playDate } = req.body;

    if (!cardId || !playDate) {
      return res.status(400).json({ error: 'Parámetros requeridos' });
    }

    // Verificar que sea sala STARTER
    const [cardResult] = await pool.query(
      `SELECT id, price, status, room FROM daily_stock_cards 
       WHERE id = ? AND status = 'available'`,
      [cardId]
    );

    if (cardResult.length === 0) {
      return res.status(404).json({ error: 'Cartón no disponible' });
    }

    const card = cardResult[0];

    if (card.room !== 'free_starter') {
      return res.status(400).json({ error: 'Este cartón no es de sala gratis' });
    }

    // Verificar límite de 20 cartones
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as count FROM daily_stock_cards 
       WHERE buyer_id = ? AND play_date = ? AND room = 'free_starter'`,
      [userId, playDate]
    );

    if (parseInt(countResult[0].count) >= 20) {
      return res.status(400).json({ error: 'Alcanzaste el límite de 20 cartones en Sala Starter' });
    }

    // Comprar cartón (sin restar balance)
    const connection = await pool.getConnection();
    try {
      await connection.query('START TRANSACTION');

      // 1. Marcar cartón como vendido
      await connection.query(
        `UPDATE daily_stock_cards 
         SET status = 'sold', buyer_id = ?, updated_at = NOW()
         WHERE id = ?`,
        [userId, cardId]
      );

      // 2. Log en auditoría
      await connection.query(
        `INSERT INTO audit_revenue (player_id, amount, transaction_type)
         VALUES (?, ?, ?)`,
        [userId, 0, 'free_starter_card']
      );

      await connection.query('COMMIT');

      res.json({
        success: true,
        message: 'Cartón adquirido gratuitamente',
        card: {
          id: card.id,
          price: 0
        }
      });

    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ buyCardFree error:', error);
    res.status(500).json({ error: 'Error comprando cartón gratis' });
  }
};

// PROCESAR GANADOR EN SALA STARTER - Drop de NFT
exports.claimFreePrize = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId, type } = req.body;

    if (!sessionId || !type) {
      return res.status(400).json({ error: 'Parámetros requeridos' });
    }

    // Verificar que es sala STARTER
    const [sessionResult] = await pool.query(
      `SELECT id, room FROM game_sessions WHERE id = ?`,
      [sessionId]
    );

    if (sessionResult.length === 0) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    if (sessionResult[0].room !== 'free_starter') {
      return res.status(400).json({ error: 'Esta sesión no es Sala Starter' });
    }

    // Drop aleatorio de NFT
    const item = await inventoryService.dropRandomItem(userId);

    if (!item) {
      return res.status(500).json({ error: 'Error al procesar el premio' });
    }

    res.json({
      success: true,
      message: `¡Ganaste un NFT: ${item.name}!`,
      item: {
        id: item.id,
        name: item.name,
        type: item.type,
        rarity: item.rarity,
        description: item.description
      }
    });
  } catch (error) {
    console.error('❌ claimFreePrize error:', error);
    res.status(500).json({ error: 'Error procesando premio' });
  }
};

// HELPER: Obtener cadena de agentes (agent_path)
async function getAgentPath(userId) {
  const [result] = await pool.query(
    `WITH RECURSIVE agent_chain AS (
       SELECT id, parent_id, role, 1 as depth
       FROM users WHERE id = ?
       UNION ALL
       SELECT u.id, u.parent_id, u.role, ac.depth + 1
       FROM users u
       INNER JOIN agent_chain ac ON u.id = ac.parent_id
     )
     SELECT JSON_ARRAYAGG(JSON_OBJECT('userId', id, 'role', role)) as agent_path
     FROM agent_chain`,
    [userId]
  );

  return result[0];
}

/**
 * end_free_game: Procesar premio cuando termina partida Sala Starter (19:00)
 * 
 * LÍNEA: Skill Visual Aleatorio (Skin/Marco/Efecto)
 * BINGO: Skill Legendaria + 1 Ticket Sala Bronce
 * 
 * Versión: 1.3.0
 */
exports.end_free_game = async (req, res) => {
  try {
    const userId = req.user.id;
    const { gameSessionId, winType } = req.body;
    // winType: 'linea' | 'bingo'

    if (!gameSessionId || !winType) {
      return res.status(400).json({
        success: false,
        message: 'gameSessionId y winType son requeridos'
      });
    }

    const connection = await pool.getConnection();
    try {
      await connection.query('START TRANSACTION');

      // ====== Validar que sea Sala Starter (19:00) ======
      const [sessionResult] = await connection.query(
        `SELECT id, room, status FROM game_sessions 
         WHERE id = ? AND room = 'free_starter'`,
        [gameSessionId]
      );

      if (sessionResult.length === 0) {
        throw new Error('Sesión no válida para premios gratis');
      }

      const session = sessionResult[0];

      let rewardMessage = '';
      let rewardData = {};

      if (winType === 'linea') {
        // ======= GANADOR DE LÍNEA =======
        // Obtener skill visual aleatorio (no legendario)
        const [skinResult] = await connection.query(
          `SELECT * FROM cosmetic_items 
           WHERE type IN ('avatar_frame', 'card_skin', 'chat_effect')
           AND is_free_available = TRUE
           AND rarity != 'legendary'
           AND is_consumable = FALSE
           ORDER BY RAND() 
           LIMIT 1`
        );

        if (skinResult.length === 0) {
          throw new Error('No hay skins disponibles');
        }

        const skin = skinResult[0];
        const skinId = skin.id;
        const skinName = skin.name;
        const skinType = skin.type;

        // Insertar en inventario
        await connection.query(
          `INSERT INTO user_inventory (user_id, item_id, equipped, is_consumable_type)
           VALUES (?, ?, FALSE, FALSE)
           ON DUPLICATE KEY UPDATE user_id = user_id`,
          [userId, skinId]
        );

        rewardMessage = `¡Ganaste un nuevo ${skinType === 'avatar_frame' ? 'Marco' : 'Skin'}!`;
        rewardData = {
          type: 'skin',
          name: skinName,
          rarity: skin.rarity,
          description: `${skinType} ${skin.rarity}`
        };

        // Logging
        await connection.query(
          `INSERT INTO game_events 
           (user_id, session_id, event_type, details)
           VALUES (?, ?, 'win_linea_free', ?)`,
          [userId, gameSessionId, JSON.stringify(rewardData)]
        );

        console.log(`✅ [end_free_game] LÍNEA - Usuario ${userId} ganó: ${skinName}`);

      } else if (winType === 'bingo') {
        // ======= GANADOR DE BINGO =======
        // 1. Asignar Skill Legendaria
        const [legendaryResult] = await connection.query(
          `SELECT * FROM cosmetic_items 
           WHERE type IN ('avatar_frame', 'card_skin', 'chat_effect')
           AND rarity = 'legendary'
           AND is_consumable = FALSE
           AND is_free_available = TRUE
           ORDER BY RAND() 
           LIMIT 1`
        );

        let legendaryName = null;
        if (legendaryResult.length > 0) {
          const legendary = legendaryResult[0];
          
          await connection.query(
            `INSERT INTO user_inventory (user_id, item_id, equipped, is_consumable_type)
             VALUES (?, ?, FALSE, FALSE)
             ON DUPLICATE KEY UPDATE user_id = user_id`,
            [userId, legendary.id]
          );

          legendaryName = legendary.name;
        }

        // 2. Asignar Ticket Sala Bronce (Consumible)
        const [ticketResult] = await connection.query(
          `SELECT * FROM cosmetic_items 
           WHERE type = 'ticket' 
           AND ticket_room = 'bronce'
           LIMIT 1`
        );

        let ticketName = null;
        if (ticketResult.length > 0) {
          const ticket = ticketResult[0];
          const ticketId = ticket.id;
          ticketName = ticket.name;

          // Insertar o incrementar cantidad
          await connection.query(
            `INSERT INTO user_inventory (user_id, item_id, quantity, is_consumable_type)
             VALUES (?, ?, 1, TRUE)
             ON DUPLICATE KEY UPDATE quantity = quantity + 1`,
            [userId, ticketId]
          );
        }

        rewardMessage = `🎉 ¡BINGO! Ganaste una Skin Legendaria + 1 Cartón Gratis para Sala Bronce`;
        rewardData = {
          type: 'bingo_combo',
          items: [
            { type: 'skin_legendary', name: legendaryName || 'Legendaria' },
            { type: 'ticket_bronce', name: ticketName || 'Cartón Gratis', quantity: 1 }
          ]
        };

        // Logging
        await connection.query(
          `INSERT INTO game_events 
           (user_id, session_id, event_type, details)
           VALUES (?, ?, 'win_bingo_free', ?)`,
          [userId, gameSessionId, JSON.stringify(rewardData)]
        );

        console.log(`✅ [end_free_game] BINGO - Usuario ${userId} ganó: ${legendaryName} + ${ticketName}`);
      }

      await connection.query('COMMIT');

      // TODO: Notificación en tiempo real (Socket.IO si está disponible)
      // if (io) {
      //   io.to(`user_${userId}`).emit('prize_claimed', {
      //     success: true,
      //     message: rewardMessage,
      //     reward: rewardData
      //   });
      // }

      res.json({
        success: true,
        message: rewardMessage,
        reward: rewardData
      });

    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Error en end_free_game:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};
