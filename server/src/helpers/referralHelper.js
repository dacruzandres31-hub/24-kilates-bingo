const pool = require('../db');

/**
 * Helper para sistema de referidos
 */
const referralHelper = {
    // Caracteres seguros para códigos (sin caracteres confusos como 0/O, 1/I/L)
    CHARACTERS: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',

    /**
     * Genera un código de referido único de 6 caracteres
     * @returns {string} Código único
     */
    generateCode: () => {
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += referralHelper.CHARACTERS.charAt(
                Math.floor(Math.random() * referralHelper.CHARACTERS.length)
            );
        }
        return code;
    },

    /**
     * Genera un código único verificando que no exista en la BD
     * @returns {Promise<string>} Código único garantizado
     */
    generateUniqueCode: async () => {
        let unique = false;
        let code = '';
        let attempts = 0;
        const maxAttempts = 10;

        while (!unique && attempts < maxAttempts) {
            code = referralHelper.generateCode();
            const [existing] = await pool.query(
                'SELECT id FROM users WHERE referral_code = ?',
                [code]
            );
            if (existing.length === 0) {
                unique = true;
            }
            attempts++;
        }

        if (!unique) {
            // Fallback: agregar timestamp
            code = referralHelper.generateCode() + Date.now().toString(36).slice(-2).toUpperCase();
        }

        return code;
    },

    /**
     * Genera el link de referido completo
     * @param {string} referralCode - Código de referido
     * @param {string} baseUrl - URL base (default: https://24kilates.xyz)
     * @returns {string} Link completo de referido
     */
    generateReferralLink: (referralCode, baseUrl = 'https://24kilates.xyz') => {
        return `${baseUrl}/registro?ref=${referralCode}`;
    },

    /**
     * Busca un usuario por su código de referido
     * @param {string} referralCode - Código de referido
     * @returns {Promise<Object|null>} Usuario referente o null
     */
    findUserByReferralCode: async (referralCode) => {
        if (!referralCode) return null;
        
        const [users] = await pool.query(
            'SELECT id, username, role FROM users WHERE referral_code = ?',
            [referralCode.toUpperCase()]
        );
        
        return users.length > 0 ? users[0] : null;
    },

    /**
     * Asigna código de referido a un usuario existente
     * @param {number} userId - ID del usuario
     * @returns {Promise<string>} Código asignado
     */
    assignCodeToUser: async (userId) => {
        const code = await referralHelper.generateUniqueCode();
        await pool.query(
            'UPDATE users SET referral_code = ? WHERE id = ?',
            [code, userId]
        );
        return code;
    },

    /**
     * Obtiene estadísticas de referidos de un usuario
     * @param {number} userId - ID del usuario
     * @returns {Promise<Object>} Estadísticas de referidos
     */
    getReferralStats: async (userId) => {
        // Total de referidos directos
        const [directReferrals] = await pool.query(
            'SELECT COUNT(*) as count FROM users WHERE parent_id = ?',
            [userId]
        );

        // Referidos activos (que han jugado en los últimos 30 días)
        const [activeReferrals] = await pool.query(
            `SELECT COUNT(DISTINCT u.id) as count 
             FROM users u 
             JOIN chips_movements cm ON u.id = cm.user_id
             WHERE u.parent_id = ? 
               AND cm.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
            [userId]
        );

        // Comisiones generadas (si existe la tabla)
        let totalCommissions = 0;
        try {
            const [commissions] = await pool.query(
                `SELECT COALESCE(SUM(amount), 0) as total 
                 FROM chips_movements 
                 WHERE user_id = ? AND movement_type = 'commission'`,
                [userId]
            );
            totalCommissions = parseFloat(commissions[0].total) || 0;
        } catch (e) {
            // Ignorar si no hay datos
        }

        return {
            totalReferrals: directReferrals[0].count,
            activeReferrals: activeReferrals[0].count,
            totalCommissions: totalCommissions
        };
    }
};

module.exports = referralHelper;
