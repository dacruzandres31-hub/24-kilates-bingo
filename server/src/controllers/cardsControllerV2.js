const pool = require('../db');
const websocketService = require('../services/websocketService');

// Importar helpers
const cardValidation = require('../helpers/cards/validation');
const cardPayment = require('../helpers/cards/payment');
const cardPotUpdate = require('../helpers/cards/potUpdate');
const cardSync = require('../helpers/cards/sync');

// Mapeo de nombres de salas
const ROOM_MAP = {
    'bronze': 'bronce',
    'silver': 'plata',
    'gold': 'oro',
    'starter': 'starter'
};

/**
 * POST /api/cards/select-v2
 * Versión refactorizada de selectCards usando helpers modulares
 */
exports.selectCardsV2 = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const { cardIds, room, packageInfo } = req.body;
        const userId = req.user.id;
        const roomDB = ROOM_MAP[room] || room;

        // Extraer cantidades
        const giftCount = packageInfo?.bonus || 0;
        const purchasedCount = cardIds.length - giftCount;

        console.log(`[Cards-V2] 🎯 Usuario ${userId} seleccionando ${cardIds.length} cartones (${purchasedCount} comprados + ${giftCount} PLUS) para sala ${roomDB}`);

        // ============================================
        // 1. VALIDACIÓN
        // ============================================
        cardValidation.validateCardLimits(cardIds);

        // ============================================
        // 2. VALIDACIÓN Y PAGO (solo si NO es starter)
        // ============================================
        if (roomDB !== 'starter') {
            // Validar tickets disponibles
            const { totalAvailable } = await cardValidation.validateUserTickets(userId, roomDB, purchasedCount);

            // Si no tiene suficientes tickets, usar balance
            if (totalAvailable < purchasedCount) {
                console.log(`[Cards-V2] ⚠️ Tickets insuficientes - usando balance`);

                // Validar balance
                const { totalCost, cardCost } = await cardValidation.validateUserBalance(userId, roomDB, purchasedCount);

                // Procesar pago con balance
                await cardPayment.processBalancePayment(
                    connection,
                    userId,
                    totalCost,
                    `Compra de ${purchasedCount} cartones para sala ${roomDB} (${giftCount} PLUS gratis)`
                );

                // Crear inventario de cartones comprados
                await cardPayment.createCardInventory(connection, userId, roomDB, purchasedCount, false);

                // Crear inventario de cartones PLUS si hay
                if (giftCount > 0) {
                    await cardPayment.createCardInventory(connection, userId, roomDB, giftCount, true);
                }
            } else {
                // Tiene suficientes tickets - usarlos
                console.log(`[Cards-V2] ✅ Usando tickets del inventario`);

                // Calcular cuántos usar de cada tipo (pagos primero, luego gratis)
                const { availablePaid } = await cardValidation.validateUserTickets(userId, roomDB, purchasedCount);

                if (availablePaid >= purchasedCount) {
                    // Usar solo pagos
                    await cardPayment.processTicketPayment(connection, userId, roomDB, purchasedCount, false);
                } else {
                    // Usar todos los pagos + algunos gratis
                    if (availablePaid > 0) {
                        await cardPayment.processTicketPayment(connection, userId, roomDB, availablePaid, false);
                    }
                    const freeNeeded = purchasedCount - availablePaid;
                    await cardPayment.processTicketPayment(connection, userId, roomDB, freeNeeded, true);
                }
            }
        }

        // ============================================
        // 3. GUARDAR CARTONES EN BINGO_CARDS_POOL
        // ============================================
        const selectedCards = await saveCardsToPool(connection, cardIds, userId, roomDB);

        // Commit de la transacción principal
        await connection.commit();
        connection.release();

        console.log(`[Cards-V2] ✅ ${cardIds.length} cartones guardados exitosamente`);

        // ============================================
        // 4. ACTUALIZAR POZOS (async, no bloquea respuesta)
        // ============================================
        if (roomDB !== 'starter') {
            // Ejecutar en background para no bloquear respuesta al usuario
            cardPotUpdate.updateSessionPots(roomDB, purchasedCount, cardIds.length)
                .catch(error => console.error('[Cards-V2] Error actualizando pozos:', error));
        } else {
            // Sincronizar cartones de Starter
            cardSync.syncStarterCards(userId, selectedCards)
                .catch(error => console.error('[Cards-V2] Error sincronizando Starter:', error));
        }

        // ============================================
        // 5. RESPUESTA AL CLIENTE
        // ============================================
        res.json({
            success: true,
            cards: selectedCards,
            message: `${cardIds.length} cartones seleccionados exitosamente`
        });

    } catch (error) {
        await connection.rollback();
        connection.release();

        console.error('[Cards-V2] ❌ Error en selectCardsV2:', error);

        // Manejar errores específicos
        if (error.code === 'insufficient_funds') {
            return res.status(402).json(error.details);
        }

        res.status(500).json({
            error: 'Error al seleccionar cartones',
            details: error.message
        });
    }
};

/**
 * Helper: Guardar cartones en bingo_cards_pool
 */
async function saveCardsToPool(connection, cardIds, userId, room) {
    // Marcar cartones como seleccionados
    await connection.query(
        `UPDATE bingo_cards_pool 
     SET selected_by = ?, selected_at = NOW(), status = 'selected'
     WHERE id IN (?) AND status = 'available'`,
        [userId, cardIds]
    );

    // Obtener cartones seleccionados
    const [selectedCards] = await connection.query(
        `SELECT id, serial as card_serial, numbers, selected_at 
     FROM bingo_cards_pool 
     WHERE id IN (?)`,
        [cardIds]
    );

    return selectedCards;
}

module.exports = exports;
