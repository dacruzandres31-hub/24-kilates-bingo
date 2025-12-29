const dbHelper = require('../helpers/dbHelper');
const responseHelper = require('../helpers/responseHelper');
const validationHelper = require('../helpers/validationHelper');
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
const drawScheduleService = require('../services/drawScheduleService');
const sessionHistoryService = require('../services/sessionHistoryService');
const bingoValidator = require('../utils/bingoValidator');

// COMPRAR CARTÓN - Agregar a session del usuario
exports.buyCard = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cardId, roomType, playDate } = req.body;

    const missingField = validationHelper.checkRequired(req.body, ['cardId', 'roomType', 'playDate']);
    if (missingField) {
      return responseHelper.error(res, 400, `Requerido: ${missingField}`);
    }

    // Obtener usuario
    const user = await dbHelper.queryOne(
      'SELECT id, balance, parent_id, role FROM users WHERE id = ?',
      [userId],
      'BuyCardGetUser'
    );

    if (!user) {
      return responseHelper.notFound(res, 'Usuario no encontrado');
    }

    // Obtener cartón y su precio
    const card = await dbHelper.queryOne(
      `SELECT id, price, status FROM daily_stock_cards 
       WHERE id = ? AND status = 'available' AND room = ?`,
      [cardId, roomType],
      'BuyCardGetCard'
    );

    if (!card) {
      return responseHelper.notFound(res, 'Cartón no disponible');
    }

    // Validar balance suficiente
    if (user.balance < card.price) {
      return responseHelper.error(res, 400, 'Balance insuficiente');
    }

    // Iniciar transacción usando Helper
    await dbHelper.transaction(async (connection) => {
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

      // 4. Distribuir comisiones
      const bigoAmount = card.price * 0.50;
      const lineaAmount = card.price * 0.15;
      const jackpotAmount = card.price * 0.05;

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
           SET jackpot_bingo = jackpot_bingo + ?,
               jackpot_linea = jackpot_linea + ?,
               jackpot_pre40 = jackpot_pre40 + ?,
               updated_at = NOW()
           WHERE id = ?`,
          [bigoAmount, lineaAmount, jackpotAmount, sessionId]
        );

        // ACTUALIZACIÓN GLOBAL: Incrementar pozo acumulado de la sala (Pre-40)
        await connection.query(
          `UPDATE room_settings 
           SET accumulated_pot_pre40 = accumulated_pot_pre40 + ?
           WHERE room = ?`,
          [jackpotAmount, roomType]
        );
      }
    });

    // ===== EMITIR ACTUALIZACIÓN DE POZOS EN VIVO =====
    websocketService.emitPotsUpdate();

    // ===== GAMIFICACIÓN: Agregar XP al jugador =====
    let xpResult = { xpAdded: 0, leveledUp: false };
    try {
      xpResult = await gamificationEngine.addXPToPlayer(userId, card.price);

      if (user.role === 'jugador') {
        await questManager.recordRoomPlay(userId, roomType);
      }

      if (user.role === 'agente' && user.parent_id) {
        await rankingEngine.recordSale(user.parent_id, 1, card.price, roomType);
      }

      if (xpResult.leveledUp && xpResult.newLevel) {
        const levelNames = {
          1: 'Novato', 2: 'Cobre', 3: 'Plata Fina', 4: 'Oro Puro', 5: 'Diamante 24K'
        };
        const rankName = levelNames[xpResult.newLevel] || `Nivel ${xpResult.newLevel}`;
        notificationService.broadcastLevelUp(user.username, xpResult.newLevel, rankName);
      }
    } catch (gamError) {
      console.error('Gamification error (non-critical):', gamError);
    }

    return responseHelper.success(res, {
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

  } catch (error) {
    return responseHelper.error(res, 500, 'Error comprando cartón', error.message);
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

    const result = await dbHelper.query(query, params, 'GetPlayerCards');

    return responseHelper.success(res, {
      cards: result,
      total: result.length
    });
  } catch (error) {
    return responseHelper.error(res, 500, 'Error obteniendo cartones', error.message);
  }
};

// TERMINAR PARTIDA - Detectar ganadores y distribuir premios
exports.finishSession = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return responseHelper.error(res, 400, 'Session ID requerido');
    }

    // Obtener sesión
    const session = await dbHelper.queryOne(
      `SELECT id, room, current_pot_bingo, current_pot_linea, 
              current_pot_jackpot, is_preventa FROM game_sessions WHERE id = ?`,
      [sessionId], 'FinishSessionGet'
    );

    if (!session) {
      return responseHelper.notFound(res, 'Sesión no encontrada');
    }

    // Ejecutar game engine (sorteo y detección de ganadores)
    const gameResult = await gameEngine.executeGame(session);

    // Procesar cascada de jackpot si es necesario
    if (gameResult.jackpotWinner && gameResult.boleaNumber > 40) {
      await cascadeLogic.transferJackpot(sessionId, session.room);
    }

    // Registrar premios
    for (const winner of gameResult.winners) {
      const { userId, amount, type } = winner;

      try {
        await dbHelper.transaction(async (connection) => {
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
        });

        // Broadcast de big win a todos los jugadores
        const userRes = await dbHelper.queryOne('SELECT username FROM users WHERE id = ?', [userId], 'FinishSessionGetUser');
        if (userRes) {
          notificationService.broadcastBigWin(userRes.username, amount, session.room, type);
        }
      } catch (innerError) {
        console.error(`Error processing winner ${userId}:`, innerError);
      }
    }

    // Marcar sesión como finalizada
    await dbHelper.query(
      `UPDATE game_sessions SET status = 'completed', updated_at = NOW() WHERE id = ?`,
      [sessionId], 'FinishSessionComplete'
    );

    // LIMPIEZA: Eliminar cartones no asignados a ninguna sesión de esta sala
    try {
      const sessionData = await dbHelper.queryOne(
        'SELECT room FROM game_sessions WHERE id = ?',
        [sessionId], 'FinishSessionGetRoom'
      );

      if (sessionData) {
        const room = sessionData.room;
        const cleanupResult = await dbHelper.query(`
          DELETE FROM bingo_cards_pool 
          WHERE room = ? 
          AND status = 'selected' 
          AND game_session_id IS NULL
        `, [room], 'FinishSessionCleanup');

        console.log(`[GameController] 🧹 Limpieza post-finalización sala ${room}: ${cleanupResult.affectedRows} cartones huérfanos eliminados`);
      }
    } catch (cleanupError) {
      console.warn('Cleanup error:', cleanupError);
    }

    // ARCHIVAR SESIÓN AUTOMÁTICAMENTE
    try {
      await sessionHistoryService.archiveSession(sessionId);
      console.log(`[GameController] ✅ Sesión ${sessionId} archivada exitosamente.`);
    } catch (archiveError) {
      console.error(`[GameController] ❌ Error archivando sesión ${sessionId}:`, archiveError);
    }

    return responseHelper.success(res, {
      gameResult,
      winners: gameResult.winners
    });

  } catch (error) {
    return responseHelper.error(res, 500, 'Error finalizando sesión', error.message);
  }
};

// OBTENER ESTADO DE SESIÓN
exports.getSessionStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await dbHelper.queryOne(
      `SELECT id, room, status, current_pot_bingo, current_pot_linea, 
              current_pot_jackpot, is_preventa, ball_sequence 
       FROM game_sessions WHERE id = ?`,
      [sessionId], 'GetSessionStatus'
    );

    if (!session) {
      return responseHelper.notFound(res, 'Sesión no encontrada');
    }

    // Si no hay ball_sequence persistido, buscar en tabla de bolillas
    if (!session.ball_sequence || session.ball_sequence.length === 0) {
      const balls = await dbHelper.query(
        `SELECT ball_number FROM game_session_balls 
         WHERE game_session_id = ? ORDER BY draw_order ASC`,
        [sessionId], 'GetSessionBalls'
      );
      session.drawnNumbers = balls.map(b => b.ball_number);
    } else {
      session.drawnNumbers = typeof session.ball_sequence === 'string'
        ? JSON.parse(session.ball_sequence)
        : session.ball_sequence;
    }

    return responseHelper.success(res, { session });
  } catch (error) {
    return responseHelper.error(res, 500, 'Error obteniendo estado de sesión', error.message);
  }
};

// OBTENER ESTADO DE LA SALA (Siguiente sorteo, estado sorteando)
exports.getRoomStatus = async (req, res) => {
  try {
    const { room } = req.params;

    const roomMap = { 'bronze': 'bronce', 'silver': 'plata', 'gold': 'oro', 'starter': 'starter' };
    const roomDB = roomMap[room] || room;

    const status = await drawScheduleService.getNextDraw(roomDB);

    return responseHelper.success(res, {
      room: roomDB,
      ...status
    });
  } catch (error) {
    return responseHelper.error(res, 500, 'Error obteniendo estado de la sala', error.message);
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

    const result = await dbHelper.query(query, params, 'GetActiveSessions');

    return responseHelper.success(res, { sessions: result });
  } catch (error) {
    return responseHelper.error(res, 500, 'Error obteniendo sesiones', error.message);
  }
};

// COMPRAR CARTÓN GRATIS - Sala Starter (Free-to-Play)
exports.buyCardFree = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cardId, playDate } = req.body;

    const missingField = validationHelper.checkRequired(req.body, ['cardId', 'playDate']);
    if (missingField) {
      return responseHelper.error(res, 400, `Requerido: ${missingField}`);
    }

    // Verificar que sea sala STARTER
    const card = await dbHelper.queryOne(
      `SELECT id, price, status, room FROM daily_stock_cards 
       WHERE id = ? AND status = 'available'`,
      [cardId], 'BuyCardFreeGetCard'
    );

    if (!card) {
      return responseHelper.notFound(res, 'Cartón no disponible');
    }

    if (card.room !== 'free_starter') {
      return responseHelper.error(res, 400, 'Este cartón no es de sala gratis');
    }

    // Verificar límite de 20 cartones
    const countResult = await dbHelper.queryOne(
      `SELECT COUNT(*) as count FROM daily_stock_cards 
       WHERE buyer_id = ? AND play_date = ? AND room = 'free_starter'`,
      [userId, playDate], 'BuyCardFreeCount'
    );

    if (parseInt(countResult.count) >= 20) {
      return responseHelper.error(res, 400, 'Alcanzaste el límite de 20 cartones en Sala Starter');
    }

    // Comprar cartón (sin restar balance)
    await dbHelper.transaction(async (connection) => {
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
    });

    return responseHelper.success(res, {
      message: 'Cartón adquirido gratuitamente',
      card: {
        id: card.id,
        price: 0
      }
    });

  } catch (error) {
    return responseHelper.error(res, 500, 'Error comprando cartón gratis', error.message);
  }
};

// PROCESAR GANADOR EN SALA STARTER - Drop de NFT
exports.claimFreePrize = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId, type } = req.body;

    const missingField = validationHelper.checkRequired(req.body, ['sessionId', 'type']);
    if (missingField) return responseHelper.error(res, 400, `Requerido: ${missingField}`);

    // Verificar que es sala STARTER
    const session = await dbHelper.queryOne(
      `SELECT id, room FROM game_sessions WHERE id = ?`,
      [sessionId], 'ClaimFreePrizeGetSession'
    );

    if (!session) return responseHelper.notFound(res, 'Sesión no encontrada');

    if (session.room !== 'free_starter') {
      return responseHelper.error(res, 400, 'Esta sesión no es Sala Starter');
    }

    // Drop aleatorio de NFT
    const item = await inventoryService.dropRandomItem(userId);

    if (!item) return responseHelper.error(res, 500, 'Error al procesar el premio');

    return responseHelper.success(res, {
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
    return responseHelper.error(res, 500, 'Error procesando premio', error.message);
  }
};

// HELPER: Obtener cadena de agentes (agent_path)
async function getAgentPath(userId) {
  const result = await dbHelper.query(
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
    [userId], 'GetAgentPath'
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
// end_free_game: Procesar premio cuando termina partida Sala Starter
exports.end_free_game = async (req, res) => {
  try {
    const userId = req.user.id;
    const { gameSessionId, winType } = req.body;

    const missingField = validationHelper.checkRequired(req.body, ['gameSessionId', 'winType']);
    if (missingField) return responseHelper.error(res, 400, `Requerido: ${missingField}`);

    let responsePayload = {};

    await dbHelper.transaction(async (connection) => {
      // ====== Validar que sea Sala Starter ======
      const [sessionResult] = await connection.query(
        `SELECT id, room, status FROM game_sessions 
         WHERE id = ? AND room = 'free_starter'`,
        [gameSessionId]
      );

      if (sessionResult.length === 0) {
        throw new Error('Sesión no válida para premios gratis');
      }

      let rewardMessage = '';
      let rewardData = {};

      if (winType === 'linea') {
        const [skinResult] = await connection.query(
          `SELECT * FROM cosmetic_items 
           WHERE type IN ('avatar_frame', 'card_skin', 'chat_effect')
           AND is_free_available = TRUE AND rarity != 'legendary' AND is_consumable = FALSE
           ORDER BY RAND() LIMIT 1`
        );

        if (skinResult.length === 0) throw new Error('No hay skins disponibles');

        const skin = skinResult[0];
        await connection.query(
          `INSERT INTO user_inventory (user_id, item_id, equipped, is_consumable_type)
           VALUES (?, ?, FALSE, FALSE)
           ON DUPLICATE KEY UPDATE user_id = user_id`,
          [userId, skin.id]
        );

        rewardMessage = `¡Ganaste un nuevo ${skin.type === 'avatar_frame' ? 'Marco' : 'Skin'}!`;
        rewardData = { type: 'skin', name: skin.name, rarity: skin.rarity, description: skin.rarity };

        await connection.query(
          `INSERT INTO game_events (user_id, session_id, event_type, details)
           VALUES (?, ?, 'win_linea_free', ?)`,
          [userId, gameSessionId, JSON.stringify(rewardData)]
        );

      } else if (winType === 'bingo') {
        // Skill Legendaria
        const [legendaryResult] = await connection.query(
          `SELECT * FROM cosmetic_items 
           WHERE type IN ('avatar_frame', 'card_skin', 'chat_effect')
           AND rarity = 'legendary' AND is_free_available = TRUE AND is_consumable = FALSE
           ORDER BY RAND() LIMIT 1`
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

        // Ticket Bronce
        const [ticketResult] = await connection.query(
          `SELECT * FROM cosmetic_items WHERE type = 'ticket' AND ticket_room = 'bronce' LIMIT 1`
        );
        let ticketName = null;
        if (ticketResult.length > 0) {
          const ticket = ticketResult[0];
          ticketName = ticket.name;
          await connection.query(
            `INSERT INTO user_inventory (user_id, item_id, quantity, is_consumable_type)
             VALUES (?, ?, 1, TRUE)
             ON DUPLICATE KEY UPDATE quantity = quantity + 1`,
            [userId, ticket.id]
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

        await connection.query(
          `INSERT INTO game_events (user_id, session_id, event_type, details)
           VALUES (?, ?, 'win_bingo_free', ?)`,
          [userId, gameSessionId, JSON.stringify(rewardData)]
        );
      }

      responsePayload = {
        success: true,
        message: rewardMessage,
        reward: rewardData
      };
    });

    return responseHelper.success(res, responsePayload);

  } catch (error) {
    return responseHelper.error(res, 500, error.message);
  }
};

// ============================================
// CANTAR LÍNEA (Salas Monetizadas)
// ============================================
// ============================================
// CANTAR LÍNEA (Salas Monetizadas)
// ============================================
exports.claimLine = async (req, res) => {
  try {
    const { gameSessionId, cardId } = req.body;
    const userId = req.user.id;

    const missingField = validationHelper.checkRequired(req.body, ['gameSessionId', 'cardId']);
    if (missingField) return responseHelper.error(res, 400, `Requerido: ${missingField}`);

    // 1. Obtener sesión de juego
    const session = await dbHelper.queryOne(
      `SELECT * FROM game_sessions WHERE id = ?`,
      [gameSessionId], 'ClaimLineGetSession'
    );

    if (!session) return responseHelper.notFound(res, 'Sesión no encontrada');

    // Verificar si ya hubo un ganador de línea para esta sesión
    const prevWinner = await dbHelper.queryOne(
      `SELECT id FROM game_winners WHERE game_session_id = ? AND prize_type = 'linea'`,
      [gameSessionId], 'ClaimLineCheckWinner'
    );

    if (prevWinner) {
      return responseHelper.error(res, 400, 'La línea ya ha sido ganada en este sorteo');
    }

    // 2. Obtener cartón validado del usuario
    const card = await dbHelper.queryOne(
      `SELECT * FROM validated_cards 
       WHERE id = ? AND player_id = ? AND game_session_id = ?`,
      [cardId, userId, gameSessionId], 'ClaimLineGetCard'
    );

    if (!card) {
      return responseHelper.notFound(res, 'Cartón no encontrado o no pertenece al usuario');
    }

    const cardNumbers = typeof card.grid_numbers === 'string' ? JSON.parse(card.grid_numbers) : card.grid_numbers;

    // 3. Obtener números cantados en esta sesión
    const balls = await dbHelper.query(
      `SELECT ball_number FROM game_session_balls 
       WHERE game_session_id = ? 
       ORDER BY draw_order`,
      [gameSessionId], 'ClaimLineGetBalls'
    );

    const calledNumbers = balls.map(b => b.ball_number);

    // 4. Validar línea con el utilitario centralizado
    const validation = bingoValidator.checkHorizontalLines(cardNumbers, calledNumbers);

    if (!validation.hasLine) {
      return responseHelper.error(res, 400, 'Línea inválida - Verifica tus números marcados');
    }

    // 5. Registrar ganador (Transactional)
    const prizeAmount = parseFloat(session.jackpot_linea || 0);

    await dbHelper.transaction(async (connection) => {
      await connection.query(
        `INSERT INTO game_winners 
         (game_session_id, user_id, card_id, prize_type, prize_amount, line_type, winning_numbers, verified) 
         VALUES (?, ?, ?, 'linea', ?, ?, ?, TRUE)`,
        [gameSessionId, userId, cardId, prizeAmount, `horizontal_${validation.row + 1}`, JSON.stringify(validation.winningNumbers)]
      );

      // Resetear pozo de línea en la sesión
      await connection.query('UPDATE game_sessions SET jackpot_linea = 0 WHERE id = ?', [gameSessionId]);
    });

    // 6. Emitir eventos Socket.IO
    const io = req.app.get('io');
    const { notifyLineWinner } = require('../socket/winnerEvents');

    notifyLineWinner(io, `session_${gameSessionId}`, {
      id: userId,
      username: req.user.username
    }, prizeAmount, `Fila ${validation.row + 1}`, {
      numbers: cardNumbers,
      winningNumbers: validation.winningNumbers
    });

    return responseHelper.success(res, {
      prizeAmount,
      winningNumbers: validation.winningNumbers,
      message: `¡FELICIDADES! Ganaste la LÍNEA de $${prizeAmount.toLocaleString()}`
    });

  } catch (error) {
    return responseHelper.error(res, 500, error.message);
  }
};

// ============================================
// CANTAR BINGO (Salas Monetizadas)
// ============================================
// ============================================
// CANTAR BINGO (Salas Monetizadas)
// ============================================
exports.claimBingo = async (req, res) => {
  try {
    const { gameSessionId, cardId } = req.body;
    const userId = req.user.id;

    const missingField = validationHelper.checkRequired(req.body, ['gameSessionId', 'cardId']);
    if (missingField) return responseHelper.error(res, 400, `Requerido: ${missingField}`);

    // 1. Obtener sesión de juego
    const session = await dbHelper.queryOne(
      `SELECT * FROM game_sessions WHERE id = ?`,
      [gameSessionId], 'ClaimBingoGetSession'
    );

    if (!session) return responseHelper.notFound(res, 'Sesión no encontrada');

    // Verificar si ya hubo un ganador de BINGO para esta sesión
    const prevWinner = await dbHelper.queryOne(
      `SELECT id FROM game_winners WHERE game_session_id = ? AND prize_type = 'bingo'`,
      [gameSessionId], 'ClaimBingoCheckWinner'
    );

    if (prevWinner) {
      return responseHelper.error(res, 400, 'El BINGO ya ha sido ganado en este sorteo');
    }

    // 2. Obtener cartón validado del usuario
    const card = await dbHelper.queryOne(
      `SELECT * FROM validated_cards 
       WHERE id = ? AND player_id = ? AND game_session_id = ?`,
      [cardId, userId, gameSessionId], 'ClaimBingoGetCard'
    );

    if (!card) return responseHelper.notFound(res, 'Cartón no encontrado o no pertenece al usuario');

    const cardNumbers = typeof card.grid_numbers === 'string' ? JSON.parse(card.grid_numbers) : card.grid_numbers;

    // 3. Obtener números cantados
    const balls = await dbHelper.query(
      `SELECT ball_number FROM game_session_balls 
       WHERE game_session_id = ? 
       ORDER BY draw_order`,
      [gameSessionId], 'ClaimBingoGetBalls'
    );

    const calledNumbers = balls.map(b => b.ball_number);

    // 4. Validar BINGO con el utilitario centralizado
    const validation = bingoValidator.checkBingo(cardNumbers, calledNumbers);

    if (!validation.isValid) {
      return responseHelper.error(res, 400, 'BINGO inválido - Faltan números en tu cartón');
    }

    // 5. Registrar ganador de BINGO
    let bingoPrize = parseFloat(session.jackpot_bingo || 0);
    let pre40Prize = 0;

    // Si ganó antes de bolilla 40, sumar pozo Pre-40
    if (calledNumbers.length <= 40 && session.jackpot_pre40 > 0) {
      pre40Prize = parseFloat(session.jackpot_pre40);
      console.log(`🎰 [BINGO PRE-40] Usuario ${userId} ganó Bingo + Pre-40 ($${pre40Prize})`);
    }

    const totalPrize = bingoPrize + pre40Prize;

    // Transactional Update
    await dbHelper.transaction(async (connection) => {
      await connection.query(
        `INSERT INTO game_winners 
         (game_session_id, user_id, card_id, prize_type, prize_amount, winning_numbers, verified) 
         VALUES (?, ?, ?, 'bingo', ?, ?, TRUE)`,
        [gameSessionId, userId, cardId, totalPrize, JSON.stringify(validation.winningNumbers)]
      );

      // 6. Finalizar sesión inmediatamente
      await connection.query(
        `UPDATE game_sessions SET status = 'completed', updated_at = NOW() WHERE id = ?`,
        [gameSessionId]
      );
    });

    // Detener el motor de sorteo si está activo
    const gameEngineAuto = req.app.get('gameEngineAuto');
    if (gameEngineAuto) {
      gameEngineAuto.endGame(gameSessionId, 'completed');
    }

    // 7. Emitir eventos Socket.IO
    const io = req.app.get('io');
    const { notifyBingoWinner, showPaymentForms } = require('../socket/winnerEvents');

    notifyBingoWinner(io, `session_${gameSessionId}`, {
      id: userId,
      username: req.user.username
    }, totalPrize, gameSessionId);

    // Mostrar formularios de pago después de 5 segundos
    setTimeout(async () => {
      const winners = await getGameWinners(gameSessionId); // Helper function usage at bottom of file
      showPaymentForms(io, gameSessionId, winners);
    }, 5000);

    // 8. AUTOMATIC ROTATION: Crear la siguiente sesión
    const sessionService = require('../services/sessionService');
    sessionService.getOrCreateActiveSession(session.room).catch(err => {
      console.error('[GameController] Error rotando sesión tras BINGO:', err);
    });

    return responseHelper.success(res, {
      prizeAmount: totalPrize,
      winningNumbers: validation.winningNumbers,
      gameEnded: true,
      message: `¡BINGO! Ganaste $${totalPrize.toLocaleString()}`
    });

  } catch (error) {
    return responseHelper.error(res, 500, error.message);
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
  switch (lineType) {
    case 'horizontal_1':
      positions.push([0, 0], [0, 1], [0, 2], [0, 3], [0, 4]);
      break;
    case 'horizontal_2':
      positions.push([1, 0], [1, 1], [1, 2], [1, 3], [1, 4]);
      break;
    case 'horizontal_3':
      positions.push([2, 0], [2, 1], [2, 2], [2, 3], [2, 4]);
      break;
    case 'horizontal_4':
      positions.push([3, 0], [3, 1], [3, 2], [3, 3], [3, 4]);
      break;
    case 'horizontal_5':
      positions.push([4, 0], [4, 1], [4, 2], [4, 3], [4, 4]);
      break;
    case 'vertical_1':
      positions.push([0, 0], [1, 0], [2, 0], [3, 0], [4, 0]);
      break;
    case 'vertical_2':
      positions.push([0, 1], [1, 1], [2, 1], [3, 1], [4, 1]);
      break;
    case 'vertical_3':
      positions.push([0, 2], [1, 2], [2, 2], [3, 2], [4, 2]);
      break;
    case 'vertical_4':
      positions.push([0, 3], [1, 3], [2, 3], [3, 3], [4, 3]);
      break;
    case 'vertical_5':
      positions.push([0, 4], [1, 4], [2, 4], [3, 4], [4, 4]);
      break;
    case 'diagonal_1':
      positions.push([0, 0], [1, 1], [2, 2], [3, 3], [4, 4]);
      break;
    case 'diagonal_2':
      positions.push([0, 4], [1, 3], [2, 2], [3, 1], [4, 0]);
      break;
    case 'four_corners':
      positions.push([0, 0], [0, 4], [4, 0], [4, 4]);
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
/**
 * Obtiene todos los ganadores de una sesión agrupados por usuario
 * @param {Number} gameSessionId 
 * @returns {Array} Array de objetos con userId, username, prizes
 */
async function getGameWinners(gameSessionId) {
  const winners = await dbHelper.query(
    `SELECT 
       gw.user_id,
       u.username,
       gw.prize_type,
       gw.prize_amount
     FROM game_winners gw
     JOIN users u ON gw.user_id = u.id
     WHERE gw.game_session_id = ?
     ORDER BY gw.claimed_at`,
    [gameSessionId], 'GetGameWinners'
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
// GET /api/game/my-cards-analysis/:gameSessionId
exports.getMyCardsAnalysis = async (req, res) => {
  try {
    const { gameSessionId } = req.params;
    const userId = req.user.id;

    // Obtener cartones del usuario en esta sesión
    const cards = await dbHelper.query(
      `SELECT * FROM bingo_cards 
       WHERE user_id = ? AND session_id = ? AND status = 'active'
       ORDER BY id ASC`,
      [userId, gameSessionId], 'GetMyCardsAnalysis'
    );

    if (cards.length === 0) {
      return responseHelper.success(res, {
        cards: [],
        alerts: [],
        summary: { totalCards: 0, totalMarked: 0, averageProgress: 0 }
      });
    }

    // Obtener números cantados en la sesión
    const balls = await dbHelper.query(
      `SELECT ball_number FROM game_session_balls 
       WHERE game_session_id = ? 
       ORDER BY draw_order`,
      [gameSessionId], 'GetMyCardsAnalysisBalls'
    );

    const calledNumbers = balls.map(b => b.ball_number);

    // Analizar cartones con CardAnalyzer
    const analysis = CardAnalyzer.analyzeUserCards(cards, calledNumbers);

    // Generar vista apilada
    const stackedCards = CardAnalyzer.generateStackedView(analysis.cards);

    return responseHelper.success(res, {
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
    return responseHelper.error(res, 500, error.message);
  }
};

/**
 * POST /api/game/validate-cards
 * Valida cartones del inventario para una sesión de juego específica
 * - Genera número de serie único por cartón
 * - Verifica límite del 10% de cartones de regalo
 * - Distribuye a jackpots si es cartón pago (15% línea, 50% bingo, 5% pre-40)
 */
// POST /api/game/validate-cards
exports.validateCardsForSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { game_session_id, room, quantity } = req.body;

    const missingField = validationHelper.checkRequired(req.body, ['game_session_id', 'room', 'quantity']);
    if (missingField) return responseHelper.error(res, 400, `Requerido: ${missingField}`);

    if (!['bronce', 'plata', 'oro'].includes(room)) {
      return responseHelper.error(res, 400, 'Sala inválida. Debe ser: bronce, plata u oro');
    }

    if (quantity <= 0 || quantity > 20) {
      return responseHelper.error(res, 400, 'La cantidad debe ser entre 1 y 20 cartones');
    }

    // Verificar que la sesión existe y está pendiente
    const session = await dbHelper.queryOne(
      `SELECT id, status, room, play_date FROM game_sessions WHERE id = ?`,
      [game_session_id], 'ValidateCardsSessionCheck'
    );

    if (!session) {
      return responseHelper.notFound(res, 'Sesión de juego no encontrada');
    }

    if (session.status !== 'pending') {
      return responseHelper.error(res, 400, `La sesión está en estado: ${session.status}. Solo se pueden validar cartones en sesiones pendientes`);
    }

    if (session.room !== room) {
      return responseHelper.error(res, 400, `La sesión es de sala ${session.room}, no ${room}`);
    }

    // Validar cartones usando el servicio
    const result = await cardInventoryService.validateCards(
      userId,
      game_session_id,
      room,
      quantity
    );

    return res.json(result); // Service likely returns strict format, keep as is or wrap in success

  } catch (error) {
    return responseHelper.error(res, 500, error.message || 'Error validando cartones');
  }
};

/**
 * GET /api/game/my-validated-cards/:sessionId
 * Obtiene los cartones validados del jugador para una sesión específica
 */
// GET /api/game/my-validated-cards/:sessionId
exports.getMyValidatedCards = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;

    if (!sessionId) {
      return responseHelper.error(res, 400, 'session_id es requerido');
    }

    const cards = await cardInventoryService.getValidatedCards(userId, parseInt(sessionId));

    return responseHelper.success(res, {
      game_session_id: parseInt(sessionId),
      total_cards: cards.length,
      cards: cards
    });

  } catch (error) {
    return responseHelper.error(res, 500, error.message || 'Error obteniendo cartones validados');
  }
};

// GET /api/game/my-inventory
exports.getMyCardInventory = async (req, res) => {
  try {
    const userId = req.user.id;
    const inventory = await cardInventoryService.getInventory(userId, false);

    return responseHelper.success(res, {
      user_id: userId,
      inventory: inventory
    });

  } catch (error) {
    return responseHelper.error(res, 500, error.message || 'Error obteniendo inventario');
  }
};

/**
 * TEST: Gatillar notificación de ganador para pruebas de UI
 * Permite simular que alguien ganó sin tener que jugar todo el sorteo
 */
// TEST: Gatillar notificación de ganador para pruebas de UI
exports.testWinnerNotification = async (req, res) => {
  try {
    const { room, type, username, amount } = req.body;
    const io = req.app.get('io');

    if (!room || !type) {
      return responseHelper.error(res, 400, 'Room y Type son requeridos');
    }

    const winnerName = username || 'Jugador de Prueba';
    const prizeAmount = amount || (type === 'linea' ? 2500 : 25000);
    const fakeWinnerId = 999;

    const { notifyLineWinner, notifyBingoWinner } = require('../socket/winnerEvents');

    if (type === 'linea') {
      notifyLineWinner(io, room, { id: fakeWinnerId, username: winnerName }, prizeAmount, 'horizontal_1');
    } else if (type === 'bingo') {
      notifyBingoWinner(io, room, { id: fakeWinnerId, username: winnerName }, prizeAmount, 0);
    }

    return responseHelper.success(res, { message: `Evento ${type} emitido para sala ${room}` });
  } catch (error) {
    return responseHelper.error(res, 500, error.message);
  }
};


