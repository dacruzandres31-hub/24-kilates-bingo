

const express = require('express');
const router = express.Router();
const pool = require('../db');
const DepositService = require('../services/depositService');
const { authenticateToken, isAdmin, isCajeroOrAdmin } = require('../middleware/authMiddleware');

// ============================================
// RUTAS JUGADOR
// ============================================

// 1. Obtener CBU/Alias para depositar (Rotator)
router.get('/info', authenticateToken, async (req, res) => {
    try {
        const { purpose } = req.query;

        // Si es COMPRA DE MEMBRESÍA, siempre se paga a la cuenta del Sistema (Andy)
        if (purpose === 'membership') {
            const account = await DepositService.getActiveAccount(null);
            return res.json({ success: true, data: account });
        }

        // Para Carga de Saldo o Compra de Cartones, verificar el superior
        const [userRows] = await pool.query('SELECT parent_id FROM users WHERE id = ?', [req.user.id]);
        const parentId = userRows.length > 0 ? userRows[0].parent_id : null;

        if (!parentId) {
            return res.status(400).json({ success: false, message: 'Usuario sin superior asignado' });
        }

        // Verificar si el superior es SuperAdmin (Andy)
        const [parentRows] = await pool.query('SELECT role FROM users WHERE id = ?', [parentId]);
        const parentRole = parentRows.length > 0 ? parentRows[0].role : null;

        // Si el superior es SuperAdmin, usar cuentas del SISTEMA (owner_id = NULL)
        // para que todos los hijos directos de Andy usen sus cuentas de rotación
        const ownerId = parentRole === 'superadmin' ? null : parentId;

        const account = await DepositService.getActiveAccount(ownerId);
        res.json({ success: true, data: account });
    } catch (error) {
        res.status(503).json({ success: false, message: error.message });
    }
});

// 2. Avisar que ya transferí (Subir Comprobante)
router.post('/claim', authenticateToken, async (req, res) => {
    try {
        const { accountId, amount, proofUrl, requestType, details } = req.body;

        if (!amount || amount <= 0) return res.status(400).json({ error: 'Monto inválido' });
        if (!proofUrl) return res.status(400).json({ error: 'Falta comprobante' });

        const result = await DepositService.createDepositRequest(
            req.user.id,
            accountId,
            amount,
            proofUrl,
            details,
            requestType
        );

        // Notificar a admins (Socket.IO)
        const io = req.app.get('io');
        io.to('admins').emit('new_deposit_request', {
            depositId: result.depositId,
            amount,
            username: req.user.username,
            requestType: requestType || 'balance'
        });

        res.json({ success: true, data: result });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// RUTAS CAJERO / ADMIN
// ============================================

// 3. Listar pendientes
router.get('/pending', authenticateToken, isCajeroOrAdmin, async (req, res) => {
    try {
        const deposits = await DepositService.getPendingDeposits(req.user.id, req.user.role);
        res.json({ success: true, data: deposits });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 4. Aprobar Depósito
router.post('/:id/approve', authenticateToken, isCajeroOrAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await DepositService.approveDeposit(id, req.user.id, req.app.get('io'));

        res.json({ success: true, message: 'Depósito aprobado', data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 5. Rechazar Depósito
router.post('/:id/reject', authenticateToken, isCajeroOrAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        await DepositService.rejectDeposit(id, req.user.id, reason || 'Sin motivo');
        res.json({ success: true, message: 'Depósito rechazado' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
