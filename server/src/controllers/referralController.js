const dbHelper = require('../helpers/dbHelper');
const responseHelper = require('../helpers/responseHelper');
const referralHelper = require('../helpers/referralHelper');
const referralCommissionService = require('../services/referralCommissionService');

/**
 * REFERRAL CONTROLLER
 * Sistema de referidos con comisiones por membresía Embajador
 * 
 * Porcentajes por nivel:
 * - Nivel 1 (padre directo): 4% = $200
 * - Nivel 2: 3% = $150
 * - Nivel 3: 2% = $100
 * - Nivel 4: 1% = $50
 * 
 * Cobro disponible del 1 al 10 de cada mes
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
 * Obtiene los referidos del usuario actual con estado de membresía
 */
exports.getMyReferrals = async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Obtener árbol de referidos con membresía
        const referrals = await referralCommissionService.getReferralTreeWithMembership(userId, 4);

        // 2. Calcular stats por nivel
        const stats = {
            total: referrals.length,
            levels: {
                l1: referrals.filter(r => r.level === 1).length,
                l2: referrals.filter(r => r.level === 2).length,
                l3: referrals.filter(r => r.level === 3).length,
                l4: referrals.filter(r => r.level === 4).length
            },
            withMembership: referrals.filter(r => r.hasMembership).length,
            embajadores: referrals.filter(r => r.isEmbajador).length
        };

        // 3. Obtener resumen de comisiones
        const commissionSummary = await referralCommissionService.getCommissionSummary(userId);

        // 4. Obtener mi código de referido
        const [user] = await dbHelper.query(
            'SELECT referral_code FROM users WHERE id = ?',
            [userId],
            'GetMyReferrals_Code'
        );

        // 5. Verificar si es período de cobro
        const isClaimPeriod = referralCommissionService.isClaimPeriod();
        const today = new Date();
        const claimPeriodInfo = {
            isActive: isClaimPeriod,
            currentDay: today.getDate(),
            message: isClaimPeriod 
                ? 'Período de cobro activo (1-10 del mes)'
                : `Próximo período: 1-10 del mes ${today.getMonth() === 11 ? 'siguiente' : 'actual'}`
        };

        return responseHelper.success(res, {
            referral_code: user?.referral_code || null,
            referral_link: user?.referral_code 
                ? referralHelper.generateReferralLink(user.referral_code) 
                : null,
            referrals: referrals.map(r => ({
                id: r.id,
                username: r.username,
                level: r.level,
                createdAt: r.createdAt,
                membership: r.membership,
                hasMembership: r.hasMembership,
                isEmbajador: r.isEmbajador
            })),
            stats,
            commissions: commissionSummary,
            claimPeriod: claimPeriodInfo
        });

    } catch (error) {
        console.error('[Referrals] Error:', error);
        return responseHelper.error(res, 500, 'Error al obtener referidos', error.message);
    }
};

/**
 * GET /api/referrals/commissions
 * Obtiene el historial de comisiones del usuario
 */
exports.getCommissions = async (req, res) => {
    try {
        const userId = req.user.id;
        const { status = 'all' } = req.query;

        const commissions = await referralCommissionService.getCommissionHistory(userId, status);
        const summary = await referralCommissionService.getCommissionSummary(userId);
        const isClaimPeriod = referralCommissionService.isClaimPeriod();

        return responseHelper.success(res, {
            commissions: commissions.map(c => ({
                id: c.id,
                sourceUsername: c.source_username,
                level: c.referral_level,
                percentage: c.percentage,
                amount: parseFloat(c.amount),
                status: c.status,
                createdAt: c.created_at,
                claimedAt: c.claimed_at
            })),
            summary,
            claimPeriod: {
                isActive: isClaimPeriod,
                canClaim: isClaimPeriod && summary.pending.total > 0
            }
        });

    } catch (error) {
        console.error('[Referrals] Error obteniendo comisiones:', error);
        return responseHelper.error(res, 500, 'Error al obtener comisiones', error.message);
    }
};

/**
 * POST /api/referrals/commissions/claim
 * Cobra las comisiones pendientes (solo 1-10 del mes)
 */
exports.claimCommissions = async (req, res) => {
    try {
        const userId = req.user.id;
        const io = req.app.get('io');

        const result = await referralCommissionService.claimCommissions(userId, io);

        return responseHelper.success(res, {
            message: `¡Cobraste $${result.totalAmount} en comisiones!`,
            claimedCount: result.claimedCount,
            totalAmount: result.totalAmount
        });

    } catch (error) {
        console.error('[Referrals] Error cobrando comisiones:', error);
        
        // Si es error de período, retornar 400
        if (error.message.includes('período de cobro')) {
            return responseHelper.error(res, 400, error.message);
        }
        if (error.message.includes('No tienes comisiones')) {
            return responseHelper.error(res, 400, error.message);
        }
        
        return responseHelper.error(res, 500, 'Error al cobrar comisiones', error.message);
    }
};

/**
 * GET /api/referrals/claim-status
 * Verifica si el usuario puede cobrar comisiones
 */
exports.getClaimStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const summary = await referralCommissionService.getCommissionSummary(userId);
        const isClaimPeriod = referralCommissionService.isClaimPeriod();
        const today = new Date();

        return responseHelper.success(res, {
            isClaimPeriod,
            canClaim: isClaimPeriod && summary.pending.total > 0,
            pendingAmount: summary.pending.total,
            pendingCount: summary.pending.count,
            currentDay: today.getDate(),
            claimPeriodDays: '1-10',
            message: isClaimPeriod 
                ? (summary.pending.total > 0 
                    ? `Puedes cobrar $${summary.pending.total}` 
                    : 'No tienes comisiones pendientes')
                : 'El cobro estará disponible del 1 al 10 del próximo mes'
        });

    } catch (error) {
        console.error('[Referrals] Error verificando estado de cobro:', error);
        return responseHelper.error(res, 500, 'Error al verificar estado', error.message);
    }
};
