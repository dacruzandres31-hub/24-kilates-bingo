/**
 * shopRoutes.js
 * 
 * Rutas para Tienda y Compra de Cartones
 * - Soporte para Tickets (Consumibles)
 * - Fallback a dinero
 * 
 * Versión: 1.3.0
 */

const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * POST /api/shop/buy-card
 * 
 * Comprar cartón (intenta Ticket primero, luego Dinero)
 * 
 * Body:
 * {
 *   "roomType": "bronce" | "plata" | "oro",
 *   "quantity": 1 (default)
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "...",
 *   "paymentMethod": "ticket" | "cash",
 *   "ticketsRemaining": 2 (si usó ticket),
 *   "newBalance": 45.00 (si usó dinero),
 *   "cardsAssigned": 1
 * }
 */
router.post('/buy-card', authMiddleware.authenticateToken, async (req, res) => {
  req.body.userId = req.user.id;
  await shopController.buyCard(req, res);
});

/**
 * GET /api/shop/my-tickets
 * 
 * Obtener todos los tickets del usuario
 * 
 * Response:
 * {
 *   "success": true,
 *   "tickets": [
 *     {
 *       "id": 1,
 *       "name": "Ticket Sala Bronce",
 *       "ticket_room": "bronce",
 *       "rarity": "common",
 *       "quantity": 3
 *     }
 *   ],
 *   "total": 3
 * }
 */
router.get('/my-tickets', authMiddleware.authenticateToken, async (req, res) => {
  req.params.userId = req.user.id;
  await shopController.getUserTickets(req, res);
});

/**
 * POST /api/shop/consume-ticket
 * 
 * Consumir un ticket manualmente
 * 
 * Body:
 * {
 *   "ticketType": "bronce" | "plata" | "oro"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Ticket bronce consumido. Te quedan: 2",
 *   "remaining": 2
 * }
 */
router.post('/consume-ticket', authMiddleware.authenticateToken, async (req, res) => {
  req.body.userId = req.user.id;
  await shopController.consumeTicket(req, res);
});

module.exports = router;
