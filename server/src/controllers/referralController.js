const dbHelper = require('../helpers/dbHelper');
const responseHelper = require('../helpers/responseHelper');
const referralHelper = require('../helpers/referralHelper');

/**
 * REFERRAL CONTROLLER
 * Usa parent_id para la jerarquía de referidos
 */

/**
 * GET /api/referrals/my-link
 * Obtiene el link de referido del usuario actual
 */
exports.getMyReferralLink = async (req, res) => {
    try {
        const userId = req.user.id;

        // Obtener código de referido actual
        const [user] = await dbHelper.query(
            'SELECT referral_code FROM users WHERE id = ?',
            [userId],
            'GetMyReferralLink'
        );

        let referralCode = user?.referral_code;

        // Si no tiene código, generar uno
        if (!referralCode) {
            referralCode = await referralHelper.assignCodeToUser(userId);
        }

        // Generar link completo
        const referralLink = referralHelper.generateReferralLink(referralCode);

        return responseHelper.success(res, {
            referral_code: referralCode,
            referral_link: referralLink
        });

    } catch (error) {
        return responseHelper.error(res, 500, 'Error al obtener link de referido', error.message);
    }
};

/**
 * GET /api/referrals/my-referrals
 * Obtiene los referidos del usuario actual
 */
exports.getMyReferrals = async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Get referral tree using recursive CTE (up to level 4)
        const referrals = await dbHelper.query(
            `WITH RECURSIVE referral_tree AS (
                -- Nivel 1: Directos
                SELECT id, username, parent_id, created_at, subscription_tier_id, 1 as level
                FROM users
                WHERE parent_id = ?
                
                UNION ALL
                
                -- Niveles 2-4: Indirectos
                SELECT u.id, u.username, u.parent_id, u.created_at, u.subscription_tier_id, rt.level + 1
                FROM users u
                INNER JOIN referral_tree rt ON u.parent_id = rt.id
                WHERE rt.level < 4
            )
            SELECT rt.*, m.name as tier_name
            FROM referral_tree rt
            LEFT JOIN memberships m ON rt.subscription_tier_id = m.id
            ORDER BY rt.level ASC, rt.created_at DESC`,
            [userId],
            'GetMyReferrals_Tree'
        );

        // 2. Calculate stats por nivel
        const stats = {
            total_registered: referrals.length,
            levels: {
                l1: referrals.filter(r => r.level === 1).length,
                l2: referrals.filter(r => r.level === 2).length,
                l3: referrals.filter(r => r.level === 3).length,
                l4: referrals.filter(r => r.level === 4).length
            }
        };

        // 3. Obtener comisiones generadas
        const [commissions] = await dbHelper.query(
            `SELECT COALESCE(SUM(amount), 0) as total 
             FROM chips_movements 
             WHERE user_id = ? AND movement_type = 'commission'`,
            [userId],
            'GetMyReferrals_Commissions'
        );

        // 4. Obtener mi código de referido
        const [user] = await dbHelper.query(
            'SELECT referral_code FROM users WHERE id = ?',
            [userId],
            'GetMyReferrals_Code'
        );

        return responseHelper.success(res, {
            referral_code: user?.referral_code || null,
            referral_link: user?.referral_code 
                ? referralHelper.generateReferralLink(user.referral_code) 
                : null,
            referrals: referrals.map(r => ({
                id: r.id,
                username: r.username,
                created_at: r.created_at,
                level: r.level,
                tier_name: r.tier_name || 'Sin membresía'
            })),
            stats: {
                registered: stats.total_registered,
                totalCommissions: parseFloat(commissions?.total || 0),
                levels: stats.levels
            }
        });

    } catch (error) {
        return responseHelper.error(res, 500, 'Error al obtener referidos', error.message);
    }
};
