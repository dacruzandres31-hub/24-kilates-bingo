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

class GameEngineAuto {
  constructor(io) {
    this.io = io;
    this.activeGames = new Map(); // gameSessionId -> gameState
  }

  /**
   * Inicia un sorteo automático
   */
  async startGame(gameSessionId, options = {}) {
    const {
      drawInterval = 5000,      // 5 segundos entre números
      pauseOnWinner = 2000      // 2 segundos de pausa al cantar línea
    } = options;

    const [sessions] = await pool.query(
      'SELECT * FROM game_sessions WHERE id = ? AND status = ?',
      [gameSessionId, 'active']
    );

    if (sessions.length === 0) {
      throw new Error('Sesión no encontrada o no está activa');
    }

    const session = sessions[0];

    // LIMPIEZA Y REGENERACIÓN: Al iniciar sorteo
    // Eliminar cartones no usados y generar 1000 nuevos para próxima sesión
    const cardPoolManager = require('./cardPoolManager');
    cardPoolManager.cleanAndRegenerateForSession(session.room).catch(err => {
      console.error('[GameEngine] Error en limpieza/regeneración al iniciar:', err);
    });

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
      bingoWinnersThisBall: []          // Ganadores de BINGO en esta bolilla
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

      try {
        await this.drawNextBall(gameSessionId, pauseOnWinner);
      } catch (error) {
        console.error(`[GameEngine] Error en sorteo ${gameSessionId}:`, error);
        this.stopGame(gameSessionId);
      }
    }, drawInterval);

    console.log(`[GameEngine] 🎮 Juego ${gameSessionId} iniciado (sala: ${session.room})`);
    
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

    if (gameState.availableBalls.length === 0) {
      console.log(`[GameEngine] Juego ${gameSessionId} terminado - no hay más bolas`);
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

    console.log(`[GameEngine] 🎱 ${ballLetter}-${ballNumber} (#${drawOrder})`);

    // Emitir a todos los jugadores
    this.io.to(`game_${gameState.roomId}`).emit('ball_drawn', {
      gameSessionId,
      ballNumber,
      ballLetter,
      drawOrder,
      totalDrawn: gameState.ballsDrawn.length,
      room: gameState.roomId  // Agregado para filtro en frontend
    });

    // VALIDAR AUTOMÁTICAMENTE TODOS LOS CARTONES
    await this.validateAllCards(gameSessionId, pauseOnWinner);

    // EMITIR REORDENAMIENTO DE CARTONES (para usuarios con múltiples cartones)
    await this.emitCardsReordering(gameSessionId);
  }

  /**
   * Emite evento de reordenamiento de cartones a cada usuario
   */
  async emitCardsReordering(gameSessionId) {
    try {
      const CardAnalyzer = require('./cardAnalyzer');

      // Obtener todos los usuarios con cartones activos en esta sesión
      const [users] = await pool.query(
        `SELECT DISTINCT user_id FROM bingo_cards 
         WHERE session_id = ? AND status = 'active'`,
        [gameSessionId]
      );

      // Para cada usuario, analizar sus cartones y emitir evento personal
      for (const { user_id } of users) {
        // Obtener cartones del usuario
        const [userCards] = await pool.query(
          `SELECT * FROM bingo_cards 
           WHERE user_id = ? AND session_id = ? AND status = 'active'
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

    const [cards] = await pool.query(
      `SELECT bc.*, u.username 
       FROM bingo_cards bc
       JOIN users u ON bc.user_id = u.id
       WHERE bc.session_id = ? AND bc.status = 'active'`,
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
   */
  async payLineWinners(gameSessionId, winners) {
    const [session] = await pool.query('SELECT * FROM game_sessions WHERE id = ?', [gameSessionId]);
    const totalPrize = session[0].line_prize || 2500;
    const prizePerWinner = totalPrize / winners.length;

    const gameState = this.activeGames.get(gameSessionId);

    console.log(`[GameEngine] 🎉 LÍNEA COMPLETADA - ${winners.length} ganador(es)`);
    
    for (const winner of winners) {
      await pool.query(
        `INSERT INTO game_winners 
         (game_session_id, user_id, card_id, prize_type, prize_amount, line_type, winning_numbers, verified)
         VALUES (?, ?, ?, 'linea', ?, ?, ?, TRUE)`,
        [gameSessionId, winner.userId, winner.cardId, prizePerWinner, winner.lineType, JSON.stringify(winner.winningNumbers)]
      );

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

    if (winners.length > 1) {
      console.log(`   💰 Pozo dividido: $${totalPrize} / ${winners.length} = $${prizePerWinner.toFixed(2)} c/u`);
    }
  }

  /**
   * Paga a los ganadores de BINGO (puede haber múltiples)
   */
  async payBingoWinners(gameSessionId, winners) {
    const [session] = await pool.query('SELECT * FROM game_sessions WHERE id = ?', [gameSessionId]);
    const totalPrize = session[0].bingo_prize || 25000;
    const prizePerWinner = totalPrize / winners.length;

    const gameState = this.activeGames.get(gameSessionId);

    console.log(`[GameEngine] 🎊 BINGO COMPLETADO - ${winners.length} ganador(es)`);
    
    for (const winner of winners) {
      await pool.query(
        `INSERT INTO game_winners 
         (game_session_id, user_id, card_id, prize_type, prize_amount, winning_numbers, verified)
         VALUES (?, ?, ?, 'bingo', ?, ?, TRUE)`,
        [gameSessionId, winner.userId, winner.cardId, prizePerWinner, JSON.stringify(winner.winningNumbers)]
      );

      console.log(`   → ${winner.username}: $${prizePerWinner.toFixed(2)}`);

      notifyBingoWinner(
        this.io,
        gameState.roomId,
        { id: winner.userId, username: winner.username },
        prizePerWinner,
        gameSessionId
      );

      // 🔔 Notificación WhatsApp de premio BINGO
      whatsapp24KService.notifyPrizeWon(winner.userId, {
        type: 'bingo',
        amount: prizePerWinner,
        cardSerial: winner.cardSerial || `#${winner.cardId}`,
        room: gameState.roomId
      }).catch(err => console.error('[WhatsApp] Error notificando bingo:', err));
    }

    if (winners.length > 1) {
      console.log(`   💰 Pozo dividido: $${totalPrize} / ${winners.length} = $${prizePerWinner.toFixed(2)} c/u`);
    }
  }

  /**
   * Termina el juego y muestra formularios de pago
   */
  async endGame(gameSessionId, status = 'completed') {
    const gameState = this.activeGames.get(gameSessionId);
    if (!gameState) return;

    if (gameState.interval) {
      clearInterval(gameState.interval);
      gameState.interval = null;
    }

    await pool.query(
      'UPDATE game_sessions SET status = ? WHERE id = ?',
      [status, gameSessionId]
    );

    // LIMPIEZA: Eliminar cartones no asignados a ninguna sesión de esta sala
    // Esto se ejecuta cuando finaliza cada sorteo
    if (gameState.roomId) {
      const [cleanupResult] = await pool.query(`
        DELETE FROM bingo_cards_pool 
        WHERE room = ? 
        AND status = 'selected' 
        AND game_session_id IS NULL
      `, [gameState.roomId]);
      
      console.log(`[GameEngine] 🧹 Limpieza post-sorteo sala ${gameState.roomId}: ${cleanupResult.affectedRows} cartones huérfanos eliminados`);
    }

    console.log(`[GameEngine] 🏁 Juego ${gameSessionId} terminado (${gameState.ballsDrawn.length} bolas sorteadas)`);

    this.io.to(`game_${gameState.roomId}`).emit('game_ended', {
      gameSessionId,
      status,
      totalBallsDrawn: gameState.ballsDrawn.length
    });

    // Formularios de pago después de 5 segundos
    setTimeout(async () => {
      const winners = await this.getGameWinners(gameSessionId);
      if (winners.length > 0) {
        showPaymentForms(this.io, gameSessionId, winners);
      }
    }, 5000);

    // CREAR PRÓXIMA SESIÓN: 5 minutos después de terminar, crear sesión para próxima hora
    const roomId = gameState.roomId;
    setTimeout(async () => {
      try {
        await this.createNextHourlySession(roomId);
        console.log(`[GameEngine] 🔄 Próxima sesión creada para ${roomId} - ventas reabiertas`);
      } catch (error) {
        console.error(`[GameEngine] Error creando próxima sesión para ${roomId}:`, error);
      }
    }, 5 * 60 * 1000); // 5 minutos después

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
      'free_starter': 45 // :45 cada hora
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

    // Configuración de premios por sala
    const roomConfig = {
      'bronce': { linePrize: 2500, bingoPrize: 10000 },
      'plata': { linePrize: 5000, bingoPrize: 25000 },
      'oro': { linePrize: 10000, bingoPrize: 50000 },
      'free_starter': { linePrize: 500, bingoPrize: 2000 }
    };

    const config = roomConfig[room] || { linePrize: 2500, bingoPrize: 10000 };

    // Crear sesión
    const [result] = await pool.query(
      `INSERT INTO game_sessions (room, start_time, status, line_prize, bingo_prize, current_pot_bingo, current_pot_linea, is_preventa)
       VALUES (?, ?, 'pending', ?, ?, 0.00, 0.00, true)`,
      [room, nextHour, config.linePrize, config.bingoPrize]
    );

    console.log(`[GameEngine] ✅ Sesión ${result.insertId} creada para ${room} - ${nextHour.toLocaleTimeString()}`);
    
    return result.insertId;
  }

  stopGame(gameSessionId) {
    const gameState = this.activeGames.get(gameSessionId);
    if (!gameState) return;

    if (gameState.interval) {
      clearInterval(gameState.interval);
      gameState.interval = null;
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
}

module.exports = GameEngineAuto;
