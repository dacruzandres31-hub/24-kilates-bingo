const pool = require('../db');

/**
 * STARTER PRIZE SERVICE
 * 
 * Maneja la acreditación de premios para la Sala Starter (gratuita).
 * Los premios pueden ser: cartones, fichas, XP, o logros.
 * 
 * Diferencias con salas pagas:
 * - No hay pozos acumulados
 * - Premios fijos configurados por Andy
 * - XP reducido al 10% de salas pagas
 * - Todos los cartones ganados son regalos (is_gift = 1)
 */

/**
 * Acredita premio a ganador de Sala Starter
 * @param {number} userId - ID del usuario ganador
 * @param {string} prizeType - 'line' o 'bingo'
 * @param {object} config - Configuración de la sala desde room_config
 * @param {number} sessionId - ID de la sesión de juego
 * @param {number} ballNumber - Número de bolilla ganadora
 * @returns {Promise<object>} - Detalles del premio acreditado
 */
async function creditStarterPrize(userId, prizeType, config, sessionId, ballNumber) {
    const isLine = prizeType === 'line';
    const prizeTypeField = isLine ? config.line_prize_type : config.bingo_prize_type;
    const prizeAmount = isLine ? config.line_prize_amount : config.bingo_prize_amount;
    const prizeRoom = isLine ? config.line_prize_room : config.bingo_prize_room;
    const xpMultiplier = config.xp_multiplier || 0.10; // Default 10% para Starter

    console.log(`🎁 [Starter Prize] ${prizeType.toUpperCase()} winner: User ${userId}`);
    console.log(`   Prize: ${prizeAmount} ${prizeTypeField}${prizeTypeField === 'tickets' ? ` (${prizeRoom})` : ''}`);

    let creditedPrize = {
        userId,
        prizeType,
        prizeTypeField,
        prizeAmount,
        prizeRoom,
        sessionId,
        ballNumber
    };

    try {
        switch (prizeTypeField) {
            case 'tickets':
                // Acreditar cartones a user_card_inventory como REGALO
                const [existing] = await pool.query(
                    'SELECT id, quantity FROM user_card_inventory WHERE user_id = ? AND room = ? AND is_gift = 1',
                    [userId, prizeRoom]
                );

                if (existing.length > 0) {
                    await pool.query(
                        'UPDATE user_card_inventory SET quantity = quantity + ?, updated_at = NOW() WHERE id = ?',
                        [prizeAmount, existing[0].id]
                    );
                } else {
                    await pool.query(
                        'INSERT INTO user_card_inventory (user_id, room, quantity, is_gift, created_at) VALUES (?, ?, ?, 1, NOW())',
                        [userId, prizeRoom, prizeAmount]
                    );
                }

                console.log(`✅ Credited ${prizeAmount} ${prizeRoom} ticket(s) (GIFT) to user ${userId}`);

                // Emitir evento Socket.IO para actualización en tiempo real
                await emitResourcesUpdated(userId, prizeAmount, prizeRoom, prizeType);
                break;

            case 'chips':
                // Acreditar fichas (cantidad pequeña)
                await pool.query(
                    'UPDATE users SET balance = balance + ? WHERE id = ?',
                    [prizeAmount, userId]
                );

                console.log(`✅ Credited ${prizeAmount} chips to user ${userId}`);

                // Emitir evento Socket.IO
                if (global.io) {
                    const [user] = await pool.query('SELECT balance FROM users WHERE id = ?', [userId]);
                    const eventData = {
                        userId,
                        balance: parseFloat(user[0].balance),
                        message: `¡Ganaste ${prizeAmount} fichas en Sala Starter! 🎁`
                    };
                    global.io.to(`user_${userId}`).emit('resources_updated', eventData);
                    global.io.emit('resources_updated', eventData);
                }
                break;

            case 'xp':
                // Acreditar XP (10% del XP de salas pagas)
                const xpAmount = Math.floor(prizeAmount * xpMultiplier);
                await pool.query(
                    'UPDATE users SET xp = xp + ? WHERE id = ?',
                    [xpAmount, userId]
                );

                console.log(`✅ Credited ${xpAmount} XP to user ${userId} (${xpMultiplier * 100}% of paid rooms)`);
                creditedPrize.actualXpAmount = xpAmount;
                break;

            case 'achievement':
                // Desbloquear logro especial
                console.log(`🏆 Special achievement unlocked for user ${userId}`);
                // TODO: Implementar sistema de logros si no existe
                break;
        }

        // Registrar el premio en game_events para auditoría
        await pool.query(
            `INSERT INTO game_events (user_id, event_type, details) VALUES (?, ?, ?)`,
            [userId, 'starter_prize', JSON.stringify(creditedPrize)]
        );

        return creditedPrize;

    } catch (error) {
        console.error(`❌ Error crediting Starter prize to user ${userId}:`, error);
        throw error;
    }
}

/**
 * Emite evento Socket.IO para actualizar recursos del usuario
 * @param {number} userId - ID del usuario
 * @param {number} amount - Cantidad de cartones ganados
 * @param {string} room - Sala de los cartones (bronce/plata/oro)
 * @param {string} prizeType - Tipo de premio (line/bingo)
 */
async function emitResourcesUpdated(userId, amount, room, prizeType) {
    if (!global.io) {
        console.warn('⚠️ global.io not available, cannot emit Socket.IO event');
        return;
    }

    try {
        // Obtener inventario actualizado del usuario
        const [inventory] = await pool.query(`
      SELECT 
        room,
        SUM(CASE WHEN is_gift = 0 THEN quantity ELSE 0 END) as normal,
        SUM(CASE WHEN is_gift = 1 THEN quantity ELSE 0 END) as gift,
        SUM(quantity) as total
      FROM user_card_inventory
      WHERE user_id = ?
      GROUP BY room
    `, [userId]);

        const eventData = {
            userId,
            cartones: { bronce: 0, plata: 0, oro: 0 },
            cards_bronce: 0,
            cards_plata: 0,
            cards_oro: 0,
            gift_bronce: 0,
            gift_plata: 0,
            gift_oro: 0,
            message: `¡Ganaste ${amount} cartón${amount > 1 ? 'es' : ''} de ${room.toUpperCase()} por ${prizeType === 'line' ? 'LÍNEA' : 'BINGO'} en Sala Starter! 🎁`
        };

        // Mapear inventario a estructura del evento
        inventory.forEach(row => {
            eventData.cartones[row.room] = parseInt(row.total) || 0;
            eventData[`cards_${row.room}`] = parseInt(row.normal) || 0;
            eventData[`gift_${row.room}`] = parseInt(row.gift) || 0;
        });

        // Emitir a la sala personal del usuario
        global.io.to(`user_${userId}`).emit('resources_updated', eventData);

        // Emitir a todos los clientes (para que admins lo vean)
        global.io.emit('resources_updated', eventData);

        console.log(`📡 [Starter Prize] Socket.IO event emitted for user ${userId}`);

    } catch (error) {
        console.error('❌ Error emitting Socket.IO event:', error);
    }
}

module.exports = {
    creditStarterPrize
};
