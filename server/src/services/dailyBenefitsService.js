const dbHelper = require('../helpers/dbHelper');

/**
 * Obtiene los beneficios de membresía desde la config de BD
 * @param {Object} benefitsConfig - Configuración JSON de la membresía
 * @returns {Object} - { dailyBronzeCards, dailyOroCards, dailySpins }
 */
function getBenefitsFromConfig(benefitsConfig) {
    if (!benefitsConfig) return { dailyBronzeCards: 0, dailyOroCards: 0, dailySpins: 0 };
    
    const config = typeof benefitsConfig === 'string' ? JSON.parse(benefitsConfig) : benefitsConfig;
    
    return {
        dailyBronzeCards: config.daily_bronze_cards || 0,
        dailyOroCards: config.daily_oro_cards || 0,
        dailySpins: config.wheel_daily_spins || 0
    };
}

/**
 * Obtiene la cantidad de cartones gratis diarios según el tier (legacy - mantener compatibilidad)
 */
function getDailyCardsByTier(tierName) {
    if (!tierName) return 0;

    // Membresía Socio Bronce/Plata/Oro dan cartones ORO
    if (tierName.toLowerCase().includes('bronce')) return 1;
    if (tierName.toLowerCase().includes('plata')) return 2;
    if (tierName.toLowerCase().includes('oro')) return 3;

    return 0;
}

/**
 * Obtiene la cantidad de giros extra diarios según el tier (legacy)
 * Bronce NO tiene giros diarios (solo 1 al renovar)
 */
function getDailySpinsByTier(tierName) {
    if (!tierName) return 0;

    if (tierName.toLowerCase().includes('plata')) return 1;
    if (tierName.toLowerCase().includes('oro')) return 2;

    return 0; // Bronce y Embajador no tienen giros diarios
}

/**
 * Verifica y retorna los beneficios disponibles del usuario
 * Los cartones se entregan via cron diario (membershipService.resetDailyBenefits)
 * Esta función solo consulta los balances actuales
 */
async function checkAndResetDailyBenefits(userId) {
    try {
        // Obtener usuario con suscripción y sus gift cards
        const user = await dbHelper.queryOne(
            `SELECT u.id, 
                    u.gift_cards_bronce,
                    u.gift_cards_plata,
                    u.gift_cards_oro,
                    u.daily_wheel_spins_balance,
                    u.last_benefit_reset,
                    us.membership_id, 
                    m.name as tier_name,
                    m.benefits_config
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

        // Si no tiene membresía activa, retornar solo las gift cards que tenga
        if (!user.membership_id) {
            return {
                giftCardsBronce: user.gift_cards_bronce || 0,
                giftCardsPlata: user.gift_cards_plata || 0,
                giftCardsOro: user.gift_cards_oro || 0,
                extraSpins: user.daily_wheel_spins_balance || 0,
                tierName: null
            };
        }

        // Obtener beneficios configurados para esta membresía
        const benefits = getBenefitsFromConfig(user.benefits_config);

        return {
            giftCardsBronce: user.gift_cards_bronce || 0,
            giftCardsPlata: user.gift_cards_plata || 0,
            giftCardsOro: user.gift_cards_oro || 0,
            extraSpins: user.daily_wheel_spins_balance || 0,
            tierName: user.tier_name,
            // Info de beneficios diarios que recibe
            dailyBenefits: {
                bronzeCards: benefits.dailyBronzeCards,
                oroCards: benefits.dailyOroCards,
                spins: benefits.dailySpins
            }
        };

    } catch (error) {
        console.error('[DailyBenefits] Error en checkAndResetDailyBenefits:', error);
        throw error;
    }
}

/**
 * Consume cartones de regalo de una sala específica
 * @param {number} userId - ID del usuario
 * @param {string} room - Sala: 'bronce', 'plata', 'oro'
 * @param {number} quantity - Cantidad a consumir
 */
async function consumeGiftCards(userId, room, quantity) {
    try {
        const columnMap = {
            'bronce': 'gift_cards_bronce',
            'plata': 'gift_cards_plata',
            'oro': 'gift_cards_oro'
        };

        const column = columnMap[room.toLowerCase()];
        if (!column) {
            throw new Error(`Sala inválida: ${room}`);
        }

        const user = await dbHelper.queryOne(
            `SELECT ${column} as balance FROM users WHERE id = ?`,
            [userId],
            'GetGiftCardsBalance'
        );

        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        if (user.balance < quantity) {
            throw new Error(`No tienes suficientes cartones de ${room.toUpperCase()}. Disponibles: ${user.balance}, Solicitados: ${quantity}`);
        }

        await dbHelper.query(
            `UPDATE users SET ${column} = ${column} - ? WHERE id = ?`,
            [quantity, userId],
            'ConsumeGiftCards'
        );

        const newBalance = user.balance - quantity;
        console.log(`[DailyBenefits] ✅ Usuario ${userId} consumió ${quantity} cartones ${room.toUpperCase()}. Balance restante: ${newBalance}`);

        return newBalance;

    } catch (error) {
        console.error('[DailyBenefits] Error en consumeGiftCards:', error);
        throw error;
    }
}

/**
 * Consume cartones gratis diarios (legacy - redirige a consumeGiftCards con oro)
 * @deprecated Usar consumeGiftCards directamente
 */
async function consumeDailyCards(userId, quantity) {
    // Los cartones gratis diarios son de ORO para Bronce/Plata/Oro
    return consumeGiftCards(userId, 'oro', quantity);
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
    getBenefitsFromConfig,
    checkAndResetDailyBenefits,
    consumeGiftCards,
    consumeDailyCards,
    consumeDailySpins
};
