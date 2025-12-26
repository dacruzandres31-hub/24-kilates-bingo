const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Todas estas rutas requieren estar autenticado
router.use(authenticateToken);

// Configuración del Gateway (para cada Agente/Superadmin)
router.get('/config', whatsappController.getConfig);
router.post('/config', whatsappController.saveConfig);

// Envío de comprobantes
router.post('/send-receipt', whatsappController.sendReceipt);
router.get('/history', whatsappController.getReceiptsHistory);

module.exports = router;
