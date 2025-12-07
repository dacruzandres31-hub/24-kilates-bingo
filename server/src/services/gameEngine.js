const pool = require('../db');
const { 
  notifyLineWinner, 
  notifyBingoWinner, 
  showPaymentForms 
} = require('../socket/winnerEvents');

/**
 * GAME ENGINE - Motor de Sorteo Automático y Validación de Cartones
 * 
 * FLUJO AUTOMÁTICO:
 * 1. Sistema canta número cada X segundos
 * 2. Sistema marca automáticamente en TODOS los cartones
 * 3. Sistema valida automáticamente líneas y bingos
 * 4. Sistema anuncia ganadores con cartel a todos
 * 5. Pausa 1-2 segundos para celebrar
 * 6. Continúa sorteo hasta BINGO
 * 7. Al terminar → muestra formularios de pago
 * 
 * El jugador NO canta línea - el sistema lo detecta y anuncia
 */

class GameEngine {
  constructor(io) {
    this.io = io;
    this.activeGames = new Map(); // gameSessionId -> gameState
  }

  /**
   * Inicia un sorteo automático
   * @param {Number} gameSessionId 
   * @param {Object} options - { drawInterval: 5000, pauseOnWinner: 2000 }
   */
  async startGame(gameSessionId, options = {}) {
    const {
      drawInterval = 5000,      // 5 segundos entre números
      pauseOnWinner = 2000      // 2 segundos de pausa al cantar línea
    } = options;
  }

  // Ejecuta el sorteo completo para una sesión
  static async executeGame(session) {
    const { id: sessionId, room } = session;

    try {
      const drawnNumbers = new Set();
      let currentBall = 0;
      const winners = [];
      let lineaWinnerFound = false;
      let bingoWinnerFound = false;

      // Obtener todos los cartones vendidos en esta sesión
      const [cardsResult] = await pool.query(
        `SELECT 
          id AS cardId,
          buyer_id AS user_id,
          grid_numbers,
          already_won_line
         FROM daily_stock_cards
         WHERE status = 'sold' AND room = ?
         ORDER BY buyer_id ASC`,
        [room]
      );

      const cards = cardsResult;
      
      // Validar estructura de cartones antes de empezar
      for (const card of cards) {
        if (!isValidCard(card)) {
          console.error(`⚠️ Cartón ${card.cardId} tiene estructura inválida`);
          // Opcionalmente remover cartón inválido del juego
        }
      }

      // Sorteo iterativo: máximo 90 bolillas
      for (let ballCount = 0; ballCount < 90 && cards.length > 0; ballCount++) {
        // Generar próxima bolilla
        currentBall = this.generateNextBall(drawnNumbers);
        drawnNumbers.add(currentBall);

        // ⚡ OPTIMIZADO: Usar victoryChecker.js (O(1) con Set)
        const { lineWinners, bingoWinners } = checkWinners(
          cards,
          Array.from(drawnNumbers)
        );

        // Procesar ganadores de LÍNEA (si no hay ganador previo)
        if (!lineaWinnerFound && lineWinners.length > 0) {
          for (const winner of lineWinners) {
            const lineaPrize = session.current_pot_linea;
            
            // Acreditar fichas al ganador automáticamente
            await ChipsService.recordGameMovement(
              winner.userId,
              lineaPrize,
              sessionId,
              'win',
              `Premio LÍNEA - Sesión ${sessionId} - Bolea ${currentBall}`
            );
            
            // Marcar cartón como ya ganó línea
            await pool.query(
              'UPDATE daily_stock_cards SET already_won_line = true WHERE id = ?',
              [winner.cardId]
            );
            
            winners.push({
              userId: winner.userId,
              cardId: winner.cardId,
              amount: lineaPrize,
              type: 'linea',
              boleaNumber: currentBall
            });
          }
          lineaWinnerFound = true;
        }

        // Procesar ganadores de BINGO
        if (bingoWinners.length > 0) {
          for (const winner of bingoWinners) {
            const bingoPrize = session.current_pot_bingo;
            const isJackpot = currentBall > 40;
            
            // Acreditar fichas al ganador automáticamente
            await ChipsService.recordGameMovement(
              winner.userId,
              bingoPrize,
              sessionId,
              'win',
              `Premio BINGO${isJackpot ? ' JACKPOT' : ''} - Sesión ${sessionId} - Bolea ${currentBall}`
            );
            
            winners.push({
              userId: winner.userId,
              cardId: winner.cardId,
              amount: bingoPrize,
              type: 'bingo',
              boleaNumber: currentBall,
              isJackpot
            });
            
            // Remover cartón ganador del pool
            const cardIndex = cards.findIndex(c => c.cardId === winner.cardId);
            if (cardIndex !== -1) {
              cards.splice(cardIndex, 1);
            }
          }
          bingoWinnerFound = true;
          break; // Una sesión, un ganador de bingo
        }
      }

      // Retornar resultado del game
      return {
        sessionId,
        drawnNumbers: Array.from(drawnNumbers),
        winners,
        totalBallsDrawn: drawnNumbers.size,
        bingoWinner: winners.find(w => w.type === 'bingo'),
        lineaWinner: winners.find(w => w.type === 'linea'),
        jackpotTriggered: winners.some(w => w.isJackpot && w.type === 'bingo')
      };
    } catch (error) {
      console.error('Game engine error:', error);
      throw new Error('Error ejecutando game engine');
    }
  }

  // Verifica si un número cae en rango de la columna (BINGO 90 tiene 9 columnas)
  // Columna 1: 1-9
  // Columna 2: 10-19
  // Columna 3: 20-29
  // Columna 4: 30-39
  // Columna 5: 40-49
  // Columna 6: 50-59
  // Columna 7: 60-69
  // Columna 8: 70-79
  // Columna 9: 80-90
  static getColumnForNumber(number) {
    if (number >= 1 && number <= 9) return 0;
    if (number >= 10 && number <= 19) return 1;
    if (number >= 20 && number <= 29) return 2;
    if (number >= 30 && number <= 39) return 3;
    if (number >= 40 && number <= 49) return 4;
    if (number >= 50 && number <= 59) return 5;
    if (number >= 60 && number <= 69) return 6;
    if (number >= 70 && number <= 79) return 7;
    if (number >= 80 && number <= 90) return 8;
    return -1;
  }

  // Genera un cartón válido estilo BINGO 90 (3 filas x 9 columnas, 15 números)
  // Reglas:
  // - 3 filas x 9 columnas (27 celdas totales)
  // - 5 números por fila (15 números en total)
  // - 4 espacios vacíos por fila
  // - Cada columna corresponde a un rango de números
  // - Los números están ordenados ascendentemente por columna
  static generateValidCard() {
    const card = Array(3).fill(null).map(() => Array(9).fill(null));
    
    const columnRanges = [
      [1, 9],    // Columna 1
      [10, 19],  // Columna 2
      [20, 29],  // Columna 3
      [30, 39],  // Columna 4
      [40, 49],  // Columna 5
      [50, 59],  // Columna 6
      [60, 69],  // Columna 7
      [70, 79],  // Columna 8
      [80, 90]   // Columna 9
    ];

    // Paso 1: Decidir qué columnas tendrán números (cada columna puede tener 1, 2, o 3 números)
    // Necesitamos distribuir exactamente 15 números en 9 columnas
    const numbersPerColumn = Array(9).fill(0);
    let totalNumbers = 0;
    
    // Asegurar que cada columna tenga al menos 1 número si es posible
    for (let col = 0; col < 9 && totalNumbers < 15; col++) {
      numbersPerColumn[col] = 1;
      totalNumbers++;
    }
    
    // Distribuir los 6 números restantes (15 - 9 = 6) aleatoriamente
    while (totalNumbers < 15) {
      const col = Math.floor(Math.random() * 9);
      if (numbersPerColumn[col] < 3) {  // Máximo 3 números por columna
        numbersPerColumn[col]++;
        totalNumbers++;
      }
    }

    // Paso 2: Para cada columna, generar los números y colocarlos
    for (let col = 0; col < 9; col++) {
      const count = numbersPerColumn[col];
      if (count === 0) continue;

      const [min, max] = columnRanges[col];
      const columnNumbers = [];
      
      // Generar números únicos para esta columna
      while (columnNumbers.length < count) {
        const num = Math.floor(Math.random() * (max - min + 1)) + min;
        if (!columnNumbers.includes(num)) {
          columnNumbers.push(num);
        }
      }
      
      // Ordenar los números de menor a mayor
      columnNumbers.sort((a, b) => a - b);
      
      // Decidir en qué filas colocar estos números
      const availableRows = [0, 1, 2];
      const selectedRows = [];
      
      for (let i = 0; i < count; i++) {
        const rowIndex = Math.floor(Math.random() * availableRows.length);
        selectedRows.push(availableRows[rowIndex]);
        availableRows.splice(rowIndex, 1);
      }
      
      // Ordenar las filas para mantener orden ascendente
      selectedRows.sort((a, b) => a - b);
      
      // Colocar los números en las filas seleccionadas
      for (let i = 0; i < count; i++) {
        card[selectedRows[i]][col] = columnNumbers[i];
      }
    }

    // Paso 3: Validar que cada fila tenga exactamente 5 números
    for (let row = 0; row < 3; row++) {
      const numbersInRow = card[row].filter(n => n !== null).length;
      
      if (numbersInRow !== 5) {
        // Si no tiene 5 números, intentar rebalancear
        // Por simplicidad, regeneramos el cartón
        return this.generateValidCard();
      }
    }

    return card;
  }

  // Generar N cartones únicos (para dailyGenerator)
  static generateUniqueCards(count) {
    const cards = [];
    const cardStrings = new Set();

    while (cards.length < count) {
      const card = this.generateValidCard();
      const cardString = JSON.stringify(card);

      if (!cardStrings.has(cardString)) {
        cardStrings.add(cardString);
        cards.push(card);
      }
    }

    return cards;
  }

  // Genera la próxima bolilla (1-90) que no haya salido
  static generateNextBall(drawnNumbers) {
    const availableNumbers = [];
    for (let i = 1; i <= 90; i++) {
      if (!drawnNumbers.has(i)) {
        availableNumbers.push(i);
      }
    }
    
    if (availableNumbers.length === 0) {
      throw new Error('No hay más bolillas disponibles');
    }
    
    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    return availableNumbers[randomIndex];
  }
}

module.exports = GameEngine;
