/**
 * ProbabilityUtils - Motor de cálculo de probabilidades para Bingo 90
 */

/**
 * Calcula la probabilidad de completar una línea o bingo
 * @param {number} numbersNeeded - Cuántos números faltan para ganar
 * @param {number} ballsRemaining - Bolillas que quedan por salir (de un total de 90)
 * @returns {Object} - { percentage: number, label: string, color: string }
 */
export const calculateWinProbability = (numbersNeeded, ballsRemaining) => {
    if (numbersNeeded === 0) return { percentage: 100, label: '¡GANADOR!', color: '#22C55E' };

    // Simplificación matemática para el UX:
    // Probabilidad basada en la densidad de bolillas restantes
    // En Bingo 90, la probabilidad real es compleja (combinatoria), 
    // pero para el juego usamos una métrica de "Cercanía" (Proximity Index)

    const totalBalls = 90;
    const proximity = (totalBalls - ballsRemaining) / totalBalls;

    // Factor de urgencia: menos números faltantes = mayor probabilidad
    let score = 0;

    if (numbersNeeded === 1) score = 85 + (proximity * 10); // 85-95%
    else if (numbersNeeded === 2) score = 60 + (proximity * 15); // 60-75%
    else if (numbersNeeded === 3) score = 40 + (proximity * 20); // 40-60%
    else if (numbersNeeded <= 5) score = 20 + (proximity * 20); // 20-40%
    else score = 5 + (proximity * 15); // < 20%

    // Limitar a 99% si no ha ganado
    const percentage = Math.min(percentageScore(numbersNeeded, ballsRemaining), 99);

    return getProbabilityMeta(percentage);
};

const percentageScore = (needed, remaining) => {
    // Modelo heurístico para el frontend
    if (needed === 1) return 92;
    if (needed === 2) return 75;
    if (needed === 3) return 55;
    if (needed <= 5) return 35;
    return 15;
};

const getProbabilityMeta = (pct) => {
    if (pct >= 90) return { percentage: pct, label: 'EXTREMA', color: '#EF4444', icon: '🔥' };
    if (pct >= 70) return { percentage: pct, label: 'ALTA', color: '#F59E0B', icon: '⚡' };
    if (pct >= 40) return { percentage: pct, label: 'MEDIA', color: '#10B981', icon: '📈' };
    return { percentage: pct, label: 'BAJA', color: '#64748B', icon: '📉' };
};

/**
 * Analiza un cartón y devuelve su estado de probabilidad
 */
export const analyzeCardProbability = (gridNumbers, markedNumbers) => {
    if (!gridNumbers) return null;

    const rows = gridNumbers;
    let minNeededForLine = 5;

    // Calcular para Línea
    rows.forEach(row => {
        const rowNumbers = row.filter(n => n !== null);
        const rowMarked = rowNumbers.filter(n => markedNumbers.has(n)).length;
        const needed = rowNumbers.length - rowMarked;
        if (needed < minNeededForLine) minNeededForLine = needed;
    });

    // Calcular para Bingo
    const allNumbers = gridNumbers.flat().filter(n => n !== null);
    const totalMarked = allNumbers.filter(n => markedNumbers.has(n)).length;
    const neededForBingo = allNumbers.length - totalMarked;

    return {
        line: calculateWinProbability(minNeededForLine, 90 - markedNumbers.size),
        bingo: calculateWinProbability(neededForBingo, 90 - markedNumbers.size),
        numbersToBingo: neededForBingo,
        numbersToLine: minNeededForLine
    };
};
