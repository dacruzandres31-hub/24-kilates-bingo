const pool = require('../db');
const dailyBenefitsService = require('../services/dailyBenefitsService');
const cardPayment = require('../helpers/cards/payment');

/**
 * POST /api/cards/claim-daily-free
 * Reclama cartones gratis diarios de membresía VIP
 */
async function claimDailyFreeCards(req, res) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const { cardIds, room } = req.body;
        const userId = req.user.id;

        console.log(`[DailyFreeCards] 🎁 Usuario ${userId} reclamando ${cardIds.length} cartones gratis en sala ${room}`);

        // Verificar que tenga cartones disponibles y consumirlos
        await dailyBenefitsService.consumeDailyCards(userId, cardIds.length);

        // Guardar cartones en bingo_cards_pool
        await connection.query(
            `UPDATE bingo_cards_pool 
             SET selected_by = ?, selected_at = NOW(), status = 'selected'
             WHERE id IN (?) AND status = 'available'`,
            [userId, cardIds]
        );

        // Crear inventario como GIFT (NO suma al pozo)
        await cardPayment.createCardInventory(connection, userId, room, cardIds.length, true);

        // Obtener cartones seleccionados
        const [selectedCards] = await connection.query(
            `SELECT id, serial as card_serial, numbers, selected_at 
             FROM bingo_cards_pool 
             WHERE id IN (?)`,
            [cardIds]
        );

        await connection.commit();
        connection.release();

        console.log(`[DailyFreeCards] ✅ ${cardIds.length} cartones gratis reclamados exitosamente`);

        res.json({
            success: true,
            cards: selectedCards,
            message: `${cardIds.length} cartones gratis reclamados`
        });

    } catch (error) {
        await connection.rollback();
        connection.release();

        console.error('[DailyFreeCards] ❌ Error:', error);
        res.status(400).json({
            error: error.message || 'Error al reclamar cartones gratis'
        });
    }
}

module.exports = {
    claimDailyFreeCards
};
