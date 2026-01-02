const dbHelper = require('../helpers/dbHelper');
const cardInventoryService = require('./cardInventoryService');

/**
 * REFERRAL SERVICE
 * Handles logical rewarding for the growth system.
 */
class ReferralService {
    constructor() {
        this.GIFT_QUANTITY = 5;
        this.GIFT_ROOM = 'plata';
    }

    /**
     * processFirstDepositReward
     * Triggered when a deposit is APPROVED. Checks if user was referred and if it's their first.
     */
    async processFirstDepositReward(userId, depositAmount) {
        try {
            // 1. Check if user has a referrer and hasn't been rewarded yet
            const user = await dbHelper.queryOne(
                'SELECT referred_by FROM users WHERE id = ?',
                [userId],
                'ReferralService_CheckReferrer'
            );

            if (!user || !user.referred_by) {
                return { rewarded: false, reason: 'No referrer found' };
            }

            const referrerId = user.referred_by;

            // 2. Check if this is truly the first APPROVED deposit
            const approvedCount = await dbHelper.queryOne(
                'SELECT COUNT(*) as count FROM deposits WHERE user_id = ? AND status = "approved"',
                [userId],
                'ReferralService_CountApproved'
            );

            // If count > 1, it means this isn't the first (this call happens AFTER approval)
            if (approvedCount.count > 1) {
                return { rewarded: false, reason: 'Not the first approved deposit' };
            }

            // 3. QUEUE THE REWARD: Always insert as pending
            console.log(`📥 [REFERRAL] Queuing reward for Referrer ID ${referrerId}. Referred user ${userId} made their first deposit.`);

            await dbHelper.query(
                `INSERT INTO referral_rewards (referrer_id, referred_user_id, reward_type, amount, description, status)
                 VALUES (?, ?, 'cards', ?, ?, 'pending')`,
                [referrerId, userId, this.GIFT_QUANTITY, `5 cartones Plata por primer depósito de usuario ${userId}`],
                'ReferralService_QueueReward'
            );

            // Attempt to deliver immediately if limit allows
            return await this.deliverPendingReward(referrerId);
        } catch (error) {
            console.error('❌ [REFERRAL_ERROR] Error processing reward:', error.message);
            return { rewarded: false, error: error.message };
        }
    }

    /**
     * deliverPendingReward
     * Checks if user has pending rewards and if they haven't received one today.
     */
    async deliverPendingReward(referrerId) {
        try {
            // 1. Check if user already received a reward TODAY
            const todayReward = await dbHelper.queryOne(
                'SELECT id FROM referral_rewards WHERE referrer_id = ? AND DATE(credited_at) = CURDATE() AND status = "credited"',
                [referrerId],
                'ReferralService_DailyCheck'
            );

            if (todayReward) {
                return { rewarded: false, reason: 'Already rewarded today' };
            }

            // 2. Get the oldest pending reward
            const pendingReward = await dbHelper.queryOne(
                'SELECT * FROM referral_rewards WHERE referrer_id = ? AND status = "pending" ORDER BY created_at ASC LIMIT 1',
                [referrerId],
                'ReferralService_GetOldestPending'
            );

            if (!pendingReward) {
                return { rewarded: false, reason: 'No pending rewards' };
            }

            // 3. Deliver reward
            console.log(`🎁 [REFERRAL_DELIVERY] Delivering queued reward ID ${pendingReward.id} to Referrer ID ${referrerId}`);

            await dbHelper.transaction(async (connection) => {
                const isGift = true;
                const reason = `Bono por invitado (Diferido): Usuario ID ${pendingReward.referred_user_id}`;
                const executedBy = 0;

                // A. Update inventory
                const [existing] = await connection.execute(
                    `SELECT id, quantity FROM user_card_inventory WHERE user_id = ? AND room = ? AND is_gift = ?`,
                    [referrerId, this.GIFT_ROOM, isGift]
                );

                if (existing.length > 0) {
                    await connection.execute(
                        `UPDATE user_card_inventory SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                        [this.GIFT_QUANTITY, existing[0].id]
                    );
                } else {
                    await connection.execute(
                        `INSERT INTO user_card_inventory (user_id, room, is_gift, quantity) VALUES (?, ?, ?, ?)`,
                        [referrerId, this.GIFT_ROOM, isGift, this.GIFT_QUANTITY]
                    );
                }

                // B. Log movement
                await connection.execute(
                    `INSERT INTO card_movements_log (user_id, room, movement_type, quantity, is_gift, reason, executed_by)
                     VALUES (?, ?, 'credit', ?, ?, ?, ?)`,
                    [referrerId, this.GIFT_ROOM, this.GIFT_QUANTITY, isGift, reason, executedBy]
                );

                // C. Mark as credited
                await connection.execute(
                    `UPDATE referral_rewards SET status = 'credited', credited_at = CURRENT_TIMESTAMP WHERE id = ?`,
                    [pendingReward.id]
                );
            });

            return { rewarded: true, amount: this.GIFT_QUANTITY, type: 'cards' };

        } catch (error) {
            console.error('❌ [REFERRAL_DELIVERY_ERROR] Error delivering reward:', error.message);
            return { rewarded: false, error: error.message };
        }
    }
}

module.exports = new ReferralService();
