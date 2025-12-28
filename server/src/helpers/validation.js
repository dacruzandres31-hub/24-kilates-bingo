/**
 * Funciones de validación puras (sin dependencias)
 * Estas funciones solo validan datos, no acceden a BD
 */

/**
 * Validar límites de cartones seleccionados
 */
function validateCardLimits(cardIds) {
    if (!Array.isArray(cardIds) || cardIds.length === 0) {
        const error = new Error('Debes seleccionar al menos un cartón');
        error.code = 'INVALID_CARD_COUNT';
        throw error;
    }

    if (cardIds.length > 30) {
        const error = new Error('No puedes seleccionar más de 30 cartones');
        error.code = 'CARD_LIMIT_EXCEEDED';
        throw error;
    }

    return true;
}

/**
 * Validar formato de sala
 */
function validateRoom(room) {
    const validRooms = ['starter', 'bronce', 'plata', 'oro', 'bronze', 'silver', 'gold'];

    if (!room || typeof room !== 'string') {
        const error = new Error('Sala inválida');
        error.code = 'INVALID_ROOM';
        throw error;
    }

    if (!validRooms.includes(room.toLowerCase())) {
        const error = new Error(`Sala no válida: ${room}`);
        error.code = 'INVALID_ROOM';
        throw error;
    }

    return true;
}

/**
 * Validar cantidad de tickets
 */
function validateTicketQuantity(available, required) {
    if (typeof available !== 'number' || typeof required !== 'number') {
        const error = new Error('Cantidades inválidas');
        error.code = 'INVALID_QUANTITY';
        throw error;
    }

    if (available < 0 || required < 0) {
        const error = new Error('Las cantidades no pueden ser negativas');
        error.code = 'NEGATIVE_QUANTITY';
        throw error;
    }

    return available >= required;
}

/**
 * Validar balance suficiente
 */
function validateBalance(balance, required) {
    if (typeof balance !== 'number' || typeof required !== 'number') {
        const error = new Error('Montos inválidos');
        error.code = 'INVALID_AMOUNT';
        throw error;
    }

    if (balance < required) {
        const error = new Error('Balance insuficiente');
        error.code = 'INSUFFICIENT_FUNDS';
        error.details = {
            required,
            balance,
            missing: required - balance
        };
        throw error;
    }

    return true;
}

/**
 * Calcular distribución de tickets (pagos vs gratis)
 */
function calculateTicketDistribution(availablePaid, availableFree, required) {
    const result = {
        usePaid: 0,
        useFree: 0,
        needBalance: 0
    };

    // Usar primero los pagos
    if (availablePaid >= required) {
        result.usePaid = required;
        return result;
    }

    // Usar todos los pagos disponibles
    result.usePaid = availablePaid;
    const remaining = required - availablePaid;

    // Usar gratis para el resto
    if (availableFree >= remaining) {
        result.useFree = remaining;
        return result;
    }

    // Usar todos los gratis disponibles
    result.useFree = availableFree;
    result.needBalance = remaining - availableFree;

    return result;
}

module.exports = {
    validateCardLimits,
    validateRoom,
    validateTicketQuantity,
    validateBalance,
    calculateTicketDistribution
};
