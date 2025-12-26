const pool = require('../db');
const axios = require('axios');

/**
 * WHATSAPP CONTROLLER (DECENTRALIZED MODE)
 * Permite a cada agente configurar su propio gateway para enviar comprobantes.
 */

// Obtener configuración de WhatsApp del agente actual
exports.getConfig = async (req, res) => {
    try {
        const userId = req.user.id;
        const [config] = await pool.query(
            'SELECT * FROM whatsapp_configs WHERE user_id = ?',
            [userId]
        );

        res.json({
            success: true,
            config: config[0] || null
        });
    } catch (error) {
        console.error('Error obteniendo wa_config:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Guardar/Actualizar configuración
exports.saveConfig = async (req, res) => {
    try {
        const userId = req.user.id;
        const { gateway_type, api_url, api_key, instance_name, is_active, from_number } = req.body;

        const [existing] = await pool.query(
            'SELECT id FROM whatsapp_configs WHERE user_id = ?',
            [userId]
        );

        if (existing.length > 0) {
            await pool.query(
                `UPDATE whatsapp_configs 
                 SET gateway_type = ?, api_url = ?, api_key = ?, instance_name = ?, is_active = ?, from_number = ?, updated_at = NOW()
                 WHERE user_id = ?`,
                [gateway_type, api_url, api_key, instance_name, is_active, from_number, userId]
            );
        } else {
            await pool.query(
                `INSERT INTO whatsapp_configs 
                 (user_id, gateway_type, api_url, api_key, instance_name, is_active, from_number)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [userId, gateway_type, api_url, api_key, instance_name, is_active, from_number]
            );
        }

        res.json({ success: true, message: 'Configuración guardada correctamente' });
    } catch (error) {
        console.error('Error guardando wa_config:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Enviar Comprobante vía WhatsApp (Busca el gateway del agente que realiza la operación)
exports.sendReceipt = async (req, res) => {
    try {
        const senderId = req.user.id;
        const { recipientId, transactionId, message, imageUrl } = req.body;

        // 1. Buscar configuración del emisor (agente)
        const [config] = await pool.query(
            'SELECT * FROM whatsapp_configs WHERE user_id = ? AND is_active = TRUE',
            [senderId]
        );

        const waConfig = config[0];
        if (!waConfig) {
            return res.status(400).json({
                success: false,
                message: 'No tienes un Gateway de WhatsApp activo configurado.'
            });
        }

        // 2. Buscar teléfono del destinatario
        const [user] = await pool.query(
            'SELECT phone_number FROM users WHERE id = ?',
            [recipientId]
        );

        const phoneNumber = user[0]?.phone_number;
        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                message: 'El destinatario no tiene un número de teléfono registrado.'
            });
        }

        // 3. Ejecutar envío según el tipo de Gateway
        // Ejemplo simplificado para Evolution API
        if (waConfig.gateway_type === 'evolution_api') {
            const cleanPhone = phoneNumber.replace(/\D/g, ''); // Solo números

            // Enviar mensaje con imagen
            await axios.post(`${waConfig.api_url}/message/sendMedia/${waConfig.instance_name}`, {
                number: cleanPhone,
                mediaMessage: {
                    mediatype: 'image',
                    caption: message,
                    media: imageUrl // Evolution API acepta URL o base64
                }
            }, {
                headers: { 'apikey': waConfig.api_key }
            });
        }

        // 4. Registrar en log
        await pool.query(
            `INSERT INTO whatsapp_sent_receipts (transaction_id, sender_id, recipient_id, phone_sent, status)
             VALUES (?, ?, ?, ?, 'sent')`,
            [transactionId, senderId, recipientId, phoneNumber]
        );

        res.json({ success: true, message: 'Comprobante enviado vía WhatsApp' });

    } catch (error) {
        console.error('Error enviando wa_receipt:', error);
        res.status(500).json({
            success: false,
            message: 'Error en la conexión con el Gateway de WhatsApp: ' + error.message
        });
    }
};

// Obtener Historial de Comprobantes Enviados
exports.getReceiptsHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { startDate, endDate, search } = req.query;

        let query = `
            SELECT 
                wsr.id,
                wsr.transaction_id,
                wsr.phone_sent,
                wsr.status,
                wsr.sent_at,
                u.username as recipient_name
            FROM whatsapp_sent_receipts wsr
            JOIN users u ON wsr.recipient_id = u.id
            WHERE wsr.sender_id = ?
        `;

        const params = [userId];

        if (startDate) {
            query += ` AND DATE(wsr.sent_at) >= ?`;
            params.push(startDate);
        }

        if (endDate) {
            query += ` AND DATE(wsr.sent_at) <= ?`;
            params.push(endDate);
        }

        if (search) {
            query += ` AND u.username LIKE ?`;
            params.push(`%${search}%`);
        }

        query += ` ORDER BY wsr.sent_at DESC LIMIT 100`;

        const [history] = await pool.query(query, params);

        res.json({
            success: true,
            history
        });

    } catch (error) {
        console.error('Error obteniendo historial WA:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
