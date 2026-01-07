const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * REFERRAL ROUTES
 * Sistema de referidos con comisiones por membresía Embajador
 * 
 * Porcentajes por nivel:
 * - Nivel 1: 4% ($200)
 * - Nivel 2: 3% ($150)
 * - Nivel 3: 2% ($100)
 * - Nivel 4: 1% ($50)
 * 
 * Cobro disponible del 1 al 10 de cada mes
 */

// Obtener mi link/código de referido
router.get('/my-link', authMiddleware.authenticateToken, referralController.getMyReferralLink);

// Obtener mis referidos (árbol de referidos con estado de membresía)
router.get('/my-referrals', authMiddleware.authenticateToken, referralController.getMyReferrals);

// Obtener historial de comisiones
router.get('/commissions', authMiddleware.authenticateToken, referralController.getCommissions);

// Verificar estado de cobro
router.get('/claim-status', authMiddleware.authenticateToken, referralController.getClaimStatus);

// Cobrar comisiones pendientes (solo 1-10 del mes)
router.post('/commissions/claim', authMiddleware.authenticateToken, referralController.claimCommissions);

module.exports = router;
