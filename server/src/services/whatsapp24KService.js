/**
 * WHATSAPP 24K PREMIUM SERVICE
 * Integración completa con Evolution API
 * 
 * Funcionalidades:
 * - Envío de mensajes de texto, imágenes, videos, stickers
 * - Generación de imágenes de cartones
 * - Gestión de colas y reintentos
 * - Templates personalizables
 * - Logging completo
 */

const axios = require('axios');
const pool = require('../db');

class WhatsApp24KService {
    constructor() {
        this.config = null;
        this.instance = null;
        this.initialized = false;
    }

    /**
     * Inicializar servicio cargando configuración de BD
     */
    async initialize() {
        try {
            const [configs] = await pool.query(
                'SELECT config_key, config_value FROM whatsapp_system_config'
            );

            this.config = {};
            configs.forEach(c => {
                this.config[c.config_key] = c.config_value;
            });

            if (this.config.enabled === 'true') {
                this.instance = axios.create({
                    baseURL: this.config.evolution_api_url,
                    headers: {
                        'apikey': this.config.evolution_api_key,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                });
                this.initialized = true;
                console.log('✅ WhatsApp 24K Service initialized');
            } else {
                console.log('⚠️ WhatsApp 24K Service is disabled');
            }
        } catch (error) {
            console.error('❌ Error initializing WhatsApp service:', error.message);
        }
    }

    /**
     * Verificar si el servicio está activo
     */
    isEnabled() {
        return this.initialized && this.config?.enabled === 'true';
    }

    /**
     * Obtener configuración de notificaciones de un usuario
     */
    async getUserSettings(userId) {
        try {
            const [rows] = await pool.query(
                'SELECT * FROM user_whatsapp_settings WHERE user_id = ?',
                [userId]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('Error getting user WhatsApp settings:', error);
            return null;
        }
    }

    /**
     * Verificar si usuario puede recibir notificación de cierto tipo
     */
    async canNotify(userId, notificationType) {
        if (!this.isEnabled()) return false;

        const settings = await this.getUserSettings(userId);
        if (!settings || !settings.phone_verified) return false;

        // Verificar horario silencioso
        if (settings.quiet_hours_start && settings.quiet_hours_end) {
            const now = new Date();
            const currentTime = now.getHours() * 60 + now.getMinutes();
            const [startH, startM] = settings.quiet_hours_start.split(':').map(Number);
            const [endH, endM] = settings.quiet_hours_end.split(':').map(Number);
            const start = startH * 60 + startM;
            const end = endH * 60 + endM;

            if (start < end) {
                if (currentTime >= start && currentTime <= end) return false;
            } else {
                if (currentTime >= start || currentTime <= end) return false;
            }
        }

        // Verificar preferencia específica
        const prefKey = `notify_${notificationType}`;
        return settings[prefKey] !== false;
    }

    /**
     * Obtener plantilla de mensaje
     */
    async getTemplate(templateKey) {
        try {
            const [rows] = await pool.query(
                'SELECT * FROM whatsapp_templates WHERE template_key = ? AND is_active = TRUE',
                [templateKey]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('Error getting template:', error);
            return null;
        }
    }

    /**
     * Reemplazar variables en plantilla
     */
    parseTemplate(templateBody, variables) {
        let message = templateBody;
        for (const [key, value] of Object.entries(variables)) {
            message = message.replace(new RegExp(`{${key}}`, 'g'), value);
        }
        return message;
    }

    /**
     * Formatear número de teléfono para Argentina
     */
    formatPhoneNumber(phone) {
        let cleaned = phone.replace(/\D/g, '');
        
        // Si empieza con 0, quitarlo
        if (cleaned.startsWith('0')) {
            cleaned = cleaned.substring(1);
        }
        
        // Si no tiene código de país, agregar 54 (Argentina)
        if (!cleaned.startsWith('54')) {
            cleaned = '54' + cleaned;
        }
        
        // Agregar 9 después del 54 si no lo tiene (para móviles)
        if (cleaned.startsWith('54') && !cleaned.startsWith('549')) {
            cleaned = '549' + cleaned.substring(2);
        }
        
        return cleaned;
    }

    /**
     * Enviar mensaje de texto
     */
    async sendText(phoneNumber, message, userId = null) {
        if (!this.isEnabled()) {
            console.log('⚠️ WhatsApp service disabled, skipping message');
            return { success: false, reason: 'disabled' };
        }

        const formattedPhone = this.formatPhoneNumber(phoneNumber);
        
        try {
            const response = await this.instance.post(
                `/message/sendText/${this.config.evolution_instance}`,
                {
                    number: formattedPhone,
                    text: message
                }
            );

            // Log mensaje enviado
            if (userId) {
                await this.logMessage(userId, 'custom', formattedPhone, message, null, null, 'sent', response.data?.key?.id);
            }

            console.log(`📱 WhatsApp sent to ${formattedPhone}`);
            return { success: true, messageId: response.data?.key?.id };

        } catch (error) {
            console.error(`❌ WhatsApp error to ${formattedPhone}:`, error.response?.data || error.message);
            
            if (userId) {
                await this.logMessage(userId, 'custom', formattedPhone, message, null, null, 'failed', null, error.message);
            }

            return { success: false, error: error.message };
        }
    }

    /**
     * Enviar imagen con caption
     */
    async sendImage(phoneNumber, imageUrl, caption = '', userId = null, messageType = 'custom') {
        if (!this.isEnabled()) return { success: false, reason: 'disabled' };

        const formattedPhone = this.formatPhoneNumber(phoneNumber);

        try {
            const response = await this.instance.post(
                `/message/sendMedia/${this.config.evolution_instance}`,
                {
                    number: formattedPhone,
                    mediatype: 'image',
                    media: imageUrl,
                    caption: caption
                }
            );

            if (userId) {
                await this.logMessage(userId, messageType, formattedPhone, caption, imageUrl, 'image', 'sent', response.data?.key?.id);
            }

            return { success: true, messageId: response.data?.key?.id };

        } catch (error) {
            console.error(`❌ WhatsApp image error:`, error.response?.data || error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Enviar sticker
     */
    async sendSticker(phoneNumber, stickerUrl, userId = null) {
        if (!this.isEnabled()) return { success: false, reason: 'disabled' };

        const formattedPhone = this.formatPhoneNumber(phoneNumber);

        try {
            const response = await this.instance.post(
                `/message/sendSticker/${this.config.evolution_instance}`,
                {
                    number: formattedPhone,
                    sticker: stickerUrl
                }
            );

            return { success: true, messageId: response.data?.key?.id };

        } catch (error) {
            console.error(`❌ WhatsApp sticker error:`, error.response?.data || error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Registrar mensaje en log
     */
    async logMessage(userId, messageType, phoneNumber, content, mediaUrl, mediaType, status, evolutionId, errorMessage = null) {
        try {
            await pool.query(
                `INSERT INTO whatsapp_message_log 
                 (user_id, message_type, phone_number, message_content, media_url, media_type, status, evolution_message_id, error_message, sent_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [userId, messageType, phoneNumber, content, mediaUrl, mediaType, status, evolutionId, errorMessage]
            );
        } catch (error) {
            console.error('Error logging WhatsApp message:', error);
        }
    }

    // ==========================================
    // MÉTODOS DE ALTO NIVEL PARA CADA EVENTO
    // ==========================================

    /**
     * Enviar código de verificación
     */
    async sendVerificationCode(userId, phoneNumber) {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

        // Guardar código en BD
        await pool.query(
            `INSERT INTO user_whatsapp_settings (user_id, phone_number, verification_code, verification_expires)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
                phone_number = VALUES(phone_number),
                verification_code = VALUES(verification_code),
                verification_expires = VALUES(verification_expires),
                phone_verified = FALSE`,
            [userId, phoneNumber, code, expires]
        );

        const template = await this.getTemplate('verification_code');
        const message = this.parseTemplate(template.template_body, { code });

        const result = await this.sendText(phoneNumber, message, userId);
        
        if (result.success) {
            await this.logMessage(userId, 'verification', phoneNumber, message, null, null, 'sent', result.messageId);
        }

        return result;
    }

    /**
     * Verificar código
     */
    async verifyCode(userId, code) {
        const [rows] = await pool.query(
            `SELECT * FROM user_whatsapp_settings 
             WHERE user_id = ? AND verification_code = ? AND verification_expires > NOW()`,
            [userId, code]
        );

        if (rows.length === 0) {
            return { success: false, error: 'Código inválido o expirado' };
        }

        await pool.query(
            `UPDATE user_whatsapp_settings 
             SET phone_verified = TRUE, verification_code = NULL, verification_expires = NULL
             WHERE user_id = ?`,
            [userId]
        );

        return { success: true };
    }

    /**
     * Notificar compra de cartón
     */
    async notifyCardPurchase(userId, cardData) {
        if (!await this.canNotify(userId, 'card_purchase')) return;

        const settings = await this.getUserSettings(userId);
        const template = await this.getTemplate('card_purchase');
        
        const message = this.parseTemplate(template.template_body, {
            cardSerial: cardData.serial,
            room: this.getRoomDisplayName(cardData.room),
            price: cardData.price.toLocaleString(),
            gameTime: cardData.gameTime || 'Próximo sorteo'
        });

        // Si hay imagen del cartón, enviar con imagen
        if (cardData.imageUrl) {
            await this.sendImage(settings.phone_number, cardData.imageUrl, message, userId, 'card_purchase');
        } else {
            await this.sendText(settings.phone_number, message, userId);
        }
    }

    /**
     * Notificar casi-victoria (línea o bingo)
     */
    async notifyAlmostWin(userId, data) {
        if (!await this.canNotify(userId, 'almost_win')) return;

        const settings = await this.getUserSettings(userId);
        const templateKey = data.type === 'line' ? 'almost_win_line' : 'almost_win_bingo';
        const template = await this.getTemplate(templateKey);

        const message = this.parseTemplate(template.template_body, {
            missing: data.missing,
            cardSerial: data.cardSerial,
            numbersNeeded: data.numbersNeeded.join(', ')
        });

        await this.sendText(settings.phone_number, message, userId);
    }

    /**
     * Notificar premio ganado
     */
    async notifyPrizeWon(userId, prizeData) {
        if (!await this.canNotify(userId, 'prize_won')) return;

        const settings = await this.getUserSettings(userId);
        const templateKey = prizeData.type === 'line' ? 'prize_won_line' : 'prize_won_bingo';
        const template = await this.getTemplate(templateKey);

        const message = this.parseTemplate(template.template_body, {
            amount: prizeData.amount.toLocaleString(),
            cardSerial: prizeData.cardSerial,
            room: this.getRoomDisplayName(prizeData.room)
        });

        // Enviar sticker de celebración primero
        await this.sendSticker(settings.phone_number, 'https://24kilates.xyz/stickers/celebration.webp', userId);
        
        // Luego el mensaje
        await this.sendText(settings.phone_number, message, userId);
    }

    /**
     * Notificar recordatorio de juego
     */
    async notifyGameReminder(userId, gameData) {
        if (!await this.canNotify(userId, 'game_reminder')) return;

        const settings = await this.getUserSettings(userId);
        const template = await this.getTemplate('game_reminder');

        const message = this.parseTemplate(template.template_body, {
            room: this.getRoomDisplayName(gameData.room),
            cardCount: gameData.cardCount,
            jackpot: gameData.jackpot.toLocaleString()
        });

        await this.sendText(settings.phone_number, message, userId);
    }

    /**
     * Notificar depósito recibido
     */
    async notifyDepositReceived(userId, depositData) {
        if (!await this.canNotify(userId, 'deposit_received')) return;

        const settings = await this.getUserSettings(userId);
        const template = await this.getTemplate('deposit_received');

        const message = this.parseTemplate(template.template_body, {
            amount: depositData.amount.toLocaleString(),
            newBalance: depositData.newBalance.toLocaleString()
        });

        await this.sendText(settings.phone_number, message, userId);
    }

    /**
     * Notificar comisión ganada (agentes)
     */
    async notifyCommissionEarned(agentId, commissionData) {
        if (!await this.canNotify(agentId, 'commission')) return;

        const settings = await this.getUserSettings(agentId);
        const template = await this.getTemplate('commission_earned');

        const message = this.parseTemplate(template.template_body, {
            playerName: commissionData.playerName,
            purchaseAmount: commissionData.purchaseAmount.toLocaleString(),
            commission: commissionData.commission.toLocaleString(),
            newBalance: commissionData.newBalance.toLocaleString()
        });

        await this.sendText(settings.phone_number, message, agentId);
    }

    /**
     * Notificar nuevo jugador registrado (agentes)
     */
    async notifyNewPlayerRegistered(agentId, playerData) {
        if (!await this.canNotify(agentId, 'new_player')) return;

        const settings = await this.getUserSettings(agentId);
        const template = await this.getTemplate('new_player_registered');

        const message = this.parseTemplate(template.template_body, {
            playerName: playerData.playerName,
            totalPlayers: playerData.totalPlayers
        });

        await this.sendText(settings.phone_number, message, agentId);
    }

    /**
     * Enviar resumen diario
     */
    async sendDailySummary(userId, role) {
        if (!await this.canNotify(userId, 'daily_summary')) return;

        const settings = await this.getUserSettings(userId);
        const templateKey = role === 'agente' ? 'daily_summary_agent' : 'daily_summary_player';
        const template = await this.getTemplate(templateKey);

        // Obtener datos del día
        const summaryData = await this.getDailySummaryData(userId, role);
        const message = this.parseTemplate(template.template_body, summaryData);

        await this.sendText(settings.phone_number, message, userId);
    }

    /**
     * Notificar retiro aprobado
     */
    async notifyWithdrawalApproved(userId, withdrawalData) {
        const settings = await this.getUserSettings(userId);
        if (!settings?.phone_verified) return;

        const template = await this.getTemplate('withdrawal_approved');
        const message = this.parseTemplate(template.template_body, {
            amount: withdrawalData.amount.toLocaleString(),
            destination: withdrawalData.destination,
            withdrawalId: withdrawalData.id
        });

        await this.sendText(settings.phone_number, message, userId);
    }

    /**
     * Enviar alerta de seguridad
     */
    async sendSecurityAlert(userId, alertData) {
        if (!await this.canNotify(userId, 'security_events')) return;

        const settings = await this.getUserSettings(userId);
        const template = await this.getTemplate('security_alert');

        const message = this.parseTemplate(template.template_body, {
            alertMessage: alertData.message,
            ip: alertData.ip || 'Desconocida',
            time: new Date().toLocaleString('es-AR')
        });

        await this.sendText(settings.phone_number, message, userId);
    }

    // ==========================================
    // HELPERS
    // ==========================================

    getRoomDisplayName(room) {
        const names = {
            'free_starter': '🆓 Starter Gratis',
            'bronce': '🥉 Bronce',
            'plata': '🥈 Plata',
            'oro': '🥇 Oro'
        };
        return names[room] || room;
    }

    async getDailySummaryData(userId, role) {
        const today = new Date().toISOString().split('T')[0];
        
        if (role === 'jugador') {
            const [stats] = await pool.query(`
                SELECT 
                    COUNT(DISTINCT pcs.id) as cardsPlayed,
                    COALESCE(SUM(CASE WHEN pcs.prize_amount > 0 THEN pcs.prize_amount ELSE 0 END), 0) as prizesWon
                FROM player_card_sessions pcs
                JOIN game_sessions gs ON pcs.game_session_id = gs.id
                WHERE pcs.user_id = ? AND DATE(gs.started_at) = ?
            `, [userId, today]);

            const [balance] = await pool.query('SELECT balance FROM users WHERE id = ?', [userId]);

            return {
                cardsPlayed: stats[0]?.cardsPlayed || 0,
                prizesWon: stats[0]?.prizesWon || 0,
                balance: balance[0]?.balance || 0
            };
        } else {
            // Agente
            const [stats] = await pool.query(`
                SELECT 
                    COUNT(DISTINCT pcs.user_id) as activePlayers,
                    COUNT(pcs.id) as cardsSold,
                    COALESCE(SUM(cm.amount), 0) as commissions
                FROM users u
                LEFT JOIN player_card_sessions pcs ON pcs.user_id = u.id AND DATE(pcs.created_at) = ?
                LEFT JOIN chips_movements cm ON cm.user_id = ? AND cm.movement_type = 'commission' AND DATE(cm.created_at) = ?
                WHERE u.parent_id = ?
            `, [today, userId, today, userId]);

            const [balance] = await pool.query('SELECT balance FROM users WHERE id = ?', [userId]);

            return {
                activePlayers: stats[0]?.activePlayers || 0,
                cardsSold: stats[0]?.cardsSold || 0,
                commissions: stats[0]?.commissions || 0,
                balance: balance[0]?.balance || 0
            };
        }
    }

    /**
     * Procesar cola de mensajes pendientes
     */
    async processMessageQueue() {
        if (!this.isEnabled()) return;

        const [messages] = await pool.query(`
            SELECT * FROM whatsapp_message_queue 
            WHERE status = 'pending' AND scheduled_for <= NOW() AND retry_count < max_retries
            ORDER BY priority ASC, created_at ASC
            LIMIT 10
        `);

        for (const msg of messages) {
            try {
                await pool.query(
                    'UPDATE whatsapp_message_queue SET status = "processing" WHERE id = ?',
                    [msg.id]
                );

                const template = await this.getTemplate(msg.template_key);
                const variables = JSON.parse(msg.variables);
                const message = this.parseTemplate(template.template_body, variables);

                const result = await this.sendText(msg.phone_number, message, msg.user_id);

                if (result.success) {
                    await pool.query(
                        'UPDATE whatsapp_message_queue SET status = "completed", processed_at = NOW() WHERE id = ?',
                        [msg.id]
                    );
                } else {
                    throw new Error(result.error);
                }

            } catch (error) {
                await pool.query(
                    `UPDATE whatsapp_message_queue 
                     SET status = "pending", retry_count = retry_count + 1, error_message = ?
                     WHERE id = ?`,
                    [error.message, msg.id]
                );
            }
        }
    }
}

// Singleton
const whatsapp24KService = new WhatsApp24KService();

module.exports = whatsapp24KService;
