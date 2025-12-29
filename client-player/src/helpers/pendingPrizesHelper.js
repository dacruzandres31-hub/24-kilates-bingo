/**
 * Helper para verificar premios pendientes cuando el jugador se conecta
 * Se usa en BronzeRoom, SilverRoom y GoldRoom
 */
import axios from 'axios';

export const checkPendingPrizes = async () => {
    try {
        const token = localStorage.getItem('playerToken');
        if (!token) return null;

        const response = await axios.get('/api/game/pending-prizes', {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success && response.data.data) {
            const { prizes, totalPrizes, totalAmount } = response.data.data;

            if (totalPrizes > 0) {
                console.log(`🎁 [PendingPrizes] Encontrados ${totalPrizes} premios pendientes por $${totalAmount}`);
                return { prizes, totalPrizes, totalAmount };
            }
        }

        return null;
    } catch (error) {
        console.error('❌ [PendingPrizes] Error verificando premios:', error);
        return null;
    }
};

export default { checkPendingPrizes };
