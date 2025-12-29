/**
 * Helper para Lógica de Juego Pura (Sin DB ni estado global)
 */
const gameLogicHelper = {
    /**
     * Genera un array de números de Bingo 90 mezclados.
     * @returns {Array<number>} Array de 1 a 90 en orden aleatorio.
     */
    generateBingoSequence: () => {
        const numbers = Array.from({ length: 90 }, (_, i) => i + 1);
        // Algoritmo Fisher-Yates Shuffle
        for (let i = numbers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
        }
        return numbers;
    },

    /**
     * Verifica si un cartón ha completado una línea.
     * @param {Array} cardNumbers - Array de números del cartón (puede ser matriz o plano)
     * @param {Array<number>} drawnNumbers - Números ya sorteados
     * @returns {Object|null} Objeto con info de línea o null
     */
    checkLineWin: (cardNumbers, drawnNumbers) => {
        // Si es matriz 3x9
        if (Array.isArray(cardNumbers[0])) {
            for (let i = 0; i < cardNumbers.length; i++) {
                const row = cardNumbers[i].filter(n => n !== null && n !== 0);
                const isComplete = row.every(num => drawnNumbers.includes(num));
                if (isComplete) return { type: 'line', row: i };
            }
        }
        return null;
    },

    /**
     * Verifica Bingo (Cartón lleno).
     * @param {Array} cardNumbers 
     * @param {Array<number>} drawnNumbers 
     * @returns {boolean}
     */
    checkBingoWin: (cardNumbers, drawnNumbers) => {
        const flatNumbers = cardNumbers.flat().filter(n => n !== null && n !== 0);
        return flatNumbers.every(num => drawnNumbers.includes(num));
    },

    /**
     * Determina la letra (B, I, N, G, O) para un número de Bingo 75 o 90 (adaptado).
     * Para Bingo 90 se suele usar rangos de 18.
     */
    getBallLetter: (number) => {
        if (number <= 18) return 'B';
        if (number <= 36) return 'I';
        if (number <= 54) return 'N';
        if (number <= 72) return 'G';
        return 'O';
    }
};

module.exports = gameLogicHelper;
