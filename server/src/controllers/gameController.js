const pool = require('../db');
const gameEngine = require('../services/gameEngine');
const cascadeLogic = require('../services/cascadeLogic');
const gamificationEngine = require('../services/gamification_engine');
const questManager = require('../services/quest_manager');
const rankingEngine = require('../services/ranking_engine');
const notificationService = require('../services/notificationService');
const inventoryService = require('../services/inventoryService');
const CardAnalyzer = require('../services/cardAnalyzer');
const cardInventoryService = require('../services/cardInventoryService');
const websocketService = require('../services/websocketService');

// COMPRAR CARTÓN - Agregar a session del usuario
exports.buyCard = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cardId, roomType, playDate } = req.body;

    if (!cardId || !roomType || !playDate) {
      return res.status(400).json({ error: 'Parámetros requeridos' });
    }

    // ====== VERIFICACIÓN T-5: Ventas cerradas 5 minutos antes del sorteo ======
    const [sessionCheck] = await pool.query(
      `SELECT start_time FROM game_sessions 
       WHERE room = ? AND status = 'pending'
       ORDER BY start_time ASC LIMIT 1`,
      [roomType]
    );
    
    if (sessionCheck.length > 0) {
      const startTime = new Date(sessionCheck[0].start_time);
      const now = new Date();
      const minutesUntilStart = (startTime - now) / (1000 * 60);
      
      if (minutesUntilStart >= 0 && minutesUntilStart <= 5) {
        const minutesLeft = Math.ceil(minutesUntilStart);
        return res.status(400).json({ 
          error: `Ventas cerradas. El sorteo comienza en ${minutesLeft} minuto${minutesLeft !== 1 ? 's' : ''}. Espera al próximo sorteo.`,
          code: 'SALES_CLOSED'
        });
      }
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

      // ===== EMITIR ACTUALIZACIÓN DE POZOS EN VIVO =====
      websocketService.emitPotsUpdate();

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

    // Obtener la sala de esta sesión para limpieza
    const [sessionData] = await pool.query(
      'SELECT room FROM game_sessions WHERE id = ?',
      [sessionId]
    );
    
    // LIMPIEZA: Eliminar cartones no asignados a ninguna sesión de esta sala
    if (sessionData.length > 0) {
      const room = sessionData[0].room;
      const [cleanupResult] = await pool.query(`
        DELETE FROM bingo_cards_pool 
        WHERE room = ? 
        AND status = 'selected' 
        AND game_session_id IS NULL
      `, [room]);
      
      console.log(`[GameController] 🧹 Limpieza post-finalización sala ${room}: ${cleanupResult.affectedRows} cartones huérfanos eliminados`);
    }

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

// ============================================
// CANTAR LÍNEA (Salas Monetizadas)
// ============================================
exports.claimLine = async (req, res) => {
  try {
    const { gameSessionId, cardId, lineType } = req.body;
    const userId = req.user.id;

    // Validar parámetros
    if (!gameSessionId || !cardId || !lineType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Parámetros requeridos: gameSessionId, cardId, lineType' 
      });
    }

    const validLineTypes = ['horizontal_1', 'horizontal_2', 'horizontal_3', 'vertical_1', 'vertical_2', 'vertical_3', 'vertical_4', 'vertical_5', 'diagonal_1', 'diagonal_2', 'four_corners'];
    if (!validLineTypes.includes(lineType)) {
      return res.status(400).json({ 
        success: false, 
        message: `lineType inválido. Opciones: ${validLineTypes.join(', ')}` 
      });
    }

    // 1. Obtener sesión de juego
    const [sessions] = await pool.query(
      `SELECT * FROM game_sessions WHERE id = ?`,
      [gameSessionId]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ success: false, message: 'Sesión no encontrada' });
    }

    const session = sessions[0];

    // Solo permitir en salas monetizadas (Bronce, Plata, Oro)
    const monetizedRooms = ['Bronce', 'Plata', 'Oro'];
    const isMonetized = monetizedRooms.includes(session.room);
    
    if (!isMonetized) {
      return res.status(400).json({ 
        success: false, 
        message: 'Solo se puede cantar línea en salas monetizadas (Bronce, Plata, Oro)' 
      });
    }

    // Verificar que la sesión esté activa
    if (session.status !== 'active') {
      return res.status(400).json({ 
        success: false, 
        message: `Sesión no está activa (estado actual: ${session.status})` 
      });
    }

    // 2. Obtener cartón del usuario
    const [cards] = await pool.query(
      `SELECT * FROM bingo_cards 
       WHERE id = ? AND user_id = ? AND session_id = ?`,
      [cardId, userId, gameSessionId]
    );

    if (cards.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cartón no encontrado o no pertenece al usuario' 
      });
    }

    const card = cards[0];

    // Obtener números del cartón
    let cardNumbers;
    if (card.numbers) {
      cardNumbers = typeof card.numbers === 'string' ? JSON.parse(card.numbers) : card.numbers;
    } else if (card.grid_data) {
      const gridData = typeof card.grid_data === 'string' ? JSON.parse(card.grid_data) : card.grid_data;
      cardNumbers = convertGridDataToMatrix(gridData);
    } else {
      return res.status(500).json({ success: false, message: 'Cartón sin datos' });
    }

    // 3. Obtener números cantados en esta sesión
    const [balls] = await pool.query(
      `SELECT ball_number FROM game_session_balls 
       WHERE game_session_id = ? 
       ORDER BY draw_order`,
      [gameSessionId]
    );

    const calledNumbers = balls.map(b => b.ball_number);

    // 4. Validar línea
    const validation = validateLine(cardNumbers, calledNumbers, lineType);

    if (!validation.isValid) {
      return res.status(400).json({ 
        success: false, 
        message: validation.message || 'Línea inválida - verifica los números' 
      });
    }

    // 5. Verificar que no haya ganado ya esta línea
    const [existing] = await pool.query(
      `SELECT id FROM game_winners 
       WHERE game_session_id = ? AND user_id = ? AND card_id = ? 
         AND prize_type = 'linea' AND line_type = ?`,
      [gameSessionId, userId, cardId, lineType]
    );

    if (existing.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ya cantaste esta línea' 
      });
    }

    // 6. Registrar ganador
    const prizeAmount = session.line_prize || 2500;

    const [insertResult] = await pool.query(
      `INSERT INTO game_winners 
       (game_session_id, user_id, card_id, prize_type, prize_amount, line_type, winning_numbers, verified) 
       VALUES (?, ?, ?, 'linea', ?, ?, ?, TRUE)`,
      [gameSessionId, userId, cardId, prizeAmount, lineType, JSON.stringify(validation.winningNumbers)]
    );

    // 7. Emitir eventos Socket.IO
    const io = req.app.get('io');
    const winner = { 
      id: userId, 
      username: req.user.username 
    };

    const { notifyLineWinner } = require('../socket/winnerEvents');
    notifyLineWinner(io, session.room_id, winner, prizeAmount, lineType);

    res.json({ 
      success: true, 
      prizeAmount,
      lineType,
      winningNumbers: validation.winningNumbers,
      message: `¡Línea ${lineType} válida! Ganaste $${prizeAmount.toLocaleString()}` 
    });

  } catch (error) {
    console.error('Error en claimLine:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// CANTAR BINGO (Salas Monetizadas)
// ============================================
exports.claimBingo = async (req, res) => {
  try {
    const { gameSessionId, cardId } = req.body;
    const userId = req.user.id;

    // Validar parámetros
    if (!gameSessionId || !cardId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Parámetros requeridos: gameSessionId, cardId' 
      });
    }

    // 1. Obtener sesión de juego
    const [sessions] = await pool.query(
      `SELECT * FROM game_sessions WHERE id = ?`,
      [gameSessionId]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ success: false, message: 'Sesión no encontrada' });
    }

    const session = sessions[0];

    // Solo permitir en salas monetizadas (Bronce, Plata, Oro)
    const monetizedRooms = ['Bronce', 'Plata', 'Oro'];
    const isMonetized = monetizedRooms.includes(session.room);
    
    if (!isMonetized) {
      return res.status(400).json({ 
        success: false, 
        message: 'Solo se puede cantar BINGO en salas monetizadas' 
      });
    }

    // Verificar que la sesión esté activa
    if (session.status !== 'active') {
      return res.status(400).json({ 
        success: false, 
        message: `Sesión no está activa (estado actual: ${session.status})` 
      });
    }

    // 2. Obtener cartón del usuario
    const [cards] = await pool.query(
      `SELECT * FROM bingo_cards 
       WHERE id = ? AND user_id = ? AND session_id = ?`,
      [cardId, userId, gameSessionId]
    );

    if (cards.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cartón no encontrado o no pertenece al usuario' 
      });
    }

    const card = cards[0];

    // Obtener números del cartón
    let cardNumbers;
    if (card.numbers) {
      cardNumbers = typeof card.numbers === 'string' ? JSON.parse(card.numbers) : card.numbers;
    } else if (card.grid_data) {
      const gridData = typeof card.grid_data === 'string' ? JSON.parse(card.grid_data) : card.grid_data;
      cardNumbers = convertGridDataToMatrix(gridData);
    } else {
      return res.status(500).json({ success: false, message: 'Cartón sin datos' });
    }

    // 3. Obtener números cantados
    const [balls] = await pool.query(
      `SELECT ball_number FROM game_session_balls 
       WHERE game_session_id = ? 
       ORDER BY draw_order`,
      [gameSessionId]
    );

    const calledNumbers = balls.map(b => b.ball_number);

    // 4. Validar BINGO completo (24 números, excluyendo el centro FREE)
    const validation = validateBingo(cardNumbers, calledNumbers);

    if (!validation.isValid) {
      return res.status(400).json({ 
        success: false, 
        message: validation.message || 'BINGO inválido - faltan números' 
      });
    }

    // 5. Verificar que no haya ganado ya BINGO
    const [existing] = await pool.query(
      `SELECT id FROM game_winners 
       WHERE game_session_id = ? AND user_id = ? AND card_id = ? AND prize_type = 'bingo'`,
      [gameSessionId, userId, cardId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ya cantaste BINGO con este cartón' 
      });
    }

    // 6. Registrar ganador de BINGO
    const prizeAmount = session.bingo_prize || 25000;

    await pool.query(
      `INSERT INTO game_winners 
       (game_session_id, user_id, card_id, prize_type, prize_amount, winning_numbers, verified) 
       VALUES (?, ?, ?, 'bingo', ?, ?, TRUE)`,
      [gameSessionId, userId, cardId, prizeAmount, JSON.stringify(validation.winningNumbers)]
    );

    // 7. Finalizar sesión (primer BINGO termina el juego)
    await pool.query(
      `UPDATE game_sessions SET status = 'completed', updated_at = NOW() WHERE id = ?`,
      [gameSessionId]
    );

    // LIMPIEZA: Eliminar cartones no asignados a ninguna sesión de esta sala
    const [cleanupResult] = await pool.query(`
      DELETE FROM bingo_cards_pool 
      WHERE room = ? 
      AND status = 'selected' 
      AND game_session_id IS NULL
    `, [session.room]);
    
    console.log(`[GameController] 🧹 Limpieza BINGO sala ${session.room}: ${cleanupResult.affectedRows} cartones huérfanos eliminados`);

    // 8. Emitir eventos Socket.IO
    const io = req.app.get('io');
    const winner = { 
      id: userId, 
      username: req.user.username 
    };

    const { notifyBingoWinner, showPaymentForms } = require('../socket/winnerEvents');
    
    // Notificar BINGO ganador
    notifyBingoWinner(io, session.room_id, winner, prizeAmount, gameSessionId);

    // Obtener TODOS los ganadores de esta sesión (líneas + bingo)
    setTimeout(async () => {
      const winners = await getGameWinners(gameSessionId);
      showPaymentForms(io, gameSessionId, winners);
    }, 5000); // Esperar 5 segundos antes de mostrar formularios

    res.json({ 
      success: true, 
      prizeAmount,
      winningNumbers: validation.winningNumbers,
      gameEnded: true,
      message: `¡BINGO! Ganaste $${prizeAmount.toLocaleString()}` 
    });

  } catch (error) {
    console.error('Error en claimBingo:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// FUNCIONES AUXILIARES DE VALIDACIÓN
// ============================================

/**
 * Valida si una línea es correcta
 * @param {Array} cardNumbers - Matriz 5x5 de números del cartón
 * @param {Array} calledNumbers - Números que han sido cantados
 * @param {String} lineType - Tipo de línea a validar
 * @returns {Object} { isValid, message, winningNumbers }
 */
function validateLine(cardNumbers, calledNumbers, lineType) {
  const positions = [];
  
  // Definir posiciones según tipo de línea
  switch(lineType) {
    case 'horizontal_1':
      positions.push([0,0], [0,1], [0,2], [0,3], [0,4]);
      break;
    case 'horizontal_2':
      positions.push([1,0], [1,1], [1,2], [1,3], [1,4]);
      break;
    case 'horizontal_3':
      positions.push([2,0], [2,1], [2,2], [2,3], [2,4]);
      break;
    case 'horizontal_4':
      positions.push([3,0], [3,1], [3,2], [3,3], [3,4]);
      break;
    case 'horizontal_5':
      positions.push([4,0], [4,1], [4,2], [4,3], [4,4]);
      break;
    case 'vertical_1':
      positions.push([0,0], [1,0], [2,0], [3,0], [4,0]);
      break;
    case 'vertical_2':
      positions.push([0,1], [1,1], [2,1], [3,1], [4,1]);
      break;
    case 'vertical_3':
      positions.push([0,2], [1,2], [2,2], [3,2], [4,2]);
      break;
    case 'vertical_4':
      positions.push([0,3], [1,3], [2,3], [3,3], [4,3]);
      break;
    case 'vertical_5':
      positions.push([0,4], [1,4], [2,4], [3,4], [4,4]);
      break;
    case 'diagonal_1':
      positions.push([0,0], [1,1], [2,2], [3,3], [4,4]);
      break;
    case 'diagonal_2':
      positions.push([0,4], [1,3], [2,2], [3,1], [4,0]);
      break;
    case 'four_corners':
      positions.push([0,0], [0,4], [4,0], [4,4]);
      break;
    default:
      return { isValid: false, message: 'Tipo de línea no reconocido' };
  }

  // Verificar cada número en las posiciones
  const winningNumbers = [];
  const missingNumbers = [];

  for (const [row, col] of positions) {
    const number = cardNumbers[row][col];
    
    // El centro (2,2) es FREE - siempre cuenta
    if (row === 2 && col === 2) {
      winningNumbers.push('FREE');
      continue;
    }

    if (calledNumbers.includes(number)) {
      winningNumbers.push(number);
    } else {
      missingNumbers.push(number);
    }
  }

  const isValid = missingNumbers.length === 0;

  return {
    isValid,
    winningNumbers,
    missingNumbers,
    message: isValid 
      ? `Línea ${lineType} válida` 
      : `Faltan números: ${missingNumbers.join(', ')}`
  };
}

/**
 * Valida si un cartón tiene BINGO completo
 * @param {Array} cardNumbers - Matriz 5x5 de números del cartón
 * @param {Array} calledNumbers - Números que han sido cantados
 * @returns {Object} { isValid, message, winningNumbers }
 */
function validateBingo(cardNumbers, calledNumbers) {
  const winningNumbers = [];
  const missingNumbers = [];

  // Recorrer toda la matriz 5x5
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const number = cardNumbers[row][col];

      // El centro (2,2) es FREE - siempre cuenta
      if (row === 2 && col === 2) {
        winningNumbers.push('FREE');
        continue;
      }

      if (calledNumbers.includes(number)) {
        winningNumbers.push(number);
      } else {
        missingNumbers.push(number);
      }
    }
  }

  const isValid = missingNumbers.length === 0;

  return {
    isValid,
    winningNumbers,
    missingNumbers,
    totalMarked: winningNumbers.length,
    totalNeeded: 24, // 25 casillas - 1 FREE
    message: isValid 
      ? 'BINGO completo' 
      : `Faltan ${missingNumbers.length} números: ${missingNumbers.slice(0, 5).join(', ')}${missingNumbers.length > 5 ? '...' : ''}`
  };
}

/**
 * Obtiene todos los ganadores de una sesión agrupados por usuario
 * @param {Number} gameSessionId 
 * @returns {Array} Array de objetos con userId, username, prizes
 */
async function getGameWinners(gameSessionId) {
  const [winners] = await pool.query(
    `SELECT 
       gw.user_id,
       u.username,
       gw.prize_type,
       gw.prize_amount
     FROM game_winners gw
     JOIN users u ON gw.user_id = u.id
     WHERE gw.game_session_id = ?
     ORDER BY gw.claimed_at`,
    [gameSessionId]
  );

  // Agrupar premios por usuario
  const grouped = {};
  winners.forEach(w => {
    if (!grouped[w.user_id]) {
      grouped[w.user_id] = {
        userId: w.user_id,
        username: w.username,
        prizes: []
      };
    }
    grouped[w.user_id].prizes.push({
      type: w.prize_type,
      amount: parseFloat(w.prize_amount)
    });
  });

  return Object.values(grouped);
}

/**
 * Convierte grid_data (formato actual) a matriz 5x5
 * @param {Object|Array} gridData - Datos del cartón
 * @returns {Array} Matriz 5x5 de números
 */
function convertGridDataToMatrix(gridData) {
  // Si grid_data ya es una matriz 5x5, devolverla directamente
  if (Array.isArray(gridData) && gridData.length === 5) {
    return gridData;
  }

  // Si es un objeto con columnas B, I, N, G, O
  if (typeof gridData === 'object' && gridData.B && gridData.I && gridData.N && gridData.G && gridData.O) {
    // Transponer: cada letra es una COLUMNA, no una fila
    const matrix = [];
    for (let row = 0; row < 5; row++) {
      matrix.push([
        gridData.B[row],
        gridData.I[row],
        gridData.N[row],
        gridData.G[row],
        gridData.O[row]
      ]);
    }
    return matrix;
  }

  // Si es un array plano de 25 números
  if (Array.isArray(gridData) && gridData.length === 25) {
    const matrix = [];
    for (let i = 0; i < 5; i++) {
      matrix.push(gridData.slice(i * 5, (i + 1) * 5));
    }
    return matrix;
  }

  // Por defecto, devolver matriz vacía
  console.warn('Formato de grid_data no reconocido:', gridData);
  return [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0]
  ];
}

/**
 * GET /api/game/my-cards-analysis/:gameSessionId
 * Analiza y ordena los cartones del usuario en tiempo real
 * Devuelve:
 * - Cartones ordenados por progreso
 * - Alertas: "4 cartones a 2 números de línea"
 * - Configuración para vista apilada
 */
exports.getMyCardsAnalysis = async (req, res) => {
  try {
    const { gameSessionId } = req.params;
    const userId = req.user.id;

    // Obtener cartones del usuario en esta sesión
    const [cards] = await pool.query(
      `SELECT * FROM bingo_cards 
       WHERE user_id = ? AND session_id = ? AND status = 'active'
       ORDER BY id ASC`,
      [userId, gameSessionId]
    );

    if (cards.length === 0) {
      return res.json({
        success: true,
        cards: [],
        alerts: [],
        summary: {
          totalCards: 0,
          totalMarked: 0,
          averageProgress: 0
        }
      });
    }

    // Obtener números cantados en la sesión
    const [balls] = await pool.query(
      `SELECT ball_number FROM game_session_balls 
       WHERE game_session_id = ? 
       ORDER BY draw_order`,
      [gameSessionId]
    );

    const calledNumbers = balls.map(b => b.ball_number);

    // Analizar cartones con CardAnalyzer
    const analysis = CardAnalyzer.analyzeUserCards(cards, calledNumbers);

    // Generar vista apilada
    const stackedCards = CardAnalyzer.generateStackedView(analysis.cards);

    res.json({
      success: true,
      cards: stackedCards,
      alerts: analysis.alerts,
      summary: analysis.summary,
      meta: {
        gameSessionId: parseInt(gameSessionId),
        totalCards: analysis.totalCards,
        ballsDrawn: calledNumbers.length,
        lastBall: calledNumbers[calledNumbers.length - 1] || null
      }
    });

  } catch (error) {
    console.error('[GameController] Error en análisis de cartones:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * POST /api/game/validate-cards
 * Valida cartones del inventario para una sesión de juego específica
 * - Genera número de serie único por cartón
 * - Verifica límite del 10% de cartones de regalo
 * - Distribuye a jackpots si es cartón pago (15% línea, 50% bingo, 5% pre-40)
 */
exports.validateCardsForSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { game_session_id, room, quantity } = req.body;

    // Validaciones
    if (!game_session_id || !room || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: game_session_id, room, quantity'
      });
    }

    if (!['bronce', 'plata', 'oro'].includes(room)) {
      return res.status(400).json({
        success: false,
        message: 'Sala inválida. Debe ser: bronce, plata u oro'
      });
    }

    if (quantity <= 0 || quantity > 20) {
      return res.status(400).json({
        success: false,
        message: 'La cantidad debe ser entre 1 y 20 cartones'
      });
    }

    // Verificar que la sesión existe y está pendiente
    const [session] = await pool.query(
      `SELECT id, status, room, play_date FROM game_sessions WHERE id = ?`,
      [game_session_id]
    );

    if (session.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sesión de juego no encontrada'
      });
    }

    if (session[0].status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `La sesión está en estado: ${session[0].status}. Solo se pueden validar cartones en sesiones pendientes`
      });
    }

    if (session[0].room !== room) {
      return res.status(400).json({
        success: false,
        message: `La sesión es de sala ${session[0].room}, no ${room}`
      });
    }

    // Validar cartones usando el servicio
    const result = await cardInventoryService.validateCards(
      userId,
      game_session_id,
      room,
      quantity
    );

    res.json(result);

  } catch (error) {
    console.error('[GameController] Error validando cartones:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error validando cartones'
    });
  }
};

/**
 * GET /api/game/my-validated-cards/:sessionId
 * Obtiene los cartones validados del jugador para una sesión específica
 */
exports.getMyValidatedCards = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'session_id es requerido'
      });
    }

    const cards = await cardInventoryService.getValidatedCards(
      userId,
      parseInt(sessionId)
    );

    res.json({
      success: true,
      game_session_id: parseInt(sessionId),
      total_cards: cards.length,
      cards: cards
    });

  } catch (error) {
    console.error('[GameController] Error obteniendo cartones validados:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error obteniendo cartones validados'
    });
  }
};

/**
 * GET /api/game/my-inventory
 * Obtiene el inventario de cartones del jugador (vista jugador - solo totales)
 */
exports.getMyCardInventory = async (req, res) => {
  try {
    const userId = req.user.id;

    const inventory = await cardInventoryService.getInventory(
      userId,
      false  // isSuperAdmin = false
    );

    res.json({
      success: true,
      user_id: userId,
      inventory: inventory
    });

  } catch (error) {
    console.error('[GameController] Error obteniendo inventario:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error obteniendo inventario'
    });
  }
};

/**
 * VERIFICAR ESTADO DE VENTAS PARA UNA SALA
 * Retorna si las ventas están abiertas o cerradas (5 min antes del sorteo)
 */
exports.getSalesStatus = async (req, res) => {
  try {
    const { room } = req.params;
    
    if (!room) {
      return res.status(400).json({ error: 'Parámetro room requerido' });
    }

    // Buscar próxima sesión pendiente para esta sala
    const [sessions] = await pool.query(
      `SELECT id, start_time, status FROM game_sessions 
       WHERE room = ? AND status IN ('pending', 'active')
       ORDER BY start_time ASC LIMIT 1`,
      [room]
    );

    if (sessions.length === 0) {
      // No hay sesión programada - ventas cerradas
      return res.json({
        salesOpen: false,
        reason: 'NO_SESSION',
        message: 'No hay sorteo programado',
        nextSession: null
      });
    }

    const session = sessions[0];
    const startTime = new Date(session.start_time);
    const now = new Date();
    const minutesUntilStart = (startTime - now) / (1000 * 60);

    // Si el sorteo ya está activo - ventas cerradas
    if (session.status === 'active') {
      return res.json({
        salesOpen: false,
        reason: 'GAME_IN_PROGRESS',
        message: 'Sorteo en curso',
        nextSession: startTime.toISOString(),
        sessionId: session.id
      });
    }

    // Si faltan 5 minutos o menos - ventas cerradas
    if (minutesUntilStart >= 0 && minutesUntilStart <= 5) {
      const minutesLeft = Math.ceil(minutesUntilStart);
      return res.json({
        salesOpen: false,
        reason: 'CLOSING_SOON',
        message: `Ventas cerradas - El sorteo comienza en ${minutesLeft} min`,
        minutesLeft,
        nextSession: startTime.toISOString(),
        sessionId: session.id
      });
    }

    // Ventas abiertas
    return res.json({
      salesOpen: true,
      reason: 'OPEN',
      message: 'Ventas abiertas',
      minutesUntilClose: Math.floor(minutesUntilStart - 5),
      nextSession: startTime.toISOString(),
      sessionId: session.id
    });

  } catch (error) {
    console.error('[GameController] Error obteniendo estado de ventas:', error);
    res.status(500).json({ error: 'Error obteniendo estado de ventas' });
  }
};

/**
 * GET /game/live-draw/:room
 * Obtiene el estado actual del sorteo en curso para una sala
 * Permite que jugadores que entran a mitad del sorteo vean las bolas ya sorteadas
 */
exports.getLiveDraw = async (req, res) => {
  try {
    const { room } = req.params;
    
    // Mapear room del frontend al room de la BD
    const roomMap = {
      'starter': 'free_starter',
      'free_starter': 'free_starter',
      'bronze': 'bronce',
      'bronce': 'bronce',
      'silver': 'plata',
      'plata': 'plata',
      'gold': 'oro',
      'oro': 'oro'
    };
    
    const dbRoom = roomMap[room] || room;
    
    // Obtener el gameEngine global
    const gameAdminController = require('./gameAdminController');
    const gameEngine = gameAdminController.gameEngine;
    
    if (!gameEngine) {
      // No hay gameEngine, buscar en BD si hay sesión activa
      const [activeSession] = await pool.query(
        `SELECT gs.id, gs.room, gs.status, gs.start_time,
                gs.current_pot_linea, gs.current_pot_bingo, gs.current_pot_jackpot
         FROM game_sessions gs
         WHERE gs.room = ? AND gs.status = 'active'
         ORDER BY gs.start_time DESC
         LIMIT 1`,
        [dbRoom]
      );
      
      if (activeSession.length === 0) {
        return res.json({
          isActive: false,
          room: dbRoom,
          message: 'No hay sorteo activo en esta sala'
        });
      }
      
      // Hay sesión activa pero no está en memoria, obtener bolas de BD
      const [balls] = await pool.query(
        `SELECT ball_number, ball_letter, draw_order
         FROM game_session_balls
         WHERE game_session_id = ?
         ORDER BY draw_order ASC`,
        [activeSession[0].id]
      );
      
      return res.json({
        isActive: true,
        sessionId: activeSession[0].id,
        room: dbRoom,
        ballsDrawn: balls.map(b => ({
          number: b.ball_number,
          letter: b.ball_letter,
          order: b.draw_order
        })),
        totalBallsDrawn: balls.length,
        prizes: {
          line: parseFloat(activeSession[0].current_pot_linea) || 0,
          bingo: parseFloat(activeSession[0].current_pot_bingo) || 0,
          jackpot: parseFloat(activeSession[0].current_pot_jackpot) || 0
        }
      });
    }
    
    // Obtener estado del juego activo en memoria
    const gameState = gameEngine.getActiveGameForRoom(dbRoom);
    
    if (!gameState) {
      // No hay juego activo en memoria, verificar BD
      const [activeSession] = await pool.query(
        `SELECT gs.id, gs.room, gs.status, gs.start_time,
                gs.current_pot_linea, gs.current_pot_bingo, gs.current_pot_jackpot
         FROM game_sessions gs
         WHERE gs.room = ? AND gs.status = 'active'
         ORDER BY gs.start_time DESC
         LIMIT 1`,
        [dbRoom]
      );
      
      if (activeSession.length === 0) {
        // Buscar próxima sesión pendiente
        const [pendingSession] = await pool.query(
          `SELECT id, room, start_time, current_pot_linea, current_pot_bingo, current_pot_jackpot
           FROM game_sessions
           WHERE room = ? AND status = 'pending'
           ORDER BY start_time ASC
           LIMIT 1`,
          [dbRoom]
        );
        
        return res.json({
          isActive: false,
          room: dbRoom,
          message: 'No hay sorteo activo en esta sala',
          nextSession: pendingSession.length > 0 ? {
            sessionId: pendingSession[0].id,
            startTime: pendingSession[0].start_time,
            prizes: {
              line: parseFloat(pendingSession[0].current_pot_linea) || 0,
              bingo: parseFloat(pendingSession[0].current_pot_bingo) || 0,
              jackpot: parseFloat(pendingSession[0].current_pot_jackpot) || 0
            }
          } : null
        });
      }
      
      // Hay sesión en BD pero no en memoria - obtener bolas de BD
      const [balls] = await pool.query(
        `SELECT ball_number, ball_letter, draw_order
         FROM game_session_balls
         WHERE game_session_id = ?
         ORDER BY draw_order ASC`,
        [activeSession[0].id]
      );
      
      return res.json({
        isActive: true,
        sessionId: activeSession[0].id,
        room: dbRoom,
        ballsDrawn: balls.map(b => ({
          number: b.ball_number,
          letter: b.ball_letter,
          order: b.draw_order
        })),
        totalBallsDrawn: balls.length,
        prizes: {
          line: parseFloat(activeSession[0].current_pot_linea) || 0,
          bingo: parseFloat(activeSession[0].current_pot_bingo) || 0,
          jackpot: parseFloat(activeSession[0].current_pot_jackpot) || 0
        }
      });
    }
    
    // Tenemos el estado del juego en memoria
    // Obtener premios de la BD
    const [sessionData] = await pool.query(
      `SELECT current_pot_linea, current_pot_bingo, current_pot_jackpot
       FROM game_sessions WHERE id = ?`,
      [gameState.sessionId]
    );
    
    return res.json({
      success: true,
      hasActiveGame: true,
      gameSessionId: gameState.sessionId,
      room: gameState.room,
      status: gameState.isPaused ? 'paused' : 'active',
      ballsDrawn: gameState.ballsDrawn,
      totalBallsDrawn: gameState.totalBallsDrawn,
      lineWinnersPaid: gameState.lineWinnersPaid,
      bingoWinnersPaid: gameState.bingoWinnersPaid,
      prizes: sessionData.length > 0 ? {
        linePrize: parseFloat(sessionData[0].current_pot_linea) || 0,
        bingoPrize: parseFloat(sessionData[0].current_pot_bingo) || 0,
        jackpot: parseFloat(sessionData[0].current_pot_jackpot) || 0
      } : null
    });
    
  } catch (error) {
    console.error('[GameController] Error obteniendo sorteo en vivo:', error);
    res.status(500).json({ success: false, error: 'Error obteniendo estado del sorteo' });
  }
};
