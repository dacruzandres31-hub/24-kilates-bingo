/**
 * WHATSAPP 24K CONTROLLER
 * Endpoints para gestión de WhatsApp premium
 */

const pool = require('../db');
const whatsapp24KService = require('../services/whatsapp24KService');

/**
 * Obtener configuración de WhatsApp del usuario
 */
exports.getSettings = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const [settings] = await pool.query(
            'SELECT * FROM user_whatsapp_settings WHERE user_id = ?',
            [userId]
        );

        if (settings.length === 0) {
            return res.json({
                success: true,
                settings: null,
                message: 'No hay configuración de WhatsApp'
            });
        }

        // No enviar código de verificación al cliente
        const { verification_code, verification_expires, ...safeSettings } = settings[0];

        res.json({
            success: true,
            settings: safeSettings
        });

    } catch (error) {
        console.error('Error getting WhatsApp settings:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Actualizar preferencias de notificación
 */
exports.updatePreferences = async (req, res) => {
    try {
        const userId = req.user.id;
        const preferences = req.body;

        // Campos permitidos
        const allowedFields = [
            'notify_card_purchase', 'notify_almost_win', 'notify_prize_won',
            'notify_game_reminder', 'notify_balance_update', 'notify_deposit_received',
            'notify_commission', 'notify_new_player', 'notify_daily_summary',
            'notify_withdrawal_request', 'notify_system_alerts', 'notify_large_withdrawals',
            'notify_security_events', 'quiet_hours_start', 'quiet_hours_end'
        ];

        // Filtrar solo campos permitidos
        const updates = {};
        for (const field of allowedFields) {
            if (preferences[field] !== undefined) {
                updates[field] = preferences[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ success: false, message: 'No hay preferencias válidas para actualizar' });
        }

        // Verificar que existe registro
        const [existing] = await pool.query(
            'SELECT id FROM user_whatsapp_settings WHERE user_id = ?',
            [userId]
        );

        if (existing.length === 0) {
            // Crear registro con preferencias
            const fields = ['user_id', ...Object.keys(updates)];
            const values = [userId, ...Object.values(updates)];
            const placeholders = fields.map(() => '?').join(', ');

            await pool.query(
                `INSERT INTO user_whatsapp_settings (${fields.join(', ')}) VALUES (${placeholders})`,
                values
            );
        } else {
            // Actualizar
            const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
            await pool.query(
                `UPDATE user_whatsapp_settings SET ${setClause} WHERE user_id = ?`,
                [...Object.values(updates), userId]
            );
        }

        res.json({ success: true, message: 'Preferencias actualizadas' });

    } catch (error) {
        console.error('Error updating preferences:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Solicitar código de verificación
 */
exports.requestVerification = async (req, res) => {
    try {
        const userId = req.user.id;
        const { phoneNumber } = req.body;

        if (!phoneNumber) {
            return res.status(400).json({ success: false, message: 'Número de teléfono requerido' });
        }

        // Validar formato básico
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        if (cleanPhone.length < 10 || cleanPhone.length > 15) {
            return res.status(400).json({ success: false, message: 'Número de teléfono inválido' });
        }

        // Verificar que no esté ya verificado por otro usuario
        const [existing] = await pool.query(
            `SELECT user_id FROM user_whatsapp_settings 
             WHERE phone_number = ? AND phone_verified = TRUE AND user_id != ?`,
            [phoneNumber, userId]
        );

        if (existing.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Este número ya está vinculado a otra cuenta' 
            });
        }

        // Enviar código
        const result = await whatsapp24KService.sendVerificationCode(userId, phoneNumber);

        if (result.success) {
            res.json({ 
                success: true, 
                message: 'Código enviado. Revisa tu WhatsApp.' 
            });
        } else {
            res.status(500).json({ 
                success: false, 
                message: 'Error enviando código. Verifica que el número sea correcto.' 
            });
        }

    } catch (error) {
        console.error('Error requesting verification:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Verificar código
 */
exports.verifyCode = async (req, res) => {
    try {
        const userId = req.user.id;
        const { code } = req.body;

        if (!code || code.length !== 6) {
            return res.status(400).json({ success: false, message: 'Código de 6 dígitos requerido' });
        }

        const result = await whatsapp24KService.verifyCode(userId, code);

        if (result.success) {
            res.json({ 
                success: true, 
                message: '¡WhatsApp verificado correctamente! 🎉' 
            });
        } else {
            res.status(400).json({ 
                success: false, 
                message: result.error 
            });
        }

    } catch (error) {
        console.error('Error verifying code:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Desvincular WhatsApp
 */
exports.unlinkWhatsApp = async (req, res) => {
    try {
        const userId = req.user.id;

        await pool.query(
            `UPDATE user_whatsapp_settings 
             SET phone_number = NULL, phone_verified = FALSE, verification_code = NULL
             WHERE user_id = ?`,
            [userId]
        );

        res.json({ success: true, message: 'WhatsApp desvinculado' });

    } catch (error) {
        console.error('Error unlinking WhatsApp:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Obtener historial de mensajes (últimos 50)
 */
exports.getMessageHistory = async (req, res) => {
    try {
        const userId = req.user.id;

        const [messages] = await pool.query(
            `SELECT id, message_type, message_content, media_type, status, created_at, sent_at
             FROM whatsapp_message_log 
             WHERE user_id = ?
             ORDER BY created_at DESC
             LIMIT 50`,
            [userId]
        );

        res.json({ success: true, messages });

    } catch (error) {
        console.error('Error getting message history:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Enviar mensaje de prueba (solo para testing)
 */
exports.sendTestMessage = async (req, res) => {
    try {
        const userId = req.user.id;
        const settings = await whatsapp24KService.getUserSettings(userId);

        if (!settings?.phone_verified) {
            return res.status(400).json({ 
                success: false, 
                message: 'Debes verificar tu WhatsApp primero' 
            });
        }

        const result = await whatsapp24KService.sendText(
            settings.phone_number,
            '🧪 *Mensaje de Prueba*\n\n¡Tu WhatsApp está correctamente configurado con Bingo 24K! 🎰\n\n_Ahora recibirás notificaciones de tus partidas._',
            userId
        );

        if (result.success) {
            res.json({ success: true, message: 'Mensaje de prueba enviado' });
        } else {
            res.status(500).json({ success: false, message: 'Error enviando mensaje' });
        }

    } catch (error) {
        console.error('Error sending test message:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// =====================================================
// ADMIN ENDPOINTS
// =====================================================

/**
 * Obtener estadísticas de WhatsApp (solo superadmin)
 */
exports.getStats = async (req, res) => {
    try {
        if (req.user.role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'No autorizado' });
        }

        const [stats] = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM user_whatsapp_settings WHERE phone_verified = TRUE) as verified_users,
                (SELECT COUNT(*) FROM whatsapp_message_log WHERE status = 'sent' AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)) as messages_24h,
                (SELECT COUNT(*) FROM whatsapp_message_log WHERE status = 'failed' AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)) as failed_24h,
                (SELECT COUNT(*) FROM whatsapp_message_queue WHERE status = 'pending') as pending_queue
        `);

        const [byType] = await pool.query(`
            SELECT message_type, COUNT(*) as count
            FROM whatsapp_message_log
            WHERE created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
            GROUP BY message_type
            ORDER BY count DESC
        `);

        res.json({
            success: true,
            stats: stats[0],
            messagesByType: byType
        });

    } catch (error) {
        console.error('Error getting WhatsApp stats:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Obtener configuración del sistema (solo superadmin)
 */
exports.getSystemConfig = async (req, res) => {
    try {
        if (req.user.role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'No autorizado' });
        }

        const [config] = await pool.query('SELECT * FROM whatsapp_system_config');

        const configMap = {};
        config.forEach(c => {
            // Ocultar API key parcialmente
            if (c.config_key === 'evolution_api_key') {
                configMap[c.config_key] = c.config_value.substring(0, 8) + '***';
            } else {
                configMap[c.config_key] = c.config_value;
            }
        });

        res.json({ success: true, config: configMap });

    } catch (error) {
        console.error('Error getting system config:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Actualizar configuración del sistema (solo superadmin)
 */
exports.updateSystemConfig = async (req, res) => {
    try {
        if (req.user.role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'No autorizado' });
        }

        const { key, value } = req.body;

        if (!key || value === undefined) {
            return res.status(400).json({ success: false, message: 'Key y value requeridos' });
        }

        await pool.query(
            `UPDATE whatsapp_system_config SET config_value = ?, updated_by = ? WHERE config_key = ?`,
            [value, req.user.id, key]
        );

        // Reinicializar servicio si se cambió algo importante
        if (['evolution_api_url', 'evolution_api_key', 'evolution_instance', 'enabled'].includes(key)) {
            await whatsapp24KService.initialize();
        }

        res.json({ success: true, message: 'Configuración actualizada' });

    } catch (error) {
        console.error('Error updating system config:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Obtener plantillas (solo superadmin)
 */
exports.getTemplates = async (req, res) => {
    try {
        if (req.user.role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'No autorizado' });
        }

        const [templates] = await pool.query('SELECT * FROM whatsapp_templates ORDER BY template_name');

        res.json({ success: true, templates });

    } catch (error) {
        console.error('Error getting templates:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Actualizar plantilla (solo superadmin)
 */
exports.updateTemplate = async (req, res) => {
    try {
        if (req.user.role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'No autorizado' });
        }

        const { templateKey } = req.params;
        const { template_body, is_active } = req.body;

        await pool.query(
            `UPDATE whatsapp_templates SET template_body = ?, is_active = ? WHERE template_key = ?`,
            [template_body, is_active, templateKey]
        );

        res.json({ success: true, message: 'Plantilla actualizada' });

    } catch (error) {
        console.error('Error updating template:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// =====================================================
// LEGACY SUPPORT (mantener compatibilidad con código viejo)
// =====================================================

exports.getConfig = exports.getSettings;
exports.saveConfig = exports.updatePreferences;
exports.sendReceipt = async (req, res) => {
    res.status(410).json({ 
        success: false, 
        message: 'Este endpoint fue reemplazado. Usa el nuevo sistema de WhatsApp 24K.' 
    });
};
exports.getReceiptsHistory = exports.getMessageHistory;
