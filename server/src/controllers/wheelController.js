const pool = require('../db');
const dailyBenefitsService = require('../services/dailyBenefitsService');

/**
 * POST /api/wheel/use-extra-spin
 * Usa un giro extra VIP de la rueda de la fortuna
 */
async function useExtraSpin(req, res) {
    const connection = await pool.getConnection();

    try {
        const userId = req.user.id;

        console.log(`[WheelExtraSpin] 🎰 Usuario ${userId} usando giro extra VIP`);

        // Verificar y consumir giro extra
        const remainingSpins = await dailyBenefitsService.consumeDailySpins(userId, 1);

        // Simular giro de ruleta (misma lógica que el giro normal)
        // Por ahora retornar un premio aleatorio
        const prizes = [
            { index: 0, label: '$100.000', type: 'cash', value: 100000 },
            { index: 1, label: '🎫 BRONCE', type: 'ticket', value: 'bronze' },
            { index: 2, label: '🎫 BRONCE', type: 'ticket', value: 'bronze' },
            { index: 3, label: '🎫 BRONCE', type: 'ticket', value: 'bronze' },
            { index: 4, label: '$50.000', type: 'cash', value: 50000 },
            { index: 5, label: '🎫 PLATA', type: 'ticket', value: 'silver' },
            { index: 6, label: '🎫 PLATA', type: 'ticket', value: 'silver' },
            { index: 7, label: '🎫 PLATA', type: 'ticket', value: 'silver' },
            { index: 8, label: '$5.000', type: 'cash', value: 5000 },
            { index: 9, label: '🎫 ORO', type: 'ticket', value: 'gold' },
            { index: 10, label: '🎫 ORO', type: 'ticket', value: 'gold' },
            { index: 11, label: '🎫 BRONCE', type: 'ticket', value: 'bronze' }
        ];

        const randomIndex = Math.floor(Math.random() * prizes.length);
        const prize = prizes[randomIndex];

        // Otorgar premio
        if (prize.type === 'cash') {
            await connection.query(
                'UPDATE users SET balance = balance + ? WHERE id = ?',
                [prize.value, userId]
            );
            console.log(`[WheelExtraSpin] 💰 Premio: $${prize.value}`);
        } else if (prize.type === 'ticket') {
            const ticketColumn = `${prize.value}_tickets`;
            await connection.query(
                `UPDATE users SET ${ticketColumn} = ${ticketColumn} + 1 WHERE id = ?`,
                [userId]
            );
            console.log(`[WheelExtraSpin] 🎫 Premio: Ticket ${prize.value}`);
        }

        connection.release();

        res.json({
            success: true,
            prize,
            remainingSpins
        });

    } catch (error) {
        connection.release();
        console.error('[WheelExtraSpin] ❌ Error:', error);
        res.status(400).json({
            error: error.message || 'Error al usar giro extra'
        });
    }
}

module.exports = {
    useExtraSpin
};
