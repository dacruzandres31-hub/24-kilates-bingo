const pool = require('../db');

/**
 * GET /api/cards/available/:room
 * Obtener cartones disponibles del pool para seleccionar
 */
exports.getAvailableCards = async (req, res) => {
  try {
    const { room } = req.params;
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 100; // Mostrar 100 cartones por defecto

    console.log(`[Cards] 🎴 Obteniendo cartones disponibles para sala: ${room}, usuario: ${userId}`);

    // Verificar que el usuario tenga tickets disponibles en su inventario
    const [inventory] = await pool.query(
      `SELECT quantity FROM user_card_inventory 
       WHERE user_id = ? AND room = ? AND quantity > 0`,
      [userId, room]
    );

    if (!inventory || inventory.length === 0 || inventory[0].quantity === 0) {
      return res.status(400).json({ 
        error: 'No tienes tickets disponibles para esta sala',
        availableTickets: 0
      });
    }

    const availableTickets = inventory[0].quantity;

    // Obtener cartones disponibles del pool
    const [cards] = await pool.query(
      `SELECT id, card_serial, numbers, created_at
       FROM bingo_cards_pool
       WHERE room = ? AND status = 'available'
       ORDER BY RAND()
       LIMIT ?`,
      [room, limit]
    );

    // Parsear JSON de números
    const formattedCards = cards.map(card => ({
      id: card.id,
      serial: card.card_serial,
      numbers: JSON.parse(card.numbers),
      createdAt: card.created_at
    }));

    console.log(`[Cards] ✅ ${formattedCards.length} cartones disponibles`);

    res.json({
      cards: formattedCards,
      availableTickets,
      maxSelection: Math.min(20, availableTickets) // Máximo 20 o los tickets que tenga
    });

  } catch (error) {
    console.error('[Cards] ❌ Error obteniendo cartones:', error);
    res.status(500).json({ error: 'Error obteniendo cartones disponibles' });
  }
};

/**
 * POST /api/cards/select
 * Seleccionar cartones del pool para jugar
 */
exports.selectCards = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { cardIds, room } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(cardIds) || cardIds.length === 0) {
      return res.status(400).json({ error: 'Debes seleccionar al menos un cartón' });
    }

    if (cardIds.length > 20) {
      return res.status(400).json({ error: 'No puedes seleccionar más de 20 cartones' });
    }

    console.log(`[Cards] 🎯 Usuario ${userId} seleccionando ${cardIds.length} cartones`);

    // Verificar tickets disponibles
    const [inventory] = await connection.query(
      `SELECT quantity FROM user_card_inventory 
       WHERE user_id = ? AND room = ? FOR UPDATE`,
      [userId, room]
    );

    if (!inventory || inventory.length === 0 || inventory[0].quantity < cardIds.length) {
      await connection.rollback();
      return res.status(400).json({ 
        error: 'No tienes suficientes tickets disponibles',
        required: cardIds.length,
        available: inventory[0]?.quantity || 0
      });
    }

    // Verificar que los cartones estén disponibles
    const [cardsCheck] = await connection.query(
      `SELECT id, card_serial FROM bingo_cards_pool
       WHERE id IN (?) AND room = ? AND status = 'available' FOR UPDATE`,
      [cardIds, room]
    );

    if (cardsCheck.length !== cardIds.length) {
      await connection.rollback();
      return res.status(409).json({ 
        error: 'Algunos cartones ya fueron seleccionados por otros jugadores',
        available: cardsCheck.length,
        requested: cardIds.length
      });
    }

    // Marcar cartones como seleccionados
    await connection.query(
      `UPDATE bingo_cards_pool
       SET status = 'selected', selected_by = ?, selected_at = NOW()
       WHERE id IN (?) AND status = 'available'`,
      [userId, cardIds]
    );

    // Descontar tickets del inventario
    await connection.query(
      `UPDATE user_card_inventory
       SET quantity = quantity - ?
       WHERE user_id = ? AND room = ?`,
      [cardIds.length, userId, room]
    );

    // Obtener cartones seleccionados con detalles
    const [selectedCards] = await connection.query(
      `SELECT id, card_serial, numbers, selected_at
       FROM bingo_cards_pool
       WHERE id IN (?)`,
      [cardIds]
    );

    await connection.commit();

    const formattedCards = selectedCards.map(card => ({
      id: card.id,
      serial: card.card_serial,
      numbers: JSON.parse(card.numbers),
      selectedAt: card.selected_at
    }));

    console.log(`[Cards] ✅ ${formattedCards.length} cartones seleccionados correctamente`);

    // Notificar via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('cards_selected', {
        room,
        cards: formattedCards,
        remainingTickets: inventory[0].quantity - cardIds.length
      });
    }

    res.json({
      success: true,
      cards: formattedCards,
      remainingTickets: inventory[0].quantity - cardIds.length,
      message: `${formattedCards.length} cartón${formattedCards.length > 1 ? 'es' : ''} seleccionado${formattedCards.length > 1 ? 's' : ''} exitosamente`
    });

  } catch (error) {
    await connection.rollback();
    console.error('[Cards] ❌ Error seleccionando cartones:', error);
    res.status(500).json({ error: 'Error al seleccionar cartones' });
  } finally {
    connection.release();
  }
};

/**
 * GET /api/cards/my-selected/:room
 * Obtener mis cartones seleccionados para una sala
 */
exports.getMySelectedCards = async (req, res) => {
  try {
    const { room } = req.params;
    const userId = req.user.id;

    const [cards] = await pool.query(
      `SELECT id, card_serial, numbers, selected_at, game_session_id
       FROM bingo_cards_pool
       WHERE selected_by = ? AND room = ? AND status IN ('selected', 'used')
       ORDER BY selected_at DESC`,
      [userId, room]
    );

    const formattedCards = cards.map(card => ({
      id: card.id,
      serial: card.card_serial,
      numbers: JSON.parse(card.numbers),
      selectedAt: card.selected_at,
      sessionId: card.game_session_id,
      status: card.game_session_id ? 'used' : 'selected'
    }));

    res.json({ cards: formattedCards });

  } catch (error) {
    console.error('[Cards] ❌ Error obteniendo cartones seleccionados:', error);
    res.status(500).json({ error: 'Error obteniendo tus cartones' });
  }
};

/**
 * POST /api/cards/release
 * Liberar cartones seleccionados que no se usaron
 */
exports.releaseCards = async (req, res) => {
  try {
    const { cardIds } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(cardIds) || cardIds.length === 0) {
      return res.status(400).json({ error: 'IDs de cartones inválidos' });
    }

    const [result] = await pool.query(
      `UPDATE bingo_cards_pool
       SET status = 'available', selected_by = NULL, selected_at = NULL
       WHERE id IN (?) AND selected_by = ? AND status = 'selected'`,
      [cardIds, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'No se encontraron cartones para liberar' });
    }

    // Devolver tickets al inventario
    const room = req.body.room;
    if (room) {
      await pool.query(
        `UPDATE user_card_inventory
         SET quantity = quantity + ?
         WHERE user_id = ? AND room = ?`,
        [result.affectedRows, userId, room]
      );
    }

    console.log(`[Cards] 🔓 ${result.affectedRows} cartones liberados`);

    res.json({
      success: true,
      releasedCount: result.affectedRows,
      message: `${result.affectedRows} cartón${result.affectedRows > 1 ? 'es' : ''} liberado${result.affectedRows > 1 ? 's' : ''}`
    });

  } catch (error) {
    console.error('[Cards] ❌ Error liberando cartones:', error);
    res.status(500).json({ error: 'Error al liberar cartones' });
  }
};

module.exports = exports;
