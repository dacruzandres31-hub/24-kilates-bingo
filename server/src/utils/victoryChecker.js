// ============================================
// MÓDULO 5: EL JUEZ AUTOMÁTICO
// ============================================
// Detector ultra-rápido de ganadores de LÍNEA y BINGO
// Se ejecuta cada vez que sale una bolilla nueva
// Optimizado con Set para búsqueda O(1) en lugar de O(n)
// ACTUALIZADO PARA BINGO 90 (3 filas x 9 columnas, 15 números)

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
 *       grid_numbers: [[n,n,null,n,null,n,null,n,n], [n,null,n,n,null,n,n,null,n], ...], // Matriz 3x9 con nulls
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
  const ballsSet = new Set(drawnBalls);

  // Iteramos cartón por cartón
  for (let card of allCards) {
    const grid = card.grid_numbers; // Matriz 3x9
    let markedCount = 0; // Contador de números marcados (para BINGO)
    let hasLine = false;

    // --- 1. CHEQUEO DE LÍNEAS HORIZONTALES ---
    // En BINGO 90 solo hay líneas horizontales (no verticales ni diagonales)
    // Cada cartón tiene 3 filas, cada fila tiene 5 números y 4 espacios vacíos
    for (let row = 0; row < 3; row++) {
      let rowCount = 0;
      let numbersInRow = 0; // Total de números (no nulls) en la fila
      
      for (let col = 0; col < 9; col++) {
        const number = grid[row][col];
        
        if (number !== null && number !== undefined) {
          numbersInRow++;
          
          if (ballsSet.has(number)) {
            rowCount++;
            markedCount++; // También sumamos para el contador de BINGO
          }
        }
      }
      
      // Una línea está completa si todos los números (5) han salido
      // numbersInRow siempre debe ser 5 en un cartón válido
      if (rowCount === numbersInRow && numbersInRow === 5) {
        hasLine = true;
      }
    }

    // --- 2. CLASIFICACIÓN DE GANADORES ---
    
    // ⚠️ IMPORTANTE: Si ya tenía línea premiada antes, no lo volvemos a contar
    if (hasLine && !card.already_won_line) {
      lineWinners.push({
        userId: card.user_id,
        cardId: card.id
      });
    }

    // ⚠️ BINGO: Si tiene 15 aciertos (todos los números del cartón)
    // Un cartón de BINGO 90 tiene 15 números
    if (markedCount === 15) {
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
 * Esta versión NO considera espacios FREE.
 * Usa la lógica original de que TODOS los números deben haber salido.
 * Actualizada para BINGO 90 (3x9, 15 números)
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
    const grid = card.grid_numbers; // Matriz 3x9
    let hasLine = false;
    let allNumbersDrawn = true;
    let markedCount = 0;

    // --- CHEQUEO DE LÍNEAS ---
    for (let row = 0; row < 3; row++) {
      let rowComplete = true;
      let rowMarked = 0;
      
      for (let col = 0; col < 9; col++) {
        const number = grid[row][col];
        
        // Solo procesar celdas con números (no nulls)
        if (number !== null && number !== undefined) {
          if (ballsSet.has(number)) {
            rowMarked++;
            markedCount++;
          } else {
            rowComplete = false;
            allNumbersDrawn = false;
          }
        }
      }
      
      // En BINGO 90, cada fila tiene exactamente 5 números
      if (rowComplete && rowMarked === 5) {
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

    // BINGO: todos los 15 números marcados
    if (markedCount === 15) {
      bingoWinners.push({
        userId: card.user_id,
        cardId: card.id
      });
    }
  }

  return { lineWinners, bingoWinners };
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
 * Actualizada para BINGO 90 (3x9, 15 números)
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

    const grid = card.grid_numbers; // Matriz 3x9
    let markedCount = 0;
    let hasLine = false;

    // Revisar las 3 filas
    for (let row = 0; row < 3; row++) {
      let rowCount = 0;
      let numbersInRow = 0;
      
      for (let col = 0; col < 9; col++) {
        const number = grid[row][col];
        
        if (number !== null && number !== undefined) {
          numbersInRow++;
          
          if (ballsSet.has(number)) {
            rowCount++;
            markedCount++;
          }
        }
      }
      
      // Línea completa: 5 números marcados
      if (rowCount === numbersInRow && numbersInRow === 5) {
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

    // Guardar primer ganador de bingo (15 números marcados)
    if (markedCount === 15 && !firstBingoWinner) {
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
 * Actualizada para BINGO 90 (3x9, 15 números)
 * 
 * @param {Object} card - Cartón a validar
 * @returns {Boolean} true si el cartón es válido
 */
function isValidCard(card) {
  if (!card || !card.grid_numbers) {
    return false;
  }

  const grid = card.grid_numbers;

  // Verificar que sea una matriz 3x9
  if (!Array.isArray(grid) || grid.length !== 3) {
    return false;
  }

  for (let row of grid) {
    if (!Array.isArray(row) || row.length !== 9) {
      return false;
    }
    
    // Verificar que cada fila tenga exactamente 5 números (no nulls)
    const numbersInRow = row.filter(n => n !== null && n !== undefined).length;
    if (numbersInRow !== 5) {
      return false;
    }
  }

  return true;
}

/**
 * HELPER: Contar números marcados en un cartón
 * 
 * @param {Array} grid - Matriz 3x9 del cartón
 * @param {Set} ballsSet - Set de bolillas salidas
 * @returns {Number} Cantidad de números marcados
 */
function countMarkedNumbers(grid, ballsSet) {
  let count = 0;

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 9; col++) {
      const number = grid[row][col];
      
      if (number !== null && number !== undefined && ballsSet.has(number)) {
        count++;
      }
    }
  }

  return count;
}

/**
 * HELPER: Verificar línea específica
 * 
 * @param {Array} grid - Matriz 3x9
 * @param {Number} rowIndex - Índice de la fila (0-2)
 * @param {Set} ballsSet - Set de bolillas
 * @returns {Boolean} true si la línea está completa
 */
function checkSpecificLine(grid, rowIndex, ballsSet) {
  if (rowIndex < 0 || rowIndex >= 3) {
    return false;
  }

  const row = grid[rowIndex];
  let numbersMarked = 0;
  let totalNumbers = 0;

  for (let col = 0; col < 9; col++) {
    const number = row[col];
    
    if (number !== null && number !== undefined) {
      totalNumbers++;
      
      if (ballsSet.has(number)) {
        numbersMarked++;
      }
    }
  }

  // Línea completa si todos los 5 números están marcados
  return numbersMarked === 5 && totalNumbers === 5;
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
