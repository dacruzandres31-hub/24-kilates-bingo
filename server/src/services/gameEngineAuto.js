/**
 * Motor del juego - Controla el sorteo automático y validación de cartones
 * 
 * FLUJO AUTOMÁTICO (sin intervención del jugador):
 * 1. Sistema canta número cada X segundos
 * 2. Sistema marca automáticamente en TODOS los cartones
 * 3. Sistema valida automáticamente líneas y bingos
 * 4. Sistema anuncia ganadores con cartel a todos
 * 5. Pausa 1-2 segundos para celebrar
 * 6. Continúa sorteo hasta BINGO
 * 7. Al terminar → muestra formularios de pago
 */
const pool = require('../db');
const { 
  notifyLineWinner, 
  notifyBingoWinner, 
  showPaymentForms 
} = require('../socket/winnerEvents');
const whatsapp24KService = require('./whatsapp24KService');
const ChipsService = require('./chipsService');
const MoneyMath = require('../utils/moneyMath');
const persistentNotifications = require('./persistentNotifications');

class GameEngineAuto {
  constructor(io) {
    this.io = io;
    this.activeGames = new Map(); // gameSessionId -> gameState
  }

  /**
   * Inicia un sorteo automático
   * Puede iniciar uno nuevo (status active/pending) o retomar uno existente (status playing)
   */
  async startGame(gameSessionId, options = {}) {
    const {
      drawInterval = 8000,      // 8 segundos entre números
      pauseOnWinner = 2000      // 2 segundos de pausa al cantar línea
    } = options;

    // Verificar si ya hay un intervalo activo para esta sesión
    if (this.activeGames.has(gameSessionId)) {
      const existingGame = this.activeGames.get(gameSessionId);
      if (existingGame.interval && !existingGame.isEnded) {
        console.log(`[GameEngine] ⚠️ Sesión ${gameSessionId} ya tiene sorteo activo, ignorando`);
        return existingGame;
      }
    }

    // Buscar sesión: puede ser nueva (active/pending) o retomada (playing)
    const [sessions] = await pool.query(
      'SELECT * FROM game_sessions WHERE id = ? AND status IN (?, ?, ?)',
      [gameSessionId, 'active', 'pending', 'playing']
    );

    if (sessions.length === 0) {
      throw new Error('Sesión no encontrada o no está en estado válido para sorteo');
    }

    const session = sessions[0];
    const isResume = session.status === 'playing';

    // Solo cambiar status si no es retomar
    if (!isResume) {
      await pool.query(
        'UPDATE game_sessions SET status = ? WHERE id = ?',
        ['playing', gameSessionId]
      );
      console.log(`[GameEngine] 🎰 Sesión ${gameSessionId} cambiada a status 'playing'`);

      // LIMPIEZA Y REGENERACIÓN: Solo al iniciar nuevo sorteo (no al retomar)
      const cardPoolManager = require('./cardPoolManager');
      cardPoolManager.cleanAndRegenerateForSession(session.room).catch(err => {
        console.error('[GameEngine] Error en limpieza/regeneración al iniciar:', err);
      });
    } else {
      console.log(`[GameEngine] 🔄 Retomando sesión ${gameSessionId} desde bola ${session.bingo_ball_index || 0}`);
    }

    // Estado del juego
    const gameState = {
      sessionId: gameSessionId,
      roomId: session.room,
      ballsDrawn: [],
      availableBalls: this.generateBallPool(),
      interval: null,
      isPaused: false,
      lineWinnersPaid: false,           // Solo se paga UNA VEZ la primera línea
      lineWinnersThisBall: [],          // Ganadores de línea en esta bolilla
      bingoWinnersPaid: false,          // Control de BINGO pagado
      bingoWinnersThisBall: [],         // Ganadores de BINGO en esta bolilla
      isEnded: false,                   // NUEVA: Bandera para evitar cierre duplicado
      startedAt: Date.now(),            // NUEVA: Timestamp de inicio para timeout
      safetyTimeout: null               // NUEVA: Timeout de seguridad (15 min máximo)
    };

    this.activeGames.set(gameSessionId, gameState);

    // Obtener números ya cantados
    const [existingBalls] = await pool.query(
      'SELECT ball_number FROM game_session_balls WHERE game_session_id = ? ORDER BY draw_order',
      [gameSessionId]
    );

    gameState.ballsDrawn = existingBalls.map(b => b.ball_number);
    gameState.availableBalls = gameState.availableBalls.filter(
      b => !gameState.ballsDrawn.includes(b)
    );

    // Iniciar sorteo automático
    gameState.interval = setInterval(async () => {
      if (gameState.isPaused) return;
      if (gameState.isEnded) {
        console.log(`[GameEngine] ⚠️ Sorteo ${gameSessionId} ya terminado, limpiando intervalo residual`);
        clearInterval(gameState.interval);
        return;
      }

      try {
        await this.drawNextBall(gameSessionId, pauseOnWinner);
      } catch (error) {
        console.error(`[GameEngine] Error en sorteo ${gameSessionId}:`, error);
        this.stopGame(gameSessionId);
      }
    }, drawInterval);

    // TIMEOUT DE SEGURIDAD: Si pasan 15 minutos sin terminar, forzar cierre
    // (90 bolas × 8seg = 12min, damos 3min extra de margen)
    gameState.safetyTimeout = setTimeout(async () => {
      if (!gameState.isEnded && this.activeGames.has(gameSessionId)) {
        console.error(`[GameEngine] ⏰ TIMEOUT DE SEGURIDAD - Forzando cierre de sesión ${gameSessionId} después de 15 minutos`);
        await this.endGame(gameSessionId, 'completed');
      }
    }, 15 * 60 * 1000); // 15 minutos

    console.log(`[GameEngine] 🎮 Juego ${gameSessionId} iniciado (sala: ${session.room})`);
    console.log(`[GameEngine] 📊 Control de sorteo: ${gameState.availableBalls.length} bolas disponibles, timeout de seguridad: 15min`);
    
    this.io.to(`game_${session.room}`).emit('game_started', {
      gameSessionId,
      drawInterval,
      totalBalls: 90
    });

    return gameState;
  }

  generateBallPool() {
    const balls = [];
    for (let i = 1; i <= 90; i++) {
      balls.push(i);
    }
    return balls;
  }

  /**
   * Canta el siguiente número y valida TODOS los cartones automáticamente
   */
  async drawNextBall(gameSessionId, pauseOnWinner = 2000) {
    const gameState = this.activeGames.get(gameSessionId);
    if (!gameState) throw new Error('Juego no encontrado');

    // CONTROL: Si ya terminó, no hacer nada
    if (gameState.isEnded) {
      console.log(`[GameEngine] ⚠️ Sesión ${gameSessionId} ya terminada, ignorando drawNextBall`);
      return;
    }

    // CONTROL: 90 bolas sorteadas = FIN DEL SORTEO
    if (gameState.availableBalls.length === 0 || gameState.ballsDrawn.length >= 90) {
      console.log(`[GameEngine] 🏁 Juego ${gameSessionId} terminado - ${gameState.ballsDrawn.length} bolas sorteadas (COMPLETO)`);
      await this.endGame(gameSessionId, 'completed');
      return;
    }

    // Seleccionar bola aleatoria
    const randomIndex = Math.floor(Math.random() * gameState.availableBalls.length);
    const ballNumber = gameState.availableBalls[randomIndex];
    gameState.availableBalls.splice(randomIndex, 1);
    gameState.ballsDrawn.push(ballNumber);

    const ballLetter = this.getBallLetter(ballNumber);
    const drawOrder = gameState.ballsDrawn.length;

    await pool.query(
      `INSERT INTO game_session_balls (game_session_id, ball_number, ball_letter, draw_order)
       VALUES (?, ?, ?, ?)`,
      [gameSessionId, ballNumber, ballLetter, drawOrder]
    );

    // ACTUALIZAR índice de bola en la sesión para seguimiento
    await pool.query(
      `UPDATE game_sessions SET bingo_ball_index = ? WHERE id = ?`,
      [drawOrder, gameSessionId]
    );

    // Log con progreso del sorteo
    const progress = ((drawOrder / 90) * 100).toFixed(1);
    console.log(`[GameEngine] 🎱 ${ballLetter}-${ballNumber} (#${drawOrder}/90 - ${progress}%)`);

    // Verificar cuántos clientes hay en la sala
    const roomName = `game_${gameState.roomId}`;
    const roomSockets = this.io.sockets.adapter.rooms.get(roomName);
    const clientsCount = roomSockets ? roomSockets.size : 0;
    
    // Emitir a todos los jugadores
    this.io.to(roomName).emit('ball_drawn', {
      gameSessionId,
      ballNumber,
      ballLetter,
      drawOrder,
      totalDrawn: gameState.ballsDrawn.length,
      room: gameState.roomId  // Agregado para filtro en frontend
    });
    
    console.log(`[GameEngine] 📡 ball_drawn emitido a ${roomName} (${clientsCount} clientes)`);

    // VALIDAR AUTOMÁTICAMENTE TODOS LOS CARTONES
    await this.validateAllCards(gameSessionId, pauseOnWinner);

    // EMITIR REORDENAMIENTO DE CARTONES (para usuarios con múltiples cartones)
    await this.emitCardsReordering(gameSessionId);
  }

  /**
   * Emite evento de reordenamiento de cartones a cada usuario
   * NOTA: Deshabilitado temporalmente porque CardAnalyzer espera formato 5x5 
   * pero los cartones son 3x9 (bingo europeo 90 bolas)
   */
  async emitCardsReordering(gameSessionId) {
    // TODO: Actualizar CardAnalyzer para soportar formato 3x9
    // Por ahora deshabilitado para evitar errores
    return;
    
    try {
      const CardAnalyzer = require('./cardAnalyzer');

      // CORREGIDO: Obtener todos los usuarios con cartones seleccionados en esta sesión
      const [users] = await pool.query(
        `SELECT DISTINCT selected_by as user_id FROM bingo_cards_pool 
         WHERE game_session_id = ? AND status = 'selected'`,
        [gameSessionId]
      );

      // Para cada usuario, analizar sus cartones y emitir evento personal
      for (const { user_id } of users) {
        // CORREGIDO: Obtener cartones del usuario desde bingo_cards_pool
        const [userCards] = await pool.query(
          `SELECT id, card_serial, numbers, grid_data, selected_by as user_id 
           FROM bingo_cards_pool 
           WHERE selected_by = ? AND game_session_id = ? AND status = 'selected'
           ORDER BY id ASC`,
          [user_id, gameSessionId]
        );

        if (userCards.length <= 1) continue; // Skip si tiene 1 o menos cartones

        // Obtener números cantados
        const gameState = this.activeGames.get(gameSessionId);
        const calledNumbers = gameState ? gameState.ballsDrawn : [];

        // Analizar con CardAnalyzer
        const analysis = CardAnalyzer.analyzeUserCards(userCards, calledNumbers);
        const stackedCards = CardAnalyzer.generateStackedView(analysis.cards);

        // Emitir evento personal al usuario
        this.io.to(`user_${user_id}`).emit('cards_reordered', {
          gameSessionId,
          cards: stackedCards.map(c => ({
            cardId: c.cardId,
            score: c.score,
            progress: c.progress,
            markedCount: c.markedCount,
            viewConfig: c.viewConfig
          })),
          alerts: analysis.alerts,
          summary: {
            totalCards: analysis.totalCards,
            averageProgress: analysis.summary.averageProgress
          }
        });

        // 🔔 Notificaciones WhatsApp de casi-victoria (solo 1-2 números faltantes)
        if (analysis.alerts && analysis.alerts.length > 0) {
          for (const alert of analysis.alerts) {
            // Solo notificar si falta 1 o 2 números
            if (alert.missing && alert.missing <= 2) {
              const isLine = alert.type === 'line' || alert.message?.includes('línea');
              whatsapp24KService.notifyAlmostWin(user_id, {
                type: isLine ? 'line' : 'bingo',
                missing: alert.missing,
                cardSerial: alert.cardSerial || `#${alert.cardId}`,
                numbersNeeded: alert.numbersNeeded || []
              }).catch(err => console.error('[WhatsApp] Error notificando casi-victoria:', err));
              break; // Solo una notificación por usuario por bolilla
            }
          }
        }
      }
    } catch (error) {
      console.error('[GameEngine] Error emitiendo reordenamiento:', error);
    }
  }

  /**
   * Valida automáticamente todos los cartones activos
   * REGLAS NUEVAS:
   * - Solo LÍNEAS HORIZONTALES
   * - Solo se paga la PRIMERA línea de toda la partida
   * - Si múltiples cartones completan en la misma bolilla: SE DIVIDE el pozo
   * - BINGO: cartón completo (25/25), división si múltiples ganadores
   */
  async validateAllCards(gameSessionId, pauseOnWinner) {
    const gameState = this.activeGames.get(gameSessionId);

    // CORREGIDO: Buscar en bingo_cards_pool donde realmente están los cartones seleccionados
    const [cards] = await pool.query(
      `SELECT bcp.id, bcp.card_serial, bcp.numbers, bcp.grid_data, bcp.selected_by as user_id, 
              bcp.status, u.username 
       FROM bingo_cards_pool bcp
       JOIN users u ON bcp.selected_by = u.id
       WHERE bcp.game_session_id = ? AND bcp.status = 'selected'`,
      [gameSessionId]
    );

    if (cards.length === 0) return;

    const calledNumbers = gameState.ballsDrawn;

    // Limpiar arrays de ganadores de esta bolilla
    gameState.lineWinnersThisBall = [];
    gameState.bingoWinnersThisBall = [];

    // FASE 1: Detectar todos los ganadores de LÍNEA en esta bolilla
    if (!gameState.lineWinnersPaid) {
      for (const card of cards) {
        const userId = card.user_id;
        const username = card.username;

        let cardNumbers;
        if (card.numbers) {
          cardNumbers = typeof card.numbers === 'string' ? JSON.parse(card.numbers) : card.numbers;
        } else if (card.grid_data) {
          const gridData = typeof card.grid_data === 'string' ? JSON.parse(card.grid_data) : card.grid_data;
          cardNumbers = this.convertGridDataToMatrix(gridData);
        } else {
          continue;
        }

        // Verificar si tiene alguna línea horizontal completa
        const lineResult = this.checkHorizontalLines(cardNumbers, calledNumbers);
        
        if (lineResult.hasLine) {
          gameState.lineWinnersThisBall.push({
            cardId: card.id,
            userId,
            username,
            lineType: lineResult.lineType,
            winningNumbers: lineResult.winningNumbers
          });
        }
      }

      // Si encontramos ganadores de línea, pagar
      if (gameState.lineWinnersThisBall.length > 0) {
        await this.payLineWinners(gameSessionId, gameState.lineWinnersThisBall);
        gameState.lineWinnersPaid = true;
        
        // PAUSAR para celebrar
        gameState.isPaused = true;
        setTimeout(() => {
          gameState.isPaused = false;
        }, pauseOnWinner);
      }
    }

    // FASE 2: Detectar todos los ganadores de BINGO en esta bolilla
    if (!gameState.bingoWinnersPaid) {
      for (const card of cards) {
        const userId = card.user_id;
        const username = card.username;

        let cardNumbers;
        if (card.numbers) {
          cardNumbers = typeof card.numbers === 'string' ? JSON.parse(card.numbers) : card.numbers;
        } else if (card.grid_data) {
          const gridData = typeof card.grid_data === 'string' ? JSON.parse(card.grid_data) : card.grid_data;
          cardNumbers = this.convertGridDataToMatrix(gridData);
        } else {
          continue;
        }

        const bingoResult = this.validateBingo(cardNumbers, calledNumbers);
        
        if (bingoResult.isValid) {
          gameState.bingoWinnersThisBall.push({
            cardId: card.id,
            userId,
            username,
            winningNumbers: bingoResult.winningNumbers
          });
        }
      }

      // Si encontramos ganadores de BINGO, pagar y terminar
      if (gameState.bingoWinnersThisBall.length > 0) {
        await this.payBingoWinners(gameSessionId, gameState.bingoWinnersThisBall);
        gameState.bingoWinnersPaid = true;
        await this.endGame(gameSessionId, 'completed');
      }
    }
  }

  /**
   * Verifica si el cartón tiene alguna línea HORIZONTAL completa
   * BINGO 90: Matriz 3x9, cada fila tiene 5 números y 4 espacios (null)
   * Solo líneas horizontales según reglas del bingo europeo
   */
  checkHorizontalLines(cardNumbers, calledNumbers) {
    // BINGO 90: Solo 3 filas horizontales
    const horizontalLines = [
      { type: 'horizontal_1', row: 0 },
      { type: 'horizontal_2', row: 1 },
      { type: 'horizontal_3', row: 2 }
    ];

    for (const line of horizontalLines) {
      const winningNumbers = [];
      let numbersInRow = 0;
      let markedInRow = 0;

      // Recorrer las 9 columnas de la fila
      for (let col = 0; col < 9; col++) {
        const number = cardNumbers[line.row] ? cardNumbers[line.row][col] : null;
        
        // Solo procesar celdas con números (no null/undefined)
        if (number !== null && number !== undefined) {
          numbersInRow++;
          if (calledNumbers.includes(number)) {
            winningNumbers.push(number);
            markedInRow++;
          }
        }
      }

      // Una línea está completa si los 5 números de la fila fueron cantados
      if (markedInRow === 5 && numbersInRow === 5) {
        return {
          hasLine: true,
          lineType: line.type,
          winningNumbers
        };
      }
    }

    return { hasLine: false };
  }

  /**
   * Paga a los ganadores de línea (puede haber múltiples)
   * ✅ ACREDITACIÓN INMEDIATA: El premio se suma al balance del jugador al instante
   * ✅ VACIADO DE POZO: El pozo de línea se vacía después del pago
   * 
   * Para sala STARTER: Se acreditan tickets en lugar de dinero
   */
  async payLineWinners(gameSessionId, winners) {
    const [session] = await pool.query('SELECT * FROM game_sessions WHERE id = ?', [gameSessionId]);
    const sessionData = session[0];
    const totalPrize = sessionData.line_prize || sessionData.current_pot_linea || 2500;
    const prizePerWinner = totalPrize / winners.length;
    const isStarterRoom = sessionData.room === 'starter';

    const gameState = this.activeGames.get(gameSessionId);

    console.log(`[GameEngine] 🎉 LÍNEA COMPLETADA - ${winners.length} ganador(es) en sala ${sessionData.room}`);
    
    for (const winner of winners) {
      // Registrar en tabla de ganadores (IGNORE para evitar duplicados)
      try {
        await pool.query(
          `INSERT IGNORE INTO game_winners 
           (game_session_id, user_id, card_id, prize_type, prize_amount, line_type, winning_numbers, verified)
           VALUES (?, ?, ?, 'linea', ?, ?, ?, TRUE)`,
          [gameSessionId, winner.userId, winner.cardId, prizePerWinner, winner.lineType, JSON.stringify(winner.winningNumbers)]
        );
      } catch (insertError) {
        console.log(`   ⚠️ Ganador ya registrado: ${winner.username}`);
      }

      // ✅ ACREDITACIÓN INMEDIATA AL BALANCE
      if (!isStarterRoom) {
        // Salas monetizadas: Acreditar dinero al balance
        try {
          await ChipsService.recordGameMovement(
            winner.userId,
            prizePerWinner,
            gameSessionId,
            'prize',
            `Premio LÍNEA - Sala ${sessionData.room.toUpperCase()}`
          );
          console.log(`   💰 ${winner.username}: $${prizePerWinner.toFixed(2)} ACREDITADO al balance`);
        } catch (err) {
          console.error(`   ❌ Error acreditando premio a ${winner.username}:`, err.message);
        }
      } else {
        // Sala Starter: Acreditar tickets
        try {
          const ticketReward = sessionData.line_prize || 2; // 2 tickets por línea por defecto
          await pool.query(
            `INSERT INTO user_inventory (user_id, item_id, quantity, obtained_at)
             VALUES (?, (SELECT id FROM cosmetic_items WHERE ticket_room = 'bronce' LIMIT 1), ?, NOW())
             ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
            [winner.userId, ticketReward, ticketReward]
          );
          console.log(`   🎫 ${winner.username}: ${ticketReward} tickets Bronce ACREDITADOS`);
        } catch (err) {
          console.error(`   ❌ Error acreditando tickets a ${winner.username}:`, err.message);
        }
      }

      console.log(`   → ${winner.username}: $${prizePerWinner.toFixed(2)} (${winner.lineType})`);

      // Obtener datos completos del cartón ganador
      const [cardRows] = await pool.query(
        'SELECT numbers, grid_data FROM bingo_cards_pool WHERE id = ?',
        [winner.cardId]
      );

      let cardNumbers = null;
      if (cardRows.length > 0) {
        const card = cardRows[0];
        if (card.numbers) {
          cardNumbers = typeof card.numbers === 'string' ? JSON.parse(card.numbers) : card.numbers;
        } else if (card.grid_data) {
          const gridData = typeof card.grid_data === 'string' ? JSON.parse(card.grid_data) : card.grid_data;
          cardNumbers = this.convertGridDataToMatrix(gridData);
        }
      }

      notifyLineWinner(
        this.io,
        gameState.roomId,
        { id: winner.userId, username: winner.username },
        prizePerWinner,
        winner.lineType,
        cardNumbers ? {
          numbers: cardNumbers,
          winningNumbers: winner.winningNumbers
        } : null
      );

      // 🔔 Notificación WhatsApp de premio LÍNEA
      whatsapp24KService.notifyPrizeWon(winner.userId, {
        type: 'line',
        amount: prizePerWinner,
        cardSerial: winner.cardSerial || `#${winner.cardId}`,
        room: gameState.roomId
      }).catch(err => console.error('[WhatsApp] Error notificando línea:', err));
    }

    // ✅ VACIAR POZO DE LÍNEA
    await pool.query(
      'UPDATE game_sessions SET current_pot_linea = 0 WHERE id = ?',
      [gameSessionId]
    );
    console.log(`[GameEngine] 🔄 Pozo de LÍNEA vaciado (sesión ${gameSessionId})`);

    // Notificar actualización de pozos via Socket
    this.io.to(`game_${gameState.roomId}`).emit('pots_updated', {
      room: gameState.roomId,
      line: 0,
      lineWinnersPaid: true
    });

    if (winners.length > 1) {
      console.log(`   💰 Pozo dividido: $${totalPrize} / ${winners.length} = $${prizePerWinner.toFixed(2)} c/u`);
    }
  }

  /**
   * Paga a los ganadores de BINGO (puede haber múltiples)
   * ✅ ACREDITACIÓN INMEDIATA: El premio se suma al balance del jugador al instante
   * ✅ VACIADO DE POZOS: Los pozos de bingo y pre-40 se vacían después del pago
   * ✅ FIN DEL SORTEO: El sorteo termina inmediatamente después de BINGO
   * 
   * REGLA PRE-40: Si BINGO antes de bola 40, ganador recibe jackpot_pre40
   *               Si BINGO después de bola 40, pre-40 se acumula a próxima sesión
   * 
   * Para sala STARTER: Se acreditan tickets en lugar de dinero
   */
  async payBingoWinners(gameSessionId, winners) {
    const [session] = await pool.query('SELECT * FROM game_sessions WHERE id = ?', [gameSessionId]);
    const sessionData = session[0];
    const totalPrize = sessionData.bingo_prize || sessionData.current_pot_bingo || 25000;
    const prizePerWinner = totalPrize / winners.length;
    const isStarterRoom = sessionData.room === 'starter';

    const gameState = this.activeGames.get(gameSessionId);
    const currentBallIndex = gameState ? gameState.ballsDrawn.length : 0;
    const isBeforeBall40 = currentBallIndex <= 40;

    console.log(`[GameEngine] 🎊 BINGO COMPLETADO - ${winners.length} ganador(es) en bola #${currentBallIndex} (sala ${sessionData.room})`);
    
    // Verificar si hay jackpot pre-40 para pagar
    const pre40Amount = parseFloat(sessionData.jackpot_pre40) || 0;
    let pre40Paid = false;

    if (isBeforeBall40 && pre40Amount > 0) {
      console.log(`[GameEngine] 🎰 ¡BINGO ANTES DE BOLA 40! Jackpot Pre-40: $${pre40Amount.toFixed(2)}`);
      pre40Paid = true;
    } else if (!isBeforeBall40 && pre40Amount > 0) {
      console.log(`[GameEngine] 📤 BINGO después de bola 40 - Pre-40 ($${pre40Amount.toFixed(2)}) se acumula a próxima sesión`);
      // Transferir pre-40 a próxima sesión
      await this.transferPre40ToNextSession(gameSessionId, gameState.roomId, pre40Amount);
    }
    
    for (const winner of winners) {
      // Premio base de bingo
      let totalWinnerPrize = prizePerWinner;
      
      // Si ganó antes de bola 40, agregar el pre-40
      if (pre40Paid) {
        const pre40PerWinner = pre40Amount / winners.length;
        totalWinnerPrize += pre40PerWinner;
        
        // Registrar premio pre-40 separado (IGNORE para evitar duplicados)
        try {
          await pool.query(
            `INSERT IGNORE INTO game_winners 
             (game_session_id, user_id, card_id, prize_type, prize_amount, winning_numbers, verified)
             VALUES (?, ?, ?, 'pre40', ?, ?, TRUE)`,
            [gameSessionId, winner.userId, winner.cardId, pre40PerWinner, JSON.stringify(winner.winningNumbers)]
          );
          console.log(`   🎰 ${winner.username}: +$${pre40PerWinner.toFixed(2)} (PRE-40)`);
        } catch (insertError) {
          console.log(`   ⚠️ PRE-40 ya registrado: ${winner.username}`);
        }
      }

      // Registrar ganador de BINGO (IGNORE para evitar duplicados)
      try {
        await pool.query(
          `INSERT IGNORE INTO game_winners 
           (game_session_id, user_id, card_id, prize_type, prize_amount, winning_numbers, verified)
           VALUES (?, ?, ?, 'bingo', ?, ?, TRUE)`,
          [gameSessionId, winner.userId, winner.cardId, prizePerWinner, JSON.stringify(winner.winningNumbers)]
        );
      } catch (insertError) {
        console.log(`   ⚠️ BINGO ya registrado: ${winner.username}`);
      }

      // ✅ ACREDITACIÓN INMEDIATA AL BALANCE
      if (!isStarterRoom) {
        // Salas monetizadas: Acreditar dinero al balance
        try {
          await ChipsService.recordGameMovement(
            winner.userId,
            totalWinnerPrize,
            gameSessionId,
            'prize',
            `Premio BINGO${pre40Paid ? ' + PRE-40' : ''} - Sala ${sessionData.room.toUpperCase()}`
          );
          console.log(`   💰 ${winner.username}: $${totalWinnerPrize.toFixed(2)} ACREDITADO al balance`);
        } catch (err) {
          console.error(`   ❌ Error acreditando premio a ${winner.username}:`, err.message);
        }
      } else {
        // Sala Starter: Acreditar tickets
        try {
          const ticketReward = sessionData.bingo_prize || 5; // 5 tickets por bingo por defecto
          await pool.query(
            `INSERT INTO user_inventory (user_id, item_id, quantity, obtained_at)
             VALUES (?, (SELECT id FROM cosmetic_items WHERE ticket_room = 'bronce' LIMIT 1), ?, NOW())
             ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
            [winner.userId, ticketReward, ticketReward]
          );
          console.log(`   🎫 ${winner.username}: ${ticketReward} tickets Bronce ACREDITADOS`);
        } catch (err) {
          console.error(`   ❌ Error acreditando tickets a ${winner.username}:`, err.message);
        }
      }

      console.log(`   → ${winner.username}: $${prizePerWinner.toFixed(2)} (BINGO) = Total: $${totalWinnerPrize.toFixed(2)}`);

      notifyBingoWinner(
        this.io,
        gameState.roomId,
        { id: winner.userId, username: winner.username },
        totalWinnerPrize,
        gameSessionId
      );

      // 🔔 Notificación WhatsApp de premio BINGO
      whatsapp24KService.notifyPrizeWon(winner.userId, {
        type: pre40Paid ? 'bingo_pre40' : 'bingo',
        amount: totalWinnerPrize,
        cardSerial: winner.cardSerial || `#${winner.cardId}`,
        room: gameState.roomId
      }).catch(err => console.error('[WhatsApp] Error notificando bingo:', err));
    }

    // ✅ VACIAR POZOS DE BINGO
    await pool.query(
      'UPDATE game_sessions SET current_pot_bingo = 0 WHERE id = ?',
      [gameSessionId]
    );
    console.log(`[GameEngine] 🔄 Pozo de BINGO vaciado (sesión ${gameSessionId})`);

    // Si se pagó el pre-40, resetear en la sesión actual
    if (pre40Paid) {
      await pool.query(
        'UPDATE game_sessions SET jackpot_pre40 = 0, current_pot_jackpot = 0 WHERE id = ?',
        [gameSessionId]
      );
      console.log(`[GameEngine] 🔄 Jackpot Pre-40 reseteado después de pago`);
    }

    // Notificar actualización de pozos via Socket
    this.io.to(`game_${gameState.roomId}`).emit('pots_updated', {
      room: gameState.roomId,
      bingo: 0,
      pre40: pre40Paid ? 0 : pre40Amount,
      bingoWinnersPaid: true,
      gameEnded: true
    });

    if (winners.length > 1) {
      console.log(`   💰 Pozo dividido: $${totalPrize} / ${winners.length} = $${prizePerWinner.toFixed(2)} c/u`);
    }
  }

  /**
   * Transfiere el jackpot pre-40 a la próxima sesión (cuando BINGO es después de bola 40)
   */
  async transferPre40ToNextSession(currentSessionId, roomType, amount) {
    try {
      // Buscar próxima sesión de la misma sala
      const [nextSessions] = await pool.query(`
        SELECT id FROM game_sessions 
        WHERE room = ? AND id > ? AND status IN ('pending', 'active')
        ORDER BY id ASC LIMIT 1
      `, [roomType, currentSessionId]);

      if (nextSessions.length > 0) {
        const nextSessionId = nextSessions[0].id;
        await pool.query(`
          UPDATE game_sessions 
          SET jackpot_pre40 = jackpot_pre40 + ?,
              current_pot_jackpot = current_pot_jackpot + ?,
              jackpot_source_id = ?
          WHERE id = ?
        `, [amount, amount, currentSessionId, nextSessionId]);
        
        console.log(`[GameEngine] 📤 Pre-40 ($${amount.toFixed(2)}) transferido a sesión #${nextSessionId}`);
      } else {
        console.log(`[GameEngine] ⚠️ No hay próxima sesión para transferir pre-40, se mantiene en room_settings`);
        // Guardar en room_settings como respaldo
        await pool.query(`
          UPDATE room_settings 
          SET accumulated_pot_pre40 = accumulated_pot_pre40 + ?
          WHERE room = ?
        `, [amount, roomType]);
      }

      // Resetear pre-40 de sesión actual (ya transferido)
      await pool.query(`
        UPDATE game_sessions 
        SET jackpot_pre40 = 0, current_pot_jackpot = 0
        WHERE id = ?
      `, [currentSessionId]);

    } catch (error) {
      console.error('[GameEngine] Error transfiriendo pre-40:', error);
    }
  }

  /**
   * Termina el juego y muestra formularios de pago
   * GARANTIZA cierre correcto del sorteo
   */
  async endGame(gameSessionId, status = 'completed') {
    const gameState = this.activeGames.get(gameSessionId);
    if (!gameState) {
      console.log(`[GameEngine] ⚠️ endGame llamado pero no hay gameState para sesión ${gameSessionId}`);
      // Igual actualizar BD por seguridad
      await pool.query('UPDATE game_sessions SET status = ? WHERE id = ? AND status = ?', [status, gameSessionId, 'playing']);
      return;
    }

    // BANDERA: Evitar cierre duplicado
    if (gameState.isEnded) {
      console.log(`[GameEngine] ⚠️ Sesión ${gameSessionId} ya fue terminada previamente, ignorando`);
      return;
    }
    gameState.isEnded = true;

    // Limpiar intervalo de sorteo
    if (gameState.interval) {
      clearInterval(gameState.interval);
      gameState.interval = null;
    }

    // Limpiar timeout de seguridad
    if (gameState.safetyTimeout) {
      clearTimeout(gameState.safetyTimeout);
      gameState.safetyTimeout = null;
    }

    console.log(`[GameEngine] 🔒 Cerrando sesión ${gameSessionId} con status '${status}'`);

    // ACTUALIZACIÓN ATÓMICA: status + bingo_ball_index final
    const finalBallCount = gameState.ballsDrawn.length;
    await pool.query(
      'UPDATE game_sessions SET status = ?, bingo_ball_index = ? WHERE id = ?',
      [status, finalBallCount, gameSessionId]
    );
    console.log(`[GameEngine] ✅ BD actualizada: status='${status}', bingo_ball_index=${finalBallCount}`);

    // ====== ARCHIVADO DE CARTONES ======
    // Los cartones vendidos de esta sesión pasan a 'used' (participaron en el sorteo)
    const [usedResult] = await pool.query(`
      UPDATE bingo_cards_pool 
      SET status = 'used'
      WHERE game_session_id = ? 
      AND status = 'sold'
    `, [gameSessionId]);
    
    console.log(`[GameEngine] 📦 ${usedResult.affectedRows} cartones archivados como 'used' (sesión #${gameSessionId})`);

    // NOTA: Los cartones 'selected' NO se eliminan - se migran a la próxima sesión
    // via scheduler.assignCardsToSession() para que el usuario no los pierda

    console.log(`[GameEngine] 🏁 Juego ${gameSessionId} terminado (${gameState.ballsDrawn.length} bolas sorteadas)`);

    this.io.to(`game_${gameState.roomId}`).emit('game_ended', {
      gameSessionId,
      status,
      totalBallsDrawn: gameState.ballsDrawn.length
    });

    // ====== NOTIFICACIÓN PERSISTENTE DEL SORTEO ======
    // Obtener datos de ganadores y premios para la notificación
    setTimeout(async () => {
      try {
        const winners = await this.getGameWinners(gameSessionId);
        
        // Obtener pozos finales de la sesión
        const [sessionData] = await pool.query(
          `SELECT jackpot_linea, jackpot_bingo, current_pot_linea, current_pot_bingo 
           FROM game_sessions WHERE id = ?`,
          [gameSessionId]
        );
        
        const session = sessionData[0] || {};
        
        // Separar ganadores por tipo
        const lineWinners = [];
        const bingoWinners = [];
        let totalLinePrize = 0;
        let totalBingoPrize = 0;
        
        winners.forEach(w => {
          w.prizes.forEach(p => {
            if (p.type === 'line' || p.type === 'linea') {
              lineWinners.push({ userId: w.userId, username: w.username, amount: p.amount });
              totalLinePrize += p.amount;
            } else if (p.type === 'bingo') {
              bingoWinners.push({ userId: w.userId, username: w.username, amount: p.amount });
              totalBingoPrize += p.amount;
            }
          });
        });
        
        // Enviar notificación global del resultado del sorteo
        await persistentNotifications.notifySorteoResult({
          sessionId: gameSessionId,
          room: gameState.roomId,
          lineWinners,
          bingoWinners,
          linePrize: totalLinePrize || session.current_pot_linea || 0,
          bingoPrize: totalBingoPrize || session.current_pot_bingo || 0,
          totalBalls: gameState.ballsDrawn.length
        });
        
        console.log(`[GameEngine] 📢 Notificación de sorteo #${gameSessionId} enviada`);
        
        // Mostrar formularios de pago si hay ganadores
        if (winners.length > 0) {
          showPaymentForms(this.io, gameSessionId, winners);
        }
      } catch (notifError) {
        console.error('[GameEngine] Error enviando notificación de sorteo:', notifError);
      }
    }, 3000);

    // NOTA: La creación de próxima sesión ahora la maneja el Scheduler (SessionCreator)
    // Ya no usamos timeout aquí porque el SessionCreator crea la próxima sesión
    // mientras esta está sorteando, y ya tiene los cartones asignados

    this.activeGames.delete(gameSessionId);
  }

  /**
   * Crea la próxima sesión para la sala especificada (para reabrir ventas)
   */
  async createNextHourlySession(room) {
    const now = new Date();
    
    // Calcular próxima hora de sorteo basado en la sala
    const roomSchedule = {
      'bronce': 0,       // :00 cada hora
      'plata': 15,       // :15 cada hora
      'oro': 30,         // :30 cada hora
      'starter': 45      // :45 cada hora
    };

    const minuteOffset = roomSchedule[room];
    if (minuteOffset === undefined) {
      console.warn(`[GameEngine] Sala ${room} no tiene horario programado`);
      return null;
    }

    // Próxima hora
    const nextHour = new Date(now);
    nextHour.setMinutes(minuteOffset, 0, 0);
    
    // Si ya pasó el horario de esta hora, programar para la siguiente
    if (nextHour <= now) {
      nextHour.setHours(nextHour.getHours() + 1);
    }

    // Configuración de premios por sala (jackpots iniciales)
    const roomConfig = {
      'bronce': { linePrize: 2500, bingoPrize: 10000 },
      'plata': { linePrize: 5000, bingoPrize: 25000 },
      'oro': { linePrize: 10000, bingoPrize: 50000 },
      'starter': { linePrize: 500, bingoPrize: 2000 }
    };

    const config = roomConfig[room] || { linePrize: 2500, bingoPrize: 10000 };

    // Crear sesión - usar columnas correctas (jackpot_linea, jackpot_bingo)
    const [result] = await pool.query(
      `INSERT INTO game_sessions (room, start_time, status, jackpot_linea, jackpot_bingo, current_pot_bingo, current_pot_linea, is_preventa)
       VALUES (?, ?, 'pending', ?, ?, 0.00, 0.00, true)`,
      [room, nextHour, config.linePrize, config.bingoPrize]
    );

    console.log(`[GameEngine] ✅ Sesión ${result.insertId} creada para ${room} - ${nextHour.toLocaleTimeString()}`);
    
    return result.insertId;
  }

  async stopGame(gameSessionId) {
    const gameState = this.activeGames.get(gameSessionId);
    if (!gameState) return;

    if (gameState.interval) {
      clearInterval(gameState.interval);
      gameState.interval = null;
    }

    // Cambiar status a 'finished' para indicar que el sorteo terminó
    try {
      await pool.query(
        'UPDATE game_sessions SET status = ? WHERE id = ?',
        ['finished', gameSessionId]
      );
      console.log(`[GameEngine] 🏁 Sesión ${gameSessionId} cambiada a status 'finished'`);
    } catch (error) {
      console.error(`[GameEngine] Error actualizando status a finished:`, error);
    }

    console.log(`[GameEngine] 🛑 Juego ${gameSessionId} detenido`);
    this.activeGames.delete(gameSessionId);
  }

  togglePause(gameSessionId) {
    const gameState = this.activeGames.get(gameSessionId);
    if (!gameState) return false;

    gameState.isPaused = !gameState.isPaused;
    console.log(`[GameEngine] ${gameState.isPaused ? '⏸️ Pausado' : '▶️ Reanudado'}`);
    return gameState.isPaused;
  }

  // ===== FUNCIONES DE VALIDACIÓN =====

  // BINGO 90 europeo: las bolas se organizan por decenas (columnas del cartón)
  getBallLetter(number) {
    if (number >= 1 && number <= 9) return 'D1';   // Decena 1 (1-9)
    if (number >= 10 && number <= 19) return 'D2'; // Decena 2 (10-19)
    if (number >= 20 && number <= 29) return 'D3'; // Decena 3 (20-29)
    if (number >= 30 && number <= 39) return 'D4'; // Decena 4 (30-39)
    if (number >= 40 && number <= 49) return 'D5'; // Decena 5 (40-49)
    if (number >= 50 && number <= 59) return 'D6'; // Decena 6 (50-59)
    if (number >= 60 && number <= 69) return 'D7'; // Decena 7 (60-69)
    if (number >= 70 && number <= 79) return 'D8'; // Decena 8 (70-79)
    if (number >= 80 && number <= 90) return 'D9'; // Decena 9 (80-90)
    return '?';
  }

  /**
   * Valida una línea específica del cartón (BINGO 90)
   * En bingo europeo no hay casilla FREE
   */
  validateLine(cardNumbers, calledNumbers, lineType) {
    const positions = this.getLinePositions(lineType);
    const winningNumbers = [];
    const missingNumbers = [];

    for (const [row, col] of positions) {
      const number = cardNumbers[row] ? cardNumbers[row][col] : null;

      // Solo procesar celdas con números (no null/undefined)
      if (number !== null && number !== undefined) {
        if (calledNumbers.includes(number)) {
          winningNumbers.push(number);
        } else {
          missingNumbers.push(number);
        }
      }
    }

    return {
      isValid: missingNumbers.length === 0 && winningNumbers.length === 5,
      winningNumbers,
      missingNumbers
    };
  }

  /**
   * Valida si un cartón tiene BINGO completo
   * BINGO 90: Matriz 3x9, 15 números totales (5 por fila, 3 filas)
   * No hay casilla FREE en bingo europeo
   */
  validateBingo(cardNumbers, calledNumbers) {
    const winningNumbers = [];
    const missingNumbers = [];

    // Recorrer matriz 3x9
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 9; col++) {
        const number = cardNumbers[row] ? cardNumbers[row][col] : null;

        // Solo procesar celdas con números (no null/undefined)
        if (number !== null && number !== undefined) {
          if (calledNumbers.includes(number)) {
            winningNumbers.push(number);
          } else {
            missingNumbers.push(number);
          }
        }
      }
    }

    return {
      isValid: missingNumbers.length === 0 && winningNumbers.length === 15,
      winningNumbers,
      missingNumbers,
      totalMarked: winningNumbers.length,
      totalNeeded: 15
    };
  }

  /**
   * Obtiene posiciones de una línea (BINGO 90: solo horizontales en matriz 3x9)
   */
  getLinePositions(lineType) {
    switch (lineType) {
      // BINGO 90: Solo 3 líneas horizontales, cada una con 9 columnas (5 números + 4 nulls)
      case 'horizontal_1': return [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8]];
      case 'horizontal_2': return [[1,0],[1,1],[1,2],[1,3],[1,4],[1,5],[1,6],[1,7],[1,8]];
      case 'horizontal_3': return [[2,0],[2,1],[2,2],[2,3],[2,4],[2,5],[2,6],[2,7],[2,8]];
      default: return [];
    }
  }

  /**
   * Convierte formatos de grid_data a matriz 3x9 para BINGO 90
   */
  convertGridDataToMatrix(gridData) {
    // Si ya es matriz 3x9, devolverla directamente
    if (Array.isArray(gridData) && gridData.length === 3 && Array.isArray(gridData[0]) && gridData[0].length === 9) {
      return gridData;
    }

    // Si es array plano de 27 elementos, convertir a 3x9
    if (Array.isArray(gridData) && gridData.length === 27) {
      const matrix = [];
      for (let i = 0; i < 3; i++) {
        matrix.push(gridData.slice(i * 9, (i + 1) * 9));
      }
      return matrix;
    }

    // Si es objeto con columnas por decena (D1-D9)
    if (typeof gridData === 'object' && (gridData.D1 || gridData.col_0)) {
      const matrix = [[], [], []];
      for (let col = 0; col < 9; col++) {
        const colData = gridData[`D${col + 1}`] || gridData[`col_${col}`] || [null, null, null];
        for (let row = 0; row < 3; row++) {
          matrix[row].push(colData[row] || null);
        }
      }
      return matrix;
    }

    console.warn('[GameEngine] Formato de grid_data no reconocido:', typeof gridData);
    return [[null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null]];
  }

  async getGameWinners(gameSessionId) {
    const [winners] = await pool.query(
      `SELECT gw.user_id, u.username, gw.prize_type, gw.prize_amount
       FROM game_winners gw
       JOIN users u ON gw.user_id = u.id
       WHERE gw.game_session_id = ?
       ORDER BY gw.claimed_at`,
      [gameSessionId]
    );

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
   * Pausar el sorteo automático (SuperAdmin only)
   */
  pauseGame(gameSessionId) {
    const gameState = this.activeGames.get(gameSessionId);
    if (!gameState) {
      throw new Error('Juego no encontrado');
    }

    if (gameState.isPaused) {
      throw new Error('El juego ya está pausado');
    }

    gameState.isPaused = true;
    console.log(`[GameEngine] ⏸️ Juego ${gameSessionId} pausado`);

    // Notificar a todos los jugadores
    this.io.to(`session_${gameSessionId}`).emit('game_paused', {
      gameSessionId,
      message: 'El sorteo ha sido pausado temporalmente'
    });

    return { success: true, message: 'Juego pausado' };
  }

  /**
   * Reanudar el sorteo automático (SuperAdmin only)
   */
  resumeGame(gameSessionId) {
    const gameState = this.activeGames.get(gameSessionId);
    if (!gameState) {
      throw new Error('Juego no encontrado');
    }

    if (!gameState.isPaused) {
      throw new Error('El juego no está pausado');
    }

    gameState.isPaused = false;
    console.log(`[GameEngine] ▶️ Juego ${gameSessionId} reanudado`);

    // Notificar a todos los jugadores
    this.io.to(`session_${gameSessionId}`).emit('game_resumed', {
      gameSessionId,
      message: 'El sorteo ha sido reanudado'
    });

    return { success: true, message: 'Juego reanudado' };
  }

  /**
   * Obtener el estado actual del sorteo para una sala
   * Usado cuando un jugador entra a mitad del sorteo
   */
  getActiveGameForRoom(roomId) {
    // Buscar en los juegos activos cuál corresponde a esta sala
    for (const [sessionId, gameState] of this.activeGames) {
      if (gameState.roomId === roomId) {
        return {
          sessionId: sessionId,
          room: gameState.roomId,
          isActive: true,
          isPaused: gameState.isPaused,
          ballsDrawn: gameState.ballsDrawn.map(num => ({
            number: num,
            letter: this.getBallLetter(num)
          })),
          totalBallsDrawn: gameState.ballsDrawn.length,
          lineWinnersPaid: gameState.lineWinnersPaid,
          bingoWinnersPaid: gameState.bingoWinnersPaid
        };
      }
    }
    return null; // No hay sorteo activo en esta sala
  }

  /**
   * Obtener el estado de cualquier sesión activa (por sessionId)
   */
  getGameState(gameSessionId) {
    const gameState = this.activeGames.get(gameSessionId);
    if (!gameState) return null;
    
    return {
      sessionId: gameSessionId,
      room: gameState.roomId,
      isActive: true,
      isPaused: gameState.isPaused,
      ballsDrawn: gameState.ballsDrawn.map(num => ({
        number: num,
        letter: this.getBallLetter(num)
      })),
      totalBallsDrawn: gameState.ballsDrawn.length,
      lineWinnersPaid: gameState.lineWinnersPaid,
      bingoWinnersPaid: gameState.bingoWinnersPaid
    };
  }

  /**
   * Verificar si hay un juego activo para una sala
   */
  hasActiveGame(roomId) {
    for (const [sessionId, gameState] of this.activeGames) {
      if (gameState.roomId === roomId) {
        return true;
      }
    }
    return false;
  }

  /**
   * Verificar si una sesión específica está activa en el motor
   * Usado por el Watchdog para detectar sesiones huérfanas
   */
  isSessionActive(gameSessionId) {
    const gameState = this.activeGames.get(gameSessionId);
    return gameState && gameState.interval && !gameState.isEnded;
  }

  /**
   * Obtener lista de todas las sesiones activas
   * Usado para debugging y monitoreo
   */
  getActiveSessions() {
    const sessions = [];
    for (const [sessionId, gameState] of this.activeGames) {
      sessions.push({
        sessionId,
        room: gameState.roomId,
        ballsDrawn: gameState.ballsDrawn?.length || 0,
        isEnded: gameState.isEnded,
        isPaused: gameState.isPaused,
        lineWinnersPaid: gameState.lineWinnersPaid,
        bingoWinnersPaid: gameState.bingoWinnersPaid
      });
    }
    return sessions;
  }
}

module.exports = GameEngineAuto;
