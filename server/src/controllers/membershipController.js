const membershipService = require('../services/membershipService');

class MembershipController {

    // GET /api/memberships
    async getPlans(req, res) {
        try {
            const plans = await membershipService.getAllMemberships();
            res.json(plans);
        } catch (error) {
            console.error('Error fetching plans:', error);
            res.status(500).json({ error: 'Error al obtener planes' });
        }
    }

    // GET /api/memberships/my-subscription
    async getMySubscription(req, res) {
        try {
            if (!req.user || !req.user.id) {
                return res.status(401).json({ error: 'Usuario no autenticado' });
            }

            // Get ALL active subscriptions (can have Embajador + another)
            const activeSubscriptions = await membershipService.getUserSubscriptions(req.user.id);
            const pendingRequests = await membershipService.getPendingPurchases(req.user.id);

            // Separate Embajador from regular tier
            const embajadorSub = activeSubscriptions.find(s => s.plan_name && s.plan_name.toLowerCase().includes('embajador'));
            const tierSub = activeSubscriptions.find(s => s.plan_name && !s.plan_name.toLowerCase().includes('embajador'));

            res.json({
                subscription: tierSub || null, // Main tier (Bronce/Plata/Oro)
                embajadorSubscription: embajadorSub || null, // Embajador if active
                activeSubscriptions: activeSubscriptions, // All active subs
                pendingRequests: pendingRequests || [],
                status: activeSubscriptions.length > 0 ? 'active' : 'none',
                message: activeSubscriptions.length === 0 ? 'No tienes suscripción activa' : undefined
            });
        } catch (error) {
            console.error('Error fetching subscription:', error);
            res.status(500).json({ error: 'Error al obtener suscripción' });
        }
    }

    // POST /api/memberships/subscribe
    async subscribe(req, res) {
        try {
            const { membershipId } = req.body;
            if (!membershipId) {
                return res.status(400).json({ error: 'ID de membresía requerido' });
            }

            const result = await membershipService.subscribe(req.user.id, membershipId);
            res.json(result);
        } catch (error) {
            console.error('Error subscribing:', error);
            res.status(400).json({ error: error.message || 'Error al procesar suscripción' });
        }
    }

    async getSubscription(req, res) {
        try {
            const subscription = await membershipService.getUserSubscription(req.user.id);
            const pendingRequests = await membershipService.getPendingPurchases(req.user.id);

            res.json({
                subscription: subscription || null,
                pendingRequests: pendingRequests || []
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }

    // POST /api/memberships/cancel
    async cancel(req, res) {
        try {
            const result = await membershipService.cancelSubscription(req.user.id);
            res.json(result);
        } catch (error) {
            console.error('Error cancelling:', error);
            res.status(400).json({ error: error.message || 'Error al cancelar suscripción' });
        }
    }

    // GET /api/memberships/daily-free-cards
    async getDailyFreeCards(req, res) {
        try {
            const dailyFreeCardsService = require('../services/dailyFreeCardsService');
            const available = await dailyFreeCardsService.checkAndResetDailyCards(req.user.id);

            res.json({
                available: available,
                canClaim: available > 0
            });
        } catch (error) {
            console.error('Error getting daily free cards:', error);
            res.status(500).json({ error: 'Error al obtener cartones gratis' });
        }
    }

    // GET /api/memberships/daily-benefits (UNIFIED)
    async getDailyBenefits(req, res) {
        try {
            const dailyBenefitsService = require('../services/dailyBenefitsService');
            const benefits = await dailyBenefitsService.checkAndResetDailyBenefits(req.user.id);

            res.json(benefits);
        } catch (error) {
            console.error('Error getting daily benefits:', error);
            res.status(500).json({ error: 'Error al obtener beneficios diarios' });
        }
    }

    // ADMIN: Create Plan (Future use)
}

module.exports = new MembershipController();
