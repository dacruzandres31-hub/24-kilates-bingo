/**
 * Bingo Validator Utility
 * Centralizes win condition logic for Line and Bingo.
 */

/**
 * Checks if a card has any complete horizontal line.
 * BINGO 90: 3 rows x 9 columns, 15 numbers (5 per row).
 */
exports.checkHorizontalLines = (cardNumbers, calledNumbers) => {
    // Determine if it's a 3x9 (Bingo 90) or 5x5 (Bingo 75/Custom) grid
    const isBingo90 = cardNumbers.length === 3;
    const rows = cardNumbers.length;

    for (let r = 0; r < rows; r++) {
        const row = cardNumbers[r];
        // In Bingo 90, nulls are empty spaces. In 5x5, sometimes it's all numbers.
        const rowNumbers = row.filter(n => n !== null && n !== undefined && n !== 'FREE');

        const isComplete = rowNumbers.every(num => calledNumbers.includes(num));

        if (isComplete && rowNumbers.length > 0) {
            return {
                hasLine: true,
                row: r,
                winningNumbers: rowNumbers
            };
        }
    }
    return { hasLine: false };
};

/**
 * Checks if a card has all its numbers called (Bingo).
 */
exports.checkBingo = (cardNumbers, calledNumbers) => {
    const allNumbers = cardNumbers.flat().filter(n => n !== null && n !== undefined && n !== 'FREE');
    const isComplete = allNumbers.every(num => calledNumbers.includes(num));

    return {
        isValid: isComplete && allNumbers.length > 0,
        winningNumbers: allNumbers
    };
};
