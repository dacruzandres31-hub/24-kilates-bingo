const pool = require('../db');

/**
 * Audit Service - Records administrative actions for accountability
 */
class AuditService {
    /**
     * Log an admin action
     * @param {Object} data
     * @param {number} data.adminId - ID of the admin performing the action
     * @param {string} data.action - Action name (e.g., 'ADD_CHIPS', 'CHANGE_PASSWORD')
     * @param {number} [data.targetUserId] - ID of the user affected by the action
     * @param {Object} [data.details] - Additional JSON data about the action
     * @param {string} [data.ipAddress] - IP address of the admin
     */
    async log(data) {
        try {
            const { adminId, action, targetUserId, details, ipAddress } = data;

            const [result] = await pool.query(
                `INSERT INTO admin_audit_logs 
                 (admin_id, action, target_user_id, details, ip_address) 
                 VALUES (?, ?, ?, ?, ?)`,
                [adminId, action, targetUserId, details ? JSON.stringify(details) : null, ipAddress || null]
            );

            return result.insertId;
        } catch (error) {
            console.error('[AuditService] ❌ Error recording audit log:', error);
            // Non-blocking: we don't want to crash the main operation if logging fails
            return null;
        }
    }

    /**
     * Get logs with pagination and filters
     */
    async getLogs(filters = {}, limit = 50, offset = 0) {
        try {
            let query = `
                SELECT l.*, a.username as admin_name, t.username as target_name 
                FROM admin_audit_logs l
                JOIN users a ON l.admin_id = a.id
                LEFT JOIN users t ON l.target_user_id = t.id
                WHERE 1=1
            `;
            const params = [];

            if (filters.adminId) {
                query += ' AND l.admin_id = ?';
                params.push(filters.adminId);
            }

            if (filters.targetUserId) {
                query += ' AND l.target_user_id = ?';
                params.push(filters.targetUserId);
            }

            if (filters.action) {
                query += ' AND l.action = ?';
                params.push(filters.action);
            }

            query += ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const [rows] = await pool.query(query, params);

            const [countResult] = await pool.query('SELECT COUNT(*) as total FROM admin_audit_logs');

            return {
                logs: rows,
                total: countResult[0].total
            };
        } catch (error) {
            console.error('[AuditService] ❌ Error fetching audit logs:', error);
            throw error;
        }
    }
}

module.exports = new AuditService();
