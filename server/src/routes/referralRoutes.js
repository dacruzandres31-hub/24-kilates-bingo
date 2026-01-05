const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * REFERRAL ROUTES
 * Sistema de referidos con códigos únicos
 */

// Obtener mi link/código de referido
router.get('/my-link', authMiddleware.authenticateToken, referralController.getMyReferralLink);

// Obtener mis referidos (árbol de referidos)
router.get('/my-referrals', authMiddleware.authenticateToken, referralController.getMyReferrals);

module.exports = router;
