const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const validateWithdrawal = require('../middleware/validateWithdrawal');

const router = express.Router();

/**
 * FINANCE ROUTES
 * GET    /finance/balance               - Mi balance
 * POST   /finance/withdrawal            - Solicitar retiro
 * GET    /finance/withdrawals           - Mi historial de retiros
 * POST   /finance/deposit               - Registrar depósito (admin)
 * GET    /finance/transactions          - Historial de transacciones
 * GET    /finance/audit                 - Auditoría de dinero (admin)
 */

// Todos requieren autenticación
router.use(authMiddleware.authenticateToken);

// Obtener balance actual
router.get('/balance', async (req, res) => {
  try {
    const { userId } = req.user;
    const pool = require('../db');

    const result = await pool.query(
      'SELECT balance FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ balance: result.rows[0].balance });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo balance' });
  }
});

// Solicitar retiro (con validación de 20-min rule)
router.post('/withdrawal', validateWithdrawal, async (req, res) => {
  try {
    const { userId } = req.user;
    const { amount, cbu_alias, whatsapp } = req.body;
    const pool = require('../db');

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Monto inválido' });
    }

    if (!cbu_alias || !whatsapp) {
      return res.status(400).json({ error: 'CBU/Alias y WhatsApp requeridos' });
    }

    // Obtener balance
    const userResult = await pool.query(
      'SELECT balance FROM users WHERE id = $1',
      [userId]
    );

    const user = userResult.rows[0];

    if (user.balance < amount) {
      return res.status(400).json({ error: 'Balance insuficiente' });
    }

    // Crear claim de premio
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Descontar del balance
      await client.query(
        'UPDATE users SET balance = balance - $1 WHERE id = $2',
        [amount, userId]
      );

      // Registrar claim
      const result = await client.query(
        `INSERT INTO prize_claims (user_id, amount, cbu_alias, whatsapp, status)
         VALUES ($1, $2, $3, $4, 'pending')
         RETURNING id`,
        [userId, amount, cbu_alias, whatsapp]
      );

      // Auditoría
      await client.query(
        `INSERT INTO audit_revenue (player_id, amount, transaction_type)
         VALUES ($1, $2, 'withdrawal_requested')`,
        [userId, amount]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        claimId: result.rows[0].id,
        amount,
        status: 'pending'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ error: 'Error procesando retiro' });
  }
});

// Obtener mis retiros
router.get('/withdrawals', async (req, res) => {
  try {
    const { userId } = req.user;
    const pool = require('../db');

    const result = await pool.query(
      `SELECT id, amount, status, cbu_alias, created_at 
       FROM prize_claims 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({ withdrawals: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo retiros' });
  }
});

// Registrar depósito (solo admin)
router.post('/deposit', async (req, res) => {
  try {
    const { userId: adminId, role } = req.user;

    if (role !== 'superadmin') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const { userId, amount } = req.body;
    const pool = require('../db');

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Monto inválido' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Acreditar balance
      await client.query(
        'UPDATE users SET balance = balance + $1, last_deposit_at = NOW() WHERE id = $2',
        [amount, userId]
      );

      // Auditoría
      await client.query(
        `INSERT INTO audit_revenue (player_id, amount, transaction_type)
         VALUES ($1, $2, 'deposit_admin')`,
        [userId, amount]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        amount,
        userId
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({ error: 'Error registrando depósito' });
  }
});

// Obtener transacciones del usuario
router.get('/transactions', async (req, res) => {
  try {
    const { userId } = req.user;
    const pool = require('../db');

    const result = await pool.query(
      `SELECT amount, transaction_type, created_at 
       FROM audit_revenue 
       WHERE player_id = $1 
       ORDER BY created_at DESC 
       LIMIT 100`,
      [userId]
    );

    res.json({ transactions: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo transacciones' });
  }
});

// Auditoría completa (solo admin)
router.get('/audit', async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== 'superadmin') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const pool = require('../db');

    const result = await pool.query(
      `SELECT player_id, amount, transaction_type, agent_path, created_at 
       FROM audit_revenue 
       ORDER BY created_at DESC 
       LIMIT 500`
    );

    res.json({ audit: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo auditoría' });
  }
});

module.exports = router;
