const express = require('express');
const router = express.Router();
const wheelController = require('../controllers/wheelController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Usar giro extra VIP
router.post('/use-extra-spin', wheelController.useExtraSpin);

module.exports = router;
