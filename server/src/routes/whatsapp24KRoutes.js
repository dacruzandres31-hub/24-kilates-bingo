/**
 * WHATSAPP 24K ROUTES
 * Rutas para el sistema premium de WhatsApp
 */

const express = require('express');
const router = express.Router();
const whatsapp24KController = require('../controllers/whatsapp24KController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// =====================================================
// RUTAS DE USUARIO (todos los roles)
// =====================================================

// Obtener configuración personal
router.get('/settings', whatsapp24KController.getSettings);

// Actualizar preferencias de notificación
router.put('/preferences', whatsapp24KController.updatePreferences);

// Verificación de número
router.post('/verify/request', whatsapp24KController.requestVerification);
router.post('/verify/confirm', whatsapp24KController.verifyCode);

// Desvincular WhatsApp
router.delete('/unlink', whatsapp24KController.unlinkWhatsApp);

// Historial de mensajes
router.get('/messages', whatsapp24KController.getMessageHistory);

// Mensaje de prueba
router.post('/test', whatsapp24KController.sendTestMessage);

// =====================================================
// RUTAS DE ADMIN (solo superadmin)
// =====================================================

// Estadísticas
router.get('/admin/stats', whatsapp24KController.getStats);

// Configuración del sistema
router.get('/admin/config', whatsapp24KController.getSystemConfig);
router.put('/admin/config', whatsapp24KController.updateSystemConfig);

// Plantillas
router.get('/admin/templates', whatsapp24KController.getTemplates);
router.put('/admin/templates/:templateKey', whatsapp24KController.updateTemplate);

// =====================================================
// LEGACY ROUTES (compatibilidad hacia atrás)
// =====================================================

router.get('/config', whatsapp24KController.getConfig);
router.post('/config', whatsapp24KController.saveConfig);
router.post('/send-receipt', whatsapp24KController.sendReceipt);
router.get('/history', whatsapp24KController.getReceiptsHistory);

module.exports = router;
