const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * REFERRAL ROUTES
 */
router.get('/my-referrals', authMiddleware.authenticateToken, referralController.getMyReferrals);

module.exports = router;
