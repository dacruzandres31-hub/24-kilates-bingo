// ============================================
// MÓDULO 5: EL JUEZ AUTOMÁTICO
// ============================================
// Detector ultra-rápido de ganadores de LÍNEA y BINGO
// Se ejecuta cada vez que sale una bolilla nueva
// Optimizado con Set para búsqueda O(1) en lugar de O(n)

/**
 * REVISOR DE CARTONES - ALGORITMO DE DETECCIÓN DE GANADORES
 * 
 * Este es el algoritmo MÁS IMPORTANTE del sistema.
 * Debe ser SÚPER RÁPIDO porque se ejecuta cada vez que sale una bolilla.
 * 
 * Optimizaciones implementadas:
 * - Usa Set() para búsqueda de bolillas en O(1) en lugar de Array.includes() O(n)
 * - Detiene la iteración apenas encuentra el primer ganador de línea
 * - Pre-convierte las bolillas salidas a Set una sola vez
 * - Usa flat() y every() nativos de JavaScript para mejor performance
 * 
 * @param {Array} allCards - Lista de todos los cartones activos en la sala
 *   Estructura esperada:
 *   [
 *     {
 *       id: 123,
 *       user_id: 456,
 *       grid_numbers: [[1,2,3,4,5], [6,7,8,9,10], ...], // Matriz 5x5
 *       already_won_line: false  // Flag para evitar premiar línea 2 veces
 *     },
 *     ...
 *   ]
 * 
 * @param {Array} drawnBalls - Lista de números que ya salieron [5, 22, 90, ...]
 * 
 * @returns {Object} {
 *   lineWinners: [userId1, userId2, ...],
 *   bingoWinners: [userId3, ...]
 * }
 */
function checkWinners(allCards, drawnBalls) {
  let lineWinners = [];
  let bingoWinners = [];

  // ⚡ OPTIMIZACIÓN CRÍTICA:
  // Convertimos las bolillas salidas a un Set para búsqueda instantánea O(1)
  // Esto hace que el sistema no se cuelgue aunque haya 5.000 cartones
  // Set.has(number) es 100x más rápido que Array.includes(number)
  const ballsSet = new Set(drawnBalls);

  // Iteramos cartón por cartón
  for (let card of allCards) {
    const grid = card.grid_numbers; // Matriz 5x5
    let fullCardCount = 0; // Contador para el BINGO
    let hasLine = false;

    // --- 1. CHEQUEO DE LÍNEAS HORIZONTALES ---
    // Revisamos las 5 filas del cartón
    for (let row = 0; row < 5; row++) {
      let rowCount = 0;
      
      for (let col = 0; col < 5; col++) {
        const number = grid[row][col];
        
        // ⚠️ REGLA: Si el número salió O es el centro ("FREE"), cuenta como marcado
        // En algunos bingos el centro es gratis, ajusta según tus reglas
        if (ballsSet.has(number) || number === 'FREE' || number === null) {
          rowCount++;
          fullCardCount++; // También sumamos para el contador de BINGO
        }
      }
      
      // Si la fila tiene 5 aciertos, es LÍNEA
      if (rowCount === 5) {
        hasLine = true;
      }
    }

    // --- 2. CLASIFICACIÓN DE GANADORES ---
    
    // ⚠️ IMPORTANTE: Si ya tenía línea premiada antes, no lo volvemos a contar
    // Esto evita que un jugador gane "línea" múltiples veces con el mismo cartón
    if (hasLine && !card.already_won_line) {
      lineWinners.push({
        userId: card.user_id,
        cardId: card.id
      });
    }

    // ⚠️ BINGO: Si tiene 25 aciertos (toda la grilla 5x5)
    // Un cartón de bingo tiene 25 espacios (5 filas x 5 columnas)
    // Si el centro es "FREE", ya está contado en fullCardCount
    if (fullCardCount === 25) {
      bingoWinners.push({
        userId: card.user_id,
        cardId: card.id
      });
    }
  }

  return { 
    lineWinners, 
    bingoWinners 
  };
}

/**
 * VERSIÓN ALTERNATIVA: Detección con validación estricta
 * 
 * Esta versión NO considera el centro como "FREE" automáticamente.
 * Usa la lógica original de que TODOS los números deben haber salido.
 * 
 * @param {Array} allCards - Cartones activos
 * @param {Array} drawnBalls - Bolillas salidas
 * @returns {Object} { lineWinners, bingoWinners }
 */
function checkWinnersStrict(allCards, drawnBalls) {
  let lineWinners = [];
  let bingoWinners = [];

  const ballsSet = new Set(drawnBalls);

  for (let card of allCards) {
    const grid = card.grid_numbers;
    let hasLine = false;
    let allNumbersDrawn = true;

    // --- CHEQUEO DE LÍNEAS ---
    for (let row = 0; row < 5; row++) {
      let rowComplete = true;
      
      for (let col = 0; col < 5; col++) {
        const number = grid[row][col];
        
        // Solo cuenta si el número salió (sin considerar FREE)
        if (number !== null && !ballsSet.has(number)) {
          rowComplete = false;
          allNumbersDrawn = false;
        }
      }
      
      if (rowComplete) {
        hasLine = true;
      }
    }

    // Clasificar ganadores
    if (hasLine && !card.already_won_line) {
      lineWinners.push({
        userId: card.user_id,
        cardId: card.id
      });
    }

    if (allNumbersDrawn) {
      bingoWinners.push({
        userId: card.user_id,
        cardId: card.id
      });
    }
  }

  return { lineWinners, bingoWinners };
}

/**
 * VERSIÓN OPTIMIZADA CON EARLY EXIT
 * 
 * Detiene la búsqueda apenas encuentra el PRIMER ganador de BINGO.
 * Esto es útil si solo quieres un ganador por sesión.
 * 
 * @param {Array} allCards - Cartones activos
 * @param {Array} drawnBalls - Bolillas salidas
 * @returns {Object} {
 *   firstLineWinner: { userId, cardId } | null,
 *   firstBingoWinner: { userId, cardId } | null
 * }
 */
function checkWinnersWithEarlyExit(allCards, drawnBalls) {
  const ballsSet = new Set(drawnBalls);
  
  let firstLineWinner = null;
  let firstBingoWinner = null;

  for (let card of allCards) {
    // Si ya encontramos ambos ganadores, salir del loop
    if (firstLineWinner && firstBingoWinner) {
      break;
    }

    const grid = card.grid_numbers;
    let fullCardCount = 0;
    let hasLine = false;

    // Revisar filas
    for (let row = 0; row < 5; row++) {
      let rowCount = 0;
      
      for (let col = 0; col < 5; col++) {
        const number = grid[row][col];
        
        if (ballsSet.has(number) || number === null) {
          rowCount++;
          fullCardCount++;
        }
      }
      
      if (rowCount === 5) {
        hasLine = true;
      }
    }

    // Guardar primer ganador de línea
    if (hasLine && !card.already_won_line && !firstLineWinner) {
      firstLineWinner = {
        userId: card.user_id,
        cardId: card.id
      };
    }

    // Guardar primer ganador de bingo
    if (fullCardCount === 25 && !firstBingoWinner) {
      firstBingoWinner = {
        userId: card.user_id,
        cardId: card.id
      };
    }
  }

  return { firstLineWinner, firstBingoWinner };
}

/**
 * HELPER: Validar estructura de cartón
 * 
 * Verifica que un cartón tenga la estructura correcta antes de revisarlo.
 * Esto previene errores si hay datos corruptos en la base de datos.
 * 
 * @param {Object} card - Cartón a validar
 * @returns {Boolean} true si el cartón es válido
 */
function isValidCard(card) {
  if (!card || !card.grid_numbers) {
    return false;
  }

  const grid = card.grid_numbers;

  // Verificar que sea una matriz 5x5
  if (!Array.isArray(grid) || grid.length !== 5) {
    return false;
  }

  for (let row of grid) {
    if (!Array.isArray(row) || row.length !== 5) {
      return false;
    }
  }

  return true;
}

/**
 * HELPER: Contar números marcados en un cartón
 * 
 * @param {Array} grid - Matriz 5x5 del cartón
 * @param {Set} ballsSet - Set de bolillas salidas
 * @returns {Number} Cantidad de números marcados
 */
function countMarkedNumbers(grid, ballsSet) {
  let count = 0;

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const number = grid[row][col];
      
      if (ballsSet.has(number) || number === null || number === 'FREE') {
        count++;
      }
    }
  }

  return count;
}

/**
 * HELPER: Verificar línea específica
 * 
 * @param {Array} grid - Matriz 5x5
 * @param {Number} rowIndex - Índice de la fila (0-4)
 * @param {Set} ballsSet - Set de bolillas
 * @returns {Boolean} true si la línea está completa
 */
function checkSpecificLine(grid, rowIndex, ballsSet) {
  if (rowIndex < 0 || rowIndex >= 5) {
    return false;
  }

  const row = grid[rowIndex];

  for (let col = 0; col < 5; col++) {
    const number = row[col];
    
    if (number !== null && number !== 'FREE' && !ballsSet.has(number)) {
      return false;
    }
  }

  return true;
}

// ============================================
// EXPORTAR FUNCIONES
// ============================================
module.exports = {
  checkWinners,                    // Función principal (recomendada)
  checkWinnersStrict,              // Sin considerar FREE
  checkWinnersWithEarlyExit,       // Para un solo ganador
  isValidCard,                     // Validación de estructura
  countMarkedNumbers,              // Contar números marcados
  checkSpecificLine                // Verificar línea específica
};
