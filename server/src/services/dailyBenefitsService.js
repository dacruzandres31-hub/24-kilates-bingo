const dbHelper = require('../helpers/dbHelper');

/**
 * Obtiene la cantidad de cartones gratis diarios según el tier
 */
function getDailyCardsByTier(tierName) {
    if (!tierName) return 0;

    if (tierName.toLowerCase().includes('bronce')) return 1;
    if (tierName.toLowerCase().includes('plata')) return 2;
    if (tierName.toLowerCase().includes('oro')) return 3;

    return 0;
}

/**
 * Obtiene la cantidad de giros extra diarios según el tier
 * Bronce NO tiene giros diarios (solo 1 al renovar)
 */
function getDailySpinsByTier(tierName) {
    if (!tierName) return 0;

    if (tierName.toLowerCase().includes('plata')) return 1;
    if (tierName.toLowerCase().includes('oro')) return 2;

    return 0; // Bronce no tiene giros diarios
}

/**
 * Verifica y resetea TODOS los beneficios diarios si es necesario
 * Retorna los beneficios disponibles
 */
async function checkAndResetDailyBenefits(userId) {
    try {
        // Obtener usuario con suscripción
        const user = await dbHelper.queryOne(
            `SELECT u.id, 
                    u.daily_free_cards_balance, 
                    u.daily_free_cards_last_reset,
                    u.daily_wheel_spins_balance,
                    u.daily_wheel_spins_last_reset,
                    us.membership_id, 
                    m.name as tier_name
             FROM users u
             LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.status = 'active'
             LEFT JOIN memberships m ON us.membership_id = m.id
             WHERE u.id = ?`,
            [userId],
            'GetUserDailyBenefits'
        );

        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        // Si no tiene membresía activa, retornar 0
        if (!user.membership_id) {
            return {
                freeCards: 0,
                extraSpins: 0,
                tierName: null
            };
        }

        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        let updates = {};
        let freeCards = user.daily_free_cards_balance || 0;
        let extraSpins = user.daily_wheel_spins_balance || 0;

        // Reset cartones gratis si es necesario
        if (user.daily_free_cards_last_reset !== today) {
            const dailyCards = getDailyCardsByTier(user.tier_name);
            updates.daily_free_cards_balance = dailyCards;
            updates.daily_free_cards_last_reset = today;
            freeCards = dailyCards;
            console.log(`[DailyBenefits] 🎁 Reset cartones para usuario ${userId}: ${dailyCards} (${user.tier_name})`);
        }

        // Reset giros extra si es necesario
        if (user.daily_wheel_spins_last_reset !== today) {
            const dailySpins = getDailySpinsByTier(user.tier_name);
            updates.daily_wheel_spins_balance = dailySpins;
            updates.daily_wheel_spins_last_reset = today;
            extraSpins = dailySpins;
            console.log(`[DailyBenefits] 🎰 Reset giros para usuario ${userId}: ${dailySpins} (${user.tier_name})`);
        }

        // Aplicar updates si hay cambios
        if (Object.keys(updates).length > 0) {
            const setClauses = Object.keys(updates).map(key => `${key} = ?`).join(', ');
            const values = [...Object.values(updates), userId];

            await dbHelper.query(
                `UPDATE users SET ${setClauses} WHERE id = ?`,
                values,
                'ResetDailyBenefits'
            );
        }

        return {
            freeCards,
            extraSpins,
            tierName: user.tier_name
        };

    } catch (error) {
        console.error('[DailyBenefits] Error en checkAndResetDailyBenefits:', error);
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
        console.log(`[DailyBenefits] ✅ Usuario ${userId} consumió ${quantity} cartones. Balance restante: ${newBalance}`);

        return newBalance;

    } catch (error) {
        console.error('[DailyBenefits] Error en consumeDailyCards:', error);
        throw error;
    }
}

/**
 * Reduce el balance de giros extra después de usarlos
 */
async function consumeDailySpins(userId, quantity = 1) {
    try {
        const user = await dbHelper.queryOne(
            'SELECT daily_wheel_spins_balance FROM users WHERE id = ?',
            [userId],
            'GetDailySpinsBalance'
        );

        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        if (user.daily_wheel_spins_balance < quantity) {
            throw new Error(`No tienes suficientes giros extra. Disponibles: ${user.daily_wheel_spins_balance}, Solicitados: ${quantity}`);
        }

        await dbHelper.query(
            'UPDATE users SET daily_wheel_spins_balance = daily_wheel_spins_balance - ? WHERE id = ?',
            [quantity, userId],
            'ConsumeDailySpins'
        );

        const newBalance = user.daily_wheel_spins_balance - quantity;
        console.log(`[DailyBenefits] ✅ Usuario ${userId} consumió ${quantity} giro(s). Balance restante: ${newBalance}`);

        return newBalance;

    } catch (error) {
        console.error('[DailyBenefits] Error en consumeDailySpins:', error);
        throw error;
    }
}

module.exports = {
    getDailyCardsByTier,
    getDailySpinsByTier,
    checkAndResetDailyBenefits,
    consumeDailyCards,
    consumeDailySpins
};
