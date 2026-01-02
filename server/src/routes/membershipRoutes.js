const express = require('express');
const router = express.Router();
const membershipController = require('../controllers/membershipController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Public/Open (Protected by Auth still recommended for viewing plans if pricing dependent on user?, keeping it open for now but usually authenticated users view this)
router.get('/', membershipController.getPlans);

// Protected routes
router.get('/my-subscription', authenticateToken, membershipController.getMySubscription);
router.get('/daily-free-cards', authenticateToken, membershipController.getDailyFreeCards);
router.get('/daily-benefits', authenticateToken, membershipController.getDailyBenefits);
router.post('/subscribe', authenticateToken, membershipController.subscribe);
router.post('/cancel', authenticateToken, membershipController.cancel);

module.exports = router;
