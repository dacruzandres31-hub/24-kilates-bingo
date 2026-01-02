const dbHelper = require('../helpers/dbHelper');
const responseHelper = require('../helpers/responseHelper');

/**
 * REFERRAL CONTROLLER
 */
exports.getMyReferrals = async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Get referral tree using recursive CTE (up to level 4)
        const referrals = await dbHelper.query(
            `WITH RECURSIVE referral_tree AS (
                -- Nivel 1: Directos
                SELECT id, username, referred_by, created_at, subscription_tier_id, 1 as level
                FROM users
                WHERE referred_by = ?
                
                UNION ALL
                
                -- Niveles 2-4: Indirectos
                SELECT u.id, u.username, u.referred_by, u.created_at, u.subscription_tier_id, rt.level + 1
                FROM users u
                INNER JOIN referral_tree rt ON u.referred_by = rt.id
                WHERE rt.level < 4
            )
            SELECT rt.*, m.name as tier_name, rw.amount as reward_amount, rw.id as reward_id
            FROM referral_tree rt
            LEFT JOIN memberships m ON rt.subscription_tier_id = m.id
            LEFT JOIN referral_rewards rw ON (rt.id = rw.referred_user_id AND rw.referrer_id = ?)
            ORDER BY rt.level ASC, rt.created_at DESC`,
            [userId, userId],
            'GetMyReferrals_Tree'
        );

        // 2. Calculate stats
        const stats = {
            total_registered: referrals.length,
            total_rewarded: referrals.filter(r => r.reward_id).length,
            total_earned: referrals.reduce((sum, r) => sum + (r.reward_amount || 0), 0),
            levels: {
                l1: referrals.filter(r => r.level === 1).length,
                l2: referrals.filter(r => r.level === 2).length,
                l3: referrals.filter(r => r.level === 3).length,
                l4: referrals.filter(r => r.level === 4).length
            }
        };

        // 3. Get detailed rewards history (all statuses)
        const rewardsHistory = await dbHelper.query(
            `SELECT rw.*, u.username as source_username
             FROM referral_rewards rw
             JOIN users u ON rw.referred_user_id = u.id
             WHERE rw.referrer_id = ?
             ORDER BY rw.created_at DESC`,
            [userId],
            'GetMyReferrals_RewardsHistory'
        );

        return responseHelper.success(res, {
            referrals: referrals.map(r => ({
                username: r.username,
                created_at: r.created_at,
                level: r.level,
                tier_name: r.tier_name,
                is_ambassador: r.tier_name === 'Socio Embajador 24K'
            })),
            rewards: rewardsHistory.map(rw => ({
                id: rw.id,
                source_username: rw.source_username,
                amount: rw.amount,
                status: rw.status,
                created_at: rw.created_at,
                credited_at: rw.credited_at
            })),
            stats: {
                registered: stats.total_registered,
                rewarded: stats.total_rewarded,
                totalEarned: stats.total_earned,
                levels: stats.levels
            }
        });

    } catch (error) {
        return responseHelper.error(res, 500, 'Error al obtener referidos', error.message);
    }
};
