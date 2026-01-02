const dbHelper = require('../helpers/dbHelper');
const membershipService = require('./membershipService');

/**
 * Obtiene la cantidad de cartones gratis diarios según el tier
 * TODOS los tiers reciben cartones gratis diarios para Sala Oro
 */
function getDailyCardsByTier(tierName) {
    if (!tierName) return 0;

    if (tierName.toLowerCase().includes('bronce')) return 1;
    if (tierName.toLowerCase().includes('plata')) return 2;
    if (tierName.toLowerCase().includes('oro')) return 3;

    return 0;
}

/**
 * Verifica y resetea los cartones gratis diarios si es necesario
 * Retorna la cantidad de cartones disponibles
 */
async function checkAndResetDailyCards(userId) {
    try {
        // Obtener usuario con suscripción
        const user = await dbHelper.queryOne(
            `SELECT u.id, u.daily_free_cards_balance, u.daily_free_cards_last_reset,
                    us.membership_id, m.name as tier_name
             FROM users u
             LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.status = 'active'
             LEFT JOIN memberships m ON us.membership_id = m.id
             WHERE u.id = ?`,
            [userId],
            'GetUserDailyFreeCards'
        );

        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        // Si no tiene membresía activa, retornar 0
        if (!user.membership_id) {
            return 0;
        }

        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const lastReset = user.daily_free_cards_last_reset;

        // Si ya se reseteó hoy, retornar balance actual
        if (lastReset === today) {
            return user.daily_free_cards_balance || 0;
        }

        // Calcular cartones diarios según tier
        const dailyCards = getDailyCardsByTier(user.tier_name);

        // Resetear balance
        await dbHelper.query(
            `UPDATE users 
             SET daily_free_cards_balance = ?, 
                 daily_free_cards_last_reset = ?
             WHERE id = ?`,
            [dailyCards, today, userId],
            'ResetDailyFreeCards'
        );

        console.log(`[DailyFreeCards] ✅ Reset para usuario ${userId}: ${dailyCards} cartones (${user.tier_name})`);

        return dailyCards;

    } catch (error) {
        console.error('[DailyFreeCards] Error en checkAndResetDailyCards:', error);
        throw error;
    }
}

/**
 * Reduce el balance de cartones gratis después de reclamarlos
 */
async function consumeDailyCards(userId, quantity) {
    try {
        const user = await dbHelper.queryOne(
            'SELECT daily_free_cards_balance FROM users WHERE id = ?',
            [userId],
            'GetDailyCardsBalance'
        );

        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        if (user.daily_free_cards_balance < quantity) {
            throw new Error(`No tienes suficientes cartones gratis. Disponibles: ${user.daily_free_cards_balance}, Solicitados: ${quantity}`);
        }

        await dbHelper.query(
            'UPDATE users SET daily_free_cards_balance = daily_free_cards_balance - ? WHERE id = ?',
            [quantity, userId],
            'ConsumeDailyCards'
        );

        const newBalance = user.daily_free_cards_balance - quantity;
        console.log(`[DailyFreeCards] ✅ Usuario ${userId} consumió ${quantity} cartones. Balance restante: ${newBalance}`);

        return newBalance;

    } catch (error) {
        console.error('[DailyFreeCards] Error en consumeDailyCards:', error);
        throw error;
    }
}

module.exports = {
    getDailyCardsByTier,
    checkAndResetDailyCards,
    consumeDailyCards
};
