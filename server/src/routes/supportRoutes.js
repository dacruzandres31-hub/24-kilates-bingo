const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const { authenticateToken } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Player Routes
router.post('/ticket', authenticateToken, supportController.createTicket);
router.get('/my-tickets', authenticateToken, supportController.getUserTickets);
router.get('/ticket/:id', authenticateToken, supportController.getTicketDetails);
router.post('/ticket/:id/reply', authenticateToken, supportController.replyToTicket);

// Admin Routes
router.get('/admin/all', authenticateToken, roleMiddleware(['admin', 'superadmin']), supportController.getAllTicketsAdmin);
router.put('/admin/ticket/:id/status', authenticateToken, roleMiddleware(['admin', 'superadmin']), supportController.updateTicketStatus);

module.exports = router;
