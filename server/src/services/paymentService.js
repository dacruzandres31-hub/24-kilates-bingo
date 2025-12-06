/**
 * PAYMENT SERVICE - Sistema de Pagos
 * Soporta múltiples pasarelas: Stripe, MercadoPago, PayPal
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { MercadoPagoConfig, Payment } = require('mercadopago');
const pool = require('../db');

// Configurar MercadoPago
const mercadopago = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN
});

class PaymentService {
  /**
   * Crear intento de depósito
   * @param {number} userId - ID del usuario
   * @param {number} amount - Monto en moneda local
   * @param {string} currency - Código de moneda (USD, MXN, ARS, etc)
   * @param {string} provider - stripe | mercadopago | paypal
   * @param {object} metadata - Datos adicionales
   */
  static async createDeposit(userId, amount, currency, provider, metadata = {}) {
    try {
      const connection = await pool.getConnection();
      
      try {
        await connection.query('START TRANSACTION');

        // 1. Crear registro de transacción
        const [result] = await connection.query(
          `INSERT INTO transactions 
           (user_id, type, amount, currency, status, provider, metadata, created_at)
           VALUES (?, 'deposit', ?, ?, 'pending', ?, ?, NOW())`,
          [userId, amount, currency, provider, JSON.stringify(metadata)]
        );

        const transactionId = result.insertId;

        // 2. Crear intento de pago según proveedor
        let paymentIntent;
        let paymentUrl;

        if (provider === 'stripe') {
          paymentIntent = await this.createStripePayment(userId, amount, currency, transactionId);
          paymentUrl = paymentIntent.url;
        } else if (provider === 'mercadopago') {
          paymentIntent = await this.createMercadoPagoPayment(userId, amount, currency, transactionId);
          paymentUrl = paymentIntent.init_point;
        } else if (provider === 'paypal') {
          // TODO: Implementar PayPal
          throw new Error('PayPal no implementado aún');
        }

        // 3. Guardar intent ID
        await connection.query(
          `UPDATE transactions 
           SET provider_transaction_id = ?, payment_url = ?
           WHERE id = ?`,
          [paymentIntent.id, paymentUrl, transactionId]
        );

        await connection.query('COMMIT');

        return {
          transactionId,
          paymentUrl,
          status: 'pending',
          provider,
          amount,
          currency
        };

      } finally {
        connection.release();
      }

    } catch (error) {
      console.error('❌ Error creating deposit:', error);
      throw error;
    }
  }

  /**
   * Crear pago en Stripe
   */
  static async createStripePayment(userId, amount, currency, transactionId) {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: 'Recarga de Fichas - Bingo 24K',
              description: `Depósito de ${amount} ${currency.toUpperCase()}`
            },
            unit_amount: Math.round(amount * 100) // Stripe usa centavos
          },
          quantity: 1
        }],
        mode: 'payment',
        success_url: `${process.env.CORS_ORIGIN_PLAYER}/payment/success?transaction=${transactionId}`,
        cancel_url: `${process.env.CORS_ORIGIN_PLAYER}/payment/cancel`,
        metadata: {
          userId: userId.toString(),
          transactionId: transactionId.toString()
        }
      });

      return session;
    } catch (error) {
      console.error('❌ Stripe payment error:', error);
      throw error;
    }
  }

  /**
   * Crear pago en MercadoPago
   */
  static async createMercadoPagoPayment(userId, amount, currency, transactionId) {
    try {
      const payment = new Payment(mercadopago);

      const preference = await payment.create({
        body: {
          items: [{
            title: 'Recarga de Fichas - Bingo 24K',
            quantity: 1,
            unit_price: parseFloat(amount),
            currency_id: currency.toUpperCase()
          }],
          back_urls: {
            success: `${process.env.CORS_ORIGIN_PLAYER}/payment/success?transaction=${transactionId}`,
            failure: `${process.env.CORS_ORIGIN_PLAYER}/payment/failure`,
            pending: `${process.env.CORS_ORIGIN_PLAYER}/payment/pending`
          },
          auto_return: 'approved',
          metadata: {
            user_id: userId.toString(),
            transaction_id: transactionId.toString()
          }
        }
      });

      return preference;
    } catch (error) {
      console.error('❌ MercadoPago payment error:', error);
      throw error;
    }
  }

  /**
   * Procesar webhook de Stripe
   */
  static async handleStripeWebhook(event) {
    try {
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const transactionId = parseInt(session.metadata.transactionId);
        const userId = parseInt(session.metadata.userId);

        await this.completeDeposit(transactionId, userId, session.amount_total / 100);
      }
    } catch (error) {
      console.error('❌ Stripe webhook error:', error);
      throw error;
    }
  }

  /**
   * Procesar webhook de MercadoPago
   */
  static async handleMercadoPagoWebhook(data) {
    try {
      if (data.type === 'payment') {
        const payment = new Payment(mercadopago);
        const paymentInfo = await payment.get({ id: data.data.id });

        if (paymentInfo.status === 'approved') {
          const transactionId = parseInt(paymentInfo.metadata.transaction_id);
          const userId = parseInt(paymentInfo.metadata.user_id);

          await this.completeDeposit(transactionId, userId, paymentInfo.transaction_amount);
        }
      }
    } catch (error) {
      console.error('❌ MercadoPago webhook error:', error);
      throw error;
    }
  }

  /**
   * Completar depósito y acreditar fichas
   */
  static async completeDeposit(transactionId, userId, amount) {
    try {
      const connection = await pool.getConnection();

      try {
        await connection.query('START TRANSACTION');

        // 1. Actualizar transacción
        await connection.query(
          `UPDATE transactions 
           SET status = 'completed', completed_at = NOW()
           WHERE id = ? AND status = 'pending'`,
          [transactionId]
        );

        // 2. Acreditar fichas al usuario
        await connection.query(
          `UPDATE users 
           SET balance = balance + ?, updated_at = NOW()
           WHERE id = ?`,
          [amount, userId]
        );

        // 3. Registrar en auditoría
        await connection.query(
          `INSERT INTO audit_revenue (user_id, amount, transaction_type, details)
           VALUES (?, ?, 'deposit_completed', ?)`,
          [userId, amount, JSON.stringify({ transactionId })]
        );

        await connection.query('COMMIT');

        console.log(`✅ Depósito completado: User ${userId}, Amount ${amount}`);
        return true;

      } finally {
        connection.release();
      }

    } catch (error) {
      console.error('❌ Error completing deposit:', error);
      throw error;
    }
  }

  /**
   * Crear solicitud de retiro
   */
  static async createWithdrawal(userId, amount, method, accountDetails) {
    try {
      const connection = await pool.getConnection();

      try {
        await connection.query('START TRANSACTION');

        // 1. Verificar balance suficiente
        const [user] = await connection.query(
          'SELECT balance FROM users WHERE id = ?',
          [userId]
        );

        if (!user || user[0].balance < amount) {
          throw new Error('Balance insuficiente');
        }

        // 2. Verificar límites
        const minWithdrawal = parseFloat(process.env.MIN_WITHDRAWAL_AMOUNT || 50);
        const maxWithdrawal = parseFloat(process.env.MAX_WITHDRAWAL_AMOUNT || 10000);

        if (amount < minWithdrawal) {
          throw new Error(`Monto mínimo de retiro: ${minWithdrawal}`);
        }

        if (amount > maxWithdrawal) {
          throw new Error(`Monto máximo de retiro: ${maxWithdrawal}`);
        }

        // 3. Congelar fondos
        await connection.query(
          `UPDATE users 
           SET balance = balance - ?, frozen_balance = frozen_balance + ?
           WHERE id = ?`,
          [amount, amount, userId]
        );

        // 4. Crear transacción de retiro
        const [result] = await connection.query(
          `INSERT INTO transactions 
           (user_id, type, amount, status, withdrawal_method, withdrawal_details, created_at)
           VALUES (?, 'withdrawal', ?, 'pending', ?, ?, NOW())`,
          [userId, amount, method, JSON.stringify(accountDetails)]
        );

        await connection.query('COMMIT');

        return {
          transactionId: result.insertId,
          amount,
          status: 'pending',
          message: 'Solicitud de retiro creada. Será procesada en 24-48 horas.'
        };

      } finally {
        connection.release();
      }

    } catch (error) {
      console.error('❌ Error creating withdrawal:', error);
      throw error;
    }
  }

  /**
   * Aprobar retiro (admin)
   */
  static async approveWithdrawal(transactionId, adminId) {
    try {
      const connection = await pool.getConnection();

      try {
        await connection.query('START TRANSACTION');

        // 1. Obtener transacción
        const [transaction] = await connection.query(
          'SELECT user_id, amount FROM transactions WHERE id = ? AND status = ?',
          [transactionId, 'pending']
        );

        if (!transaction || transaction.length === 0) {
          throw new Error('Transacción no encontrada o ya procesada');
        }

        const { user_id, amount } = transaction[0];

        // 2. Liberar fondos congelados
        await connection.query(
          `UPDATE users 
           SET frozen_balance = frozen_balance - ?
           WHERE id = ?`,
          [amount, user_id]
        );

        // 3. Marcar transacción como completada
        await connection.query(
          `UPDATE transactions 
           SET status = 'completed', completed_at = NOW(), approved_by = ?
           WHERE id = ?`,
          [adminId, transactionId]
        );

        await connection.query('COMMIT');

        return { success: true, message: 'Retiro aprobado' };

      } finally {
        connection.release();
      }

    } catch (error) {
      console.error('❌ Error approving withdrawal:', error);
      throw error;
    }
  }

  /**
   * Obtener historial de transacciones
   */
  static async getTransactionHistory(userId, filters = {}) {
    try {
      const { type, status, limit = 50, offset = 0 } = filters;

      let query = `
        SELECT id, type, amount, currency, status, provider,
               withdrawal_method, created_at, completed_at
        FROM transactions
        WHERE user_id = ?
      `;
      const params = [userId];

      if (type) {
        query += ' AND type = ?';
        params.push(type);
      }

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      const [transactions] = await pool.query(query, params);
      return transactions;

    } catch (error) {
      console.error('❌ Error getting transaction history:', error);
      throw error;
    }
  }
}

module.exports = PaymentService;
