const pool = require('../db');

// --- PLAYER METHODS ---

exports.createTicket = async (req, res) => {
    const { subject, category, message, priority = 'medium' } = req.body;
    const userId = req.user.id; // From authMiddleware

    if (!subject || !message) {
        return res.status(400).json({ error: 'Asunto y mensaje requeridos' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Create Ticket
        const [ticketResult] = await connection.query(
            `INSERT INTO support_tickets (user_id, subject, category, priority, status) VALUES (?, ?, ?, ?, 'open')`,
            [userId, subject, category || 'other', priority]
        );
        const ticketId = ticketResult.insertId;

        // Create First Message
        await connection.query(
            `INSERT INTO support_messages (ticket_id, user_id, is_admin, message) VALUES (?, ?, 0, ?)`,
            [ticketId, userId, message]
        );

        await connection.commit();
        res.json({ success: true, ticketId, message: 'Ticket creado exitosamente' });

    } catch (error) {
        await connection.rollback();
        console.error('Error creating ticket:', error);
        res.status(500).json({ error: 'Error al crear ticket' });
    } finally {
        connection.release();
    }
};

exports.getUserTickets = async (req, res) => {
    const userId = req.user.id;
    try {
        const [tickets] = await pool.query(
            `SELECT * FROM support_tickets WHERE user_id = ? ORDER BY updated_at DESC`,
            [userId]
        );
        res.json({ success: true, tickets });
    } catch (error) {
        console.error('Error fetching user tickets:', error);
        res.status(500).json({ error: 'Error al obtener tickets' });
    }
};

exports.getTicketDetails = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        // Verify ownership or admin
        // Note: Admin logic usually separate or handled by middleware/check
        // Here assuming 'user' role check, create separate Admin controller method if strict separation needed or check role

        let isOwner = false;
        if (req.user.role === 'admin' || req.user.role === 'superadmin') {
            isOwner = true; // Admin can view ANY ticket
        } else {
            const [ticketCheck] = await pool.query('SELECT user_id FROM support_tickets WHERE id = ?', [id]);
            if (ticketCheck.length > 0 && ticketCheck[0].user_id === userId) {
                isOwner = true;
            }
        }

        if (!isOwner) {
            return res.status(403).json({ error: 'No autorizado' });
        }

        const [ticket] = await pool.query('SELECT * FROM support_tickets WHERE id = ?', [id]);
        if (ticket.length === 0) return res.status(404).json({ error: 'Ticket no encontrado' });

        const [messages] = await pool.query(
            `SELECT m.*, u.username as sender_name 
       FROM support_messages m 
       LEFT JOIN users u ON m.user_id = u.id 
       WHERE m.ticket_id = ? 
       ORDER BY m.created_at ASC`,
            [id]
        );

        res.json({ success: true, ticket: ticket[0], messages });

    } catch (error) {
        console.error('Error fetching ticket details:', error);
        res.status(500).json({ error: 'Error al obtener detalles' });
    }
};

exports.replyToTicket = async (req, res) => {
    const { id } = req.params;
    const { message } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role === 'admin' || req.user.role === 'superadmin' ? 'admin' : 'user';

    if (!message) return res.status(400).json({ error: 'Mensaje requerido' });

    try {
        // Basic auth check inline
        if (userRole === 'user') {
            const [t] = await pool.query('SELECT user_id FROM support_tickets WHERE id = ?', [id]);
            if (!t.length || t[0].user_id !== userId) return res.status(403).json({ error: 'No autorizado' });
        }

        await pool.query(
            `INSERT INTO support_messages (ticket_id, user_id, is_admin, message) VALUES (?, ?, ?, ?)`,
            [id, userId, userRole === 'admin' ? 1 : 0, message]
        );

        // Update ticket 'updated_at' and status if needed (e.g. reopen if user replies)
        if (userRole === 'user') {
            const [currStatus] = await pool.query('SELECT status FROM support_tickets WHERE id = ?', [id]);
            if (currStatus[0].status === 'resolved' || currStatus[0].status === 'closed') {
                await pool.query('UPDATE support_tickets SET status = "in_progress", updated_at = NOW() WHERE id = ?', [id]);
            } else {
                await pool.query('UPDATE support_tickets SET updated_at = NOW() WHERE id = ?', [id]);
            }
        } else {
            // Admin reply
            await pool.query('UPDATE support_tickets SET updated_at = NOW() WHERE id = ?', [id]);
            // Ideally send notification to user
        }

        res.json({ success: true, message: 'Respuesta enviada' });

    } catch (error) {
        console.error('Error replying to ticket:', error);
        res.status(500).json({ error: 'Error al enviar respuesta' });
    }
};

// --- ADMIN METHODS ---

exports.getAllTicketsAdmin = async (req, res) => {
    try {
        const [tickets] = await pool.query(`
      SELECT t.*, u.username 
      FROM support_tickets t 
      JOIN users u ON t.user_id = u.id 
      ORDER BY 
        CASE WHEN t.status = 'open' THEN 1 
             WHEN t.status = 'in_progress' THEN 2 
             ELSE 3 
        END, 
        t.updated_at DESC
    `);
        res.json({ success: true, tickets });
    } catch (error) {
        console.error('Error fetching all tickets:', error);
        res.status(500).json({ error: 'Error al obtener tickets' });
    }
};

exports.updateTicketStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        await pool.query('UPDATE support_tickets SET status = ? WHERE id = ?', [status, id]);
        res.json({ success: true, message: 'Estado actualizado' });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ error: 'Error al actualizar estado' });
    }
};
