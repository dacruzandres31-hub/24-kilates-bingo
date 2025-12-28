const pool = require('../db');
const websocketService = require('../services/websocketService');
const cardPoolService = require('../services/cardPoolService');

/**
 * Mapeo de nombres de salas (inglés → español para BD)
 */
const ROOM_MAP = {
  'bronze': 'bronce',
  'silver': 'plata',
  'gold': 'oro',
  'starter': 'starter'
};

/**
 * Safely parse card numbers from database
 * MySQL2 driver auto-parses JSON columns, but we handle both cases
 */
const safeParseNumbers = (numbers) => {
  if (typeof numbers === 'string') {
    try {
      return JSON.parse(numbers);
    } catch (e) {
      console.error('[Cards] Error parsing numbers:', e);
      return [];
    }
  }
  return numbers || [];
};


/**
 * GET /api/cards/available/:room
 * Obtener cartones disponibles del pool para seleccionar
 */
exports.getAvailableCards = async (req, res) => {
  try {
    const { room } = req.params;
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 5; // Mostrar 5 cartones por defecto
    const offset = parseInt(req.query.offset) || 0; // Para paginación

    // Mapear nombre de sala a español para BD
    const roomDB = ROOM_MAP[room] || room;

    console.log(`[Cards] 🎴 Obteniendo cartones disponibles para sala: ${room} (BD: ${roomDB}), usuario: ${userId}, limit: ${limit}, offset: ${offset}`);

    let availableTickets = 20; // Por defecto para starter
    let maxSelection = 20;

    // Solo validar tickets para salas que NO sean starter
    if (roomDB !== 'starter') {
      // Verificar que el usuario tenga tickets disponibles en user_card_inventory
      const [inventory] = await pool.query(
        `SELECT COALESCE(SUM(quantity), 0) as quantity
         FROM user_card_inventory 
         WHERE user_id = ? AND room = ?`,
        [userId, roomDB]
      );

      console.log(`[Cards] 🔍 Resultado búsqueda tickets - room: ${room} (BD: ${roomDB}), userId: ${userId}`, inventory);

      if (!inventory || inventory.length === 0 || inventory[0].quantity === 0) {
        console.log(`[Cards] ❌ No se encontraron tickets para sala ${room}`);
        return res.status(400).json({
          error: 'No tienes tickets disponibles para esta sala',
          availableTickets: 0
        });
      }

      availableTickets = parseInt(inventory[0].quantity);
      maxSelection = Math.min(20, availableTickets);
      console.log(`[Cards] ✅ Tickets disponibles: ${availableTickets}`);
    } else {
      console.log(`[Cards] 🎁 Sala Starter - Acceso libre sin validación de tickets`);
    }

    // Obtener total de cartones disponibles
    const [totalResult] = await pool.query(
      `SELECT COUNT(*) as total
       FROM bingo_cards_pool
       WHERE room = ? AND status = 'available'`,
      [roomDB]
    );
    const totalAvailable = totalResult[0].total;

    // Obtener cartones disponibles del pool con offset aleatorio
    const randomOffset = Math.floor(Math.random() * Math.max(0, totalAvailable - limit));
    const [cards] = await pool.query(
      `SELECT id, card_serial, numbers, created_at
       FROM bingo_cards_pool
       WHERE room = ? AND status = 'available'
       ORDER BY id
       LIMIT ? OFFSET ?`,
      [roomDB, limit, randomOffset]
    );

    // Parsear JSON de números
    const formattedCards = cards.map(card => ({
      id: card.id,
      serial: card.card_serial,
      numbers: safeParseNumbers(card.numbers),
      createdAt: card.created_at
    }));

    console.log(`[Cards] ✅ ${formattedCards.length} cartones disponibles de ${totalAvailable} totales`);

    res.json({
      cards: formattedCards,
      availableTickets,
      maxSelection, // Ya calculado arriba según si es starter o no
      totalAvailable,
      hasMore: totalAvailable > (randomOffset + limit)
    });

  } catch (error) {
    console.error('[Cards] ❌ Error obteniendo cartones:', error);
    res.status(500).json({ error: 'Error obteniendo cartones disponibles' });
  }
};

/**
 * POST /api/cards/reserve
 * Reservar cartón temporalmente (al hacer click)
 */
exports.reserveCard = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { cardId, room } = req.body;
    const userId = req.user.id;

    // Mapear nombre de sala
    const roomDB = ROOM_MAP[room] || room;

    console.log(`[Cards] 🔒 Usuario ${userId} reservando cartón ${cardId} en sala ${roomDB}`);

    await connection.beginTransaction();

    // Verificar que el cartón esté disponible
    const [cardCheck] = await connection.query(
      `SELECT id, status, selected_by FROM bingo_cards_pool
       WHERE id = ? AND room = ? FOR UPDATE`,
      [cardId, roomDB]
    );

    if (cardCheck.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Cartón no encontrado' });
    }

    const card = cardCheck[0];

    // Si ya está reservado/seleccionado por otro usuario
    if ((card.status === 'reserved' || card.status === 'selected') && card.selected_by !== userId) {
      await connection.rollback();
      return res.status(409).json({
        error: 'Este cartón ya fue tomado por otro jugador',
        status: card.status
      });
    }

    // Si ya está reservado por este usuario, no hacer nada
    if (card.status === 'reserved' && card.selected_by === userId) {
      await connection.commit();
      return res.json({
        success: true,
        message: 'Cartón ya reservado',
        cardId,
        alreadyReserved: true
      });
    }

    // Reservar el cartón (válido por 5 minutos)
    await connection.query(
      `UPDATE bingo_cards_pool
       SET status = 'reserved', 
           selected_by = ?, 
           selected_at = NOW()
       WHERE id = ? AND status = 'available'`,
      [userId, cardId]
    );

    await connection.commit();

    console.log(`[Cards] ✅ Cartón ${cardId} reservado temporalmente para usuario ${userId}`);

    res.json({
      success: true,
      message: 'Cartón reservado',
      cardId,
      expiresIn: 300 // 5 minutos
    });

  } catch (error) {
    await connection.rollback();
    console.error('[Cards] ❌ Error reservando cartón:', error);
    res.status(500).json({ error: 'Error al reservar cartón' });
  } finally {
    connection.release();
  }
};

/**
 * POST /api/cards/unreserve
 * Liberar reserva de cartón (al deseleccionar)
 */
exports.unreserveCard = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { cardId, room } = req.body;
    const userId = req.user.id;

    // Mapear nombre de sala
    const roomDB = ROOM_MAP[room] || room;

    console.log(`[Cards] 🔓 Usuario ${userId} liberando cartón ${cardId} en sala ${roomDB}`);

    await connection.beginTransaction();

    // Liberar solo si está reservado por este usuario
    const [result] = await connection.query(
      `UPDATE bingo_cards_pool
       SET status = 'available', 
           selected_by = NULL, 
           selected_at = NULL
       WHERE id = ? AND room = ? AND status = 'reserved' AND selected_by = ?`,
      [cardId, roomDB, userId]
    );

    await connection.commit();

    if (result.affectedRows > 0) {
      console.log(`[Cards] ✅ Cartón ${cardId} liberado`);
      res.json({ success: true, message: 'Cartón liberado', cardId });
    } else {
      res.json({ success: false, message: 'Cartón no estaba reservado', cardId });
    }

  } catch (error) {
    await connection.rollback();
    console.error('[Cards] ❌ Error liberando cartón:', error);
    res.status(500).json({ error: 'Error al liberar cartón' });
  } finally {
    connection.release();
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

    const { cardIds, room, packageInfo } = req.body;
    const userId = req.user.id;

    // Mapear nombre de sala a español para BD
    const roomDB = ROOM_MAP[room] || room;

    if (!Array.isArray(cardIds) || cardIds.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Debes seleccionar al menos un cartón' });
    }

    if (cardIds.length > 30) {
      await connection.rollback();
      return res.status(400).json({ error: 'No puedes seleccionar más de 30 cartones' });
    }

    // Extraer cantidad de gift cards del paquete
    const giftCount = packageInfo?.bonus || 0;
    const purchasedCount = cardIds.length - giftCount;

    console.log(`[Cards] 🎯 Usuario ${userId} seleccionando ${cardIds.length} cartones (${purchasedCount} comprados + ${giftCount} PLUS) para sala ${room} (BD: ${roomDB})`);

    // Solo validar tickets/balance si NO es sala starter
    if (roomDB !== 'starter') {
      // Verificar tickets disponibles por tipo (pagos vs gratis)
      const [inventory] = await connection.query(
        `SELECT 
           COALESCE(SUM(CASE WHEN is_gift = 0 THEN quantity ELSE 0 END), 0) as paid_quantity,
           COALESCE(SUM(CASE WHEN is_gift = 1 THEN quantity ELSE 0 END), 0) as free_quantity
         FROM user_card_inventory 
         WHERE user_id = ? AND room = ?`,
        [userId, roomDB]
      );

      const availablePaid = inventory[0]?.paid_quantity || 0;
      const availableFree = inventory[0]?.free_quantity || 0;
      const totalAvailable = availablePaid + availableFree;

      console.log(`[Cards] 📊 Tickets disponibles - Pagos: ${availablePaid}, Gratis: ${availableFree}, Total: ${totalAvailable}, Necesarios: ${purchasedCount} (${giftCount} PLUS no cuentan)`);

      // Si no tiene suficientes tickets para los COMPRADOS (gift cards no cuentan), intentar usar balance
      if (totalAvailable < purchasedCount) {
        console.log(`[Cards] ⚠️ Tickets insuficientes - verificando balance del usuario`);

        // Obtener costo del cartón según la sala desde room_settings
        const [roomSettings] = await connection.query(
          `SELECT card_price FROM room_settings WHERE room = ? LIMIT 1`,
          [roomDB]
        );

        if (!roomSettings || roomSettings.length === 0) {
          await connection.rollback();
          connection.release();
          return res.status(400).json({
            error: 'No se encontró configuración de precio para esta sala'
          });
        }

        const cardCost = parseFloat(roomSettings[0].card_price);
        const totalCost = cardCost * purchasedCount; // Solo cartones comprados, NO gift cards

        // Verificar balance del usuario
        const [userData] = await connection.query(
          `SELECT balance FROM users WHERE id = ?`,
          [userId]
        );

        if (!userData || userData.length === 0) {
          await connection.rollback();
          connection.release();
          return res.status(400).json({
            error: 'Usuario no encontrado'
          });
        }

        const userBalance = parseFloat(userData[0].balance) || 0;

        console.log(`[Cards] 💰 Costo por cartón: $${cardCost}, Cartones comprados: ${purchasedCount}, Total: $${totalCost}, Balance usuario: $${userBalance}`);

        if (userBalance < totalCost) {
          await connection.rollback();
          connection.release();
          console.log(`[Cards] ❌ Balance insuficiente - Necesita: $${totalCost}, Tiene: $${userBalance}`);
          return res.status(402).json({
            error: 'insufficient_funds',
            message: 'No tienes suficientes tickets ni balance. Por favor contacta a tu agente para recargar.',
            required: totalCost,
            balance: userBalance,
            cardCost: cardCost,
            cardsRequested: purchasedCount
          });
        }

        // Tiene balance suficiente - cobrar y crear inventario
        console.log(`[Cards] ✅ Cobrando $${totalCost} del balance del usuario`);

        await connection.query(
          `UPDATE users SET balance = balance - ? WHERE id = ?`,
          [totalCost, userId]
        );

        // Registrar movimiento de fichas
        await connection.query(
          `INSERT INTO chips_movements 
           (user_id, movement_type, amount, balance_after, description, created_at)
           VALUES (?, 'purchase', ?, ?, ?, NOW())`,
          [userId, totalCost, userBalance - totalCost, `Compra de ${purchasedCount} cartones para sala ${roomDB} (${giftCount} PLUS gratis)`]
        );

        // Crear inventario de cartones pagos
        await connection.query(
          `INSERT INTO user_card_inventory (user_id, room, quantity, is_gift, purchase_price, created_at)
           VALUES (?, ?, ?, 0, ?, NOW())
           ON DUPLICATE KEY UPDATE 
           quantity = quantity + VALUES(quantity)`,
          [userId, roomDB, cardIds.length, cardCost]
        );

        console.log(`[Cards] ✅ Balance cobrado y ${cardIds.length} cartones agregados al inventario como PAGOS`);

        // Establecer distribución para descuento posterior
        req.ticketDistribution = {
          paid: cardIds.length,
          free: 0,
          flexibleMode: false
        };
      } else {
        // Tiene suficientes tickets - aplicar regla del 10% SOLO sobre cartones comprados
        const maxFree = Math.ceil(purchasedCount * 0.10); // Máximo 10% gratis sobre COMPRADOS (no sobre gifts)
        let actualFree = Math.min(maxFree, availableFree);
        let needPaid = purchasedCount - actualFree;
        let flexibleMode = false;

        console.log(`[Cards] 📐 Distribución calculada - Cartones comprados: ${purchasedCount}, Máx gratis (10%): ${maxFree}, Gratis a usar: ${actualFree}, Pagos necesarios: ${needPaid}`);

        // MODO FLEXIBLE: Si no hay suficientes pagos, usar todos los disponibles
        if (needPaid > availablePaid) {
          console.log(`[Cards] ⚠️ MODO FLEXIBLE activado - Pagos insuficientes (${availablePaid}/${needPaid})`);

          // Usar TODOS los pagos disponibles
          needPaid = availablePaid;
          actualFree = purchasedCount - needPaid;

          // Verificar que haya suficientes gratis para completar
          if (actualFree > availableFree) {
            await connection.rollback();
            console.log(`[Cards] ❌ Tickets insuficientes TOTALES - Necesita ${actualFree} gratis pero solo tiene ${availableFree}`);
            return res.status(400).json({
              error: 'No tienes suficientes tickets disponibles',
              required: purchasedCount,
              available: {
                paid: availablePaid,
                free: availableFree,
                total: totalAvailable
              }
            });
          }

          flexibleMode = true;
          const actualPercentage = Math.round(actualFree / purchasedCount * 100);
          console.log(`[Cards] 🔄 FLEXIBLE: Usará ${needPaid} pagos + ${actualFree} gratis (${actualPercentage}% gratis - EXCEDE regla 10%)`);
        }

        // Guardar distribución para usar después en el descuento
        req.ticketDistribution = {
          paid: needPaid,
          free: actualFree,
          flexibleMode
        };

        if (!flexibleMode) {
          console.log(`[Cards] ✅ Distribución validada - Usará ${needPaid} pagos + ${actualFree} gratis (${Math.round(actualFree / purchasedCount * 100)}% gratis sobre ${purchasedCount} comprados)`);
        }
      }
    } else {
      console.log('[Cards] 🎁 Sala Starter - Acceso libre, omitiendo validación de tickets');
    }

    // Verificar que los cartones estén disponibles, reservados O ya seleccionados por este usuario
    console.log(`[Cards] 🔍 Verificando disponibilidad de cartones para userId=${userId}, room=${roomDB}, cardIds=`, cardIds);

    const [cardsCheck] = await connection.query(
      `SELECT id, serial as card_serial, status, selected_by FROM bingo_cards_pool
       WHERE id IN (?) AND room = ? 
       AND (status = 'available' 
            OR (status = 'reserved' AND selected_by = ?)
            OR (status = 'selected' AND selected_by = ?))
       FOR UPDATE`,
      [cardIds, roomDB, userId, userId]
    );

    if (cardsCheck.length !== cardIds.length) {
      // Mostrar cuáles están ocupados
      const [allCards] = await connection.query(
        `SELECT id, serial as card_serial, status, selected_by FROM bingo_cards_pool WHERE id IN (?) AND room = ?`,
        [cardIds, roomDB]
      );

      await connection.rollback();
      console.log('[Cards] ❌ Cartones no disponibles:', {
        requested: cardIds.length,
        available: cardsCheck.length,
        cardIds,
        allCardsStatus: allCards
      });
      return res.status(409).json({
        error: 'Algunos cartones ya fueron seleccionados por otros jugadores',
        available: cardsCheck.length,
        requested: cardIds.length,
        details: allCards
      });
    }

    // Marcar cartones como seleccionados
    await connection.query(
      `UPDATE bingo_cards_pool
       SET status = 'selected', selected_by = ?, selected_at = NOW()
       WHERE id IN (?)`,
      [userId, cardIds]
    );

    // Si hay gifts, marcar los últimos N cartones como gifts
    if (giftCount > 0) {
      const giftIds = cardIds.slice(-giftCount); // Últimos N IDs son gifts
      await connection.query(
        `UPDATE bingo_cards_pool
         SET is_gift = 1
         WHERE id IN (?)`,
        [giftIds]
      );
      console.log(`[Cards] 🎁 ${giftCount} cartones marcados como GIFT`);
    }

    // Descontar tickets del inventario solo si NO es sala starter
    if (roomDB !== 'starter') {
      const distribution = req.ticketDistribution;

      // Descontar tickets PAGOS (is_gift = 0)
      let paidToDeduct = distribution.paid;
      const [paidRecords] = await connection.query(
        `SELECT id, quantity FROM user_card_inventory
         WHERE user_id = ? AND room = ? AND is_gift = 0 AND quantity > 0
         ORDER BY created_at ASC FOR UPDATE`,
        [userId, roomDB]
      );

      for (const record of paidRecords) {
        if (paidToDeduct <= 0) break;
        const deductFromThis = Math.min(record.quantity, paidToDeduct);
        await connection.query(`UPDATE user_card_inventory SET quantity = quantity - ? WHERE id = ?`, [deductFromThis, record.id]);
        paidToDeduct -= deductFromThis;
      }

      // Descontar tickets GRATIS (is_gift = 1)
      let freeToDeduct = distribution.free;
      if (freeToDeduct > 0) {
        const [freeRecords] = await connection.query(
          `SELECT id, quantity FROM user_card_inventory
           WHERE user_id = ? AND room = ? AND is_gift = 1 AND quantity > 0
           ORDER BY created_at ASC FOR UPDATE`,
          [userId, roomDB]
        );
        for (const record of freeRecords) {
          if (freeToDeduct <= 0) break;
          const deductFromThis = Math.min(record.quantity, freeToDeduct);
          await connection.query(`UPDATE user_card_inventory SET quantity = quantity - ? WHERE id = ?`, [deductFromThis, record.id]);
          freeToDeduct -= deductFromThis;
        }
      }

      // Eliminar registros vacíos
      await connection.query(`DELETE FROM user_card_inventory WHERE user_id = ? AND room = ? AND quantity = 0`, [userId, roomDB]);

      // ========================================
      // ACTUALIZAR POZOS DE LA SESIÓN
      // ========================================
      const [roomSettings] = await connection.query(`SELECT card_price FROM room_settings WHERE room = ? LIMIT 1`, [roomDB]);

      if (roomSettings && roomSettings.length > 0) {
        const cardCost = parseFloat(roomSettings[0].card_price);
        const totalRevenue = cardCost * purchasedCount;
        const bingoAmount = totalRevenue * 0.50;
        const lineaAmount = totalRevenue * 0.15;
        const jackpotAmount = totalRevenue * 0.05;

        // Encontrar sesión pendiente o activa (para que los pozos se actualicen incluso si ya empezó)
        const [sessionResult] = await connection.query(
          `SELECT id FROM game_sessions 
           WHERE room = ? AND status IN ('pending', 'active') 
           ORDER BY created_at DESC LIMIT 1`,
          [roomDB]
        );

        if (sessionResult.length > 0) {
          const sessionId = sessionResult[0].id;
          await connection.query(
            `UPDATE game_sessions 
             SET jackpot_bingo = jackpot_bingo + ?, jackpot_linea = jackpot_linea + ?, jackpot_pre40 = jackpot_pre40 + ?, updated_at = NOW()
             WHERE id = ?`,
            [bingoAmount, lineaAmount, jackpotAmount, sessionId]
          );

          // ACTUALIZACIÓN GLOBAL: room_settings
          await connection.query(
            `UPDATE room_settings SET accumulated_pot_pre40 = accumulated_pot_pre40 + ?, updated_at = NOW() WHERE room = ?`,
            [jackpotAmount, roomDB]
          );

          // ACTUALIZAR CONTADORES DE CARTONES EN LA SESIÓN (Incluyendo total_cards_validated)
          await connection.query(
            `UPDATE game_sessions 
             SET total_paid_cards = total_paid_cards + ?, 
                 total_gift_cards = total_gift_cards + ?,
                 total_cards_validated = total_cards_validated + ?,
                 updated_at = NOW()
             WHERE id = ?`,
            [purchasedCount, giftCount, cardIds.length, sessionId]
          );

          console.log(`[Cards] ✅ Pozos actualizados para sala ${roomDB}`);
        }
      }
    }

    // Finalizar transacción
    const [selectedCards] = await connection.query(`SELECT id, serial as card_serial, numbers, selected_at FROM bingo_cards_pool WHERE id IN (?)`, [cardIds]);
    await connection.commit();

    // ============================================
    // SINCRONIZACIÓN ESPECIAL SALA STARTER
    // ============================================
    if (roomDB === 'starter') {
      try {
        console.log(`[Cards] 🔄 Sincronizando selección Starter en cardPoolService para usuario ${userId}`);

        // 1. Buscar sesión activa de starter
        const [activeSession] = await pool.query(
          "SELECT id FROM game_sessions WHERE room = 'starter' AND status IN ('pending', 'active') ORDER BY created_at DESC LIMIT 1"
        );

        if (activeSession.length > 0) {
          const sessionId = activeSession[0].id;

          // 2. Formatear cartones para cardPoolService
          const cardsForPool = selectedCards.map(c => ({
            id: c.id,
            serial: c.card_serial,
            numbers: typeof c.numbers === 'string' ? JSON.parse(c.numbers) : c.numbers
          }));

          // 3. Registrar en card_pool para que StarterRoom pueda verlos después de un refresh
          // Primero borramos si tenía algo previo en esta sesión para evitar duplicados
          await pool.query("DELETE FROM card_pool WHERE session_id = ? AND reserved_by = ?", [sessionId, userId]);

          const values = cardsForPool.map(c => [
            c.id,
            sessionId,
            c.serial,
            JSON.stringify(c.numbers),
            'reserved',
            userId
          ]);

          if (values.length > 0) {
            await pool.query(
              "INSERT INTO card_pool (id, session_id, serial, numbers, status, reserved_by, reserved_at) VALUES ?",
              [values]
            );

            // 4. Forzar recarga del pool de memoria para esta sesión
            await cardPoolService.loadPoolFromDB(sessionId);
            console.log(`[Cards] ✅ Sincronización Starter exitosa para sesión ${sessionId}`);
          }
        }
      } catch (syncError) {
        console.error('[Cards] ❌ Error en sincronización Starter:', syncError);
        // No bloqueamos la respuesta al usuario ya que bingo_cards_pool ya se guardó
      }
    }

    // Emitir actualización de pozos
    if (roomDB !== 'starter') {
      websocketService.emitPotsUpdate();
    }

    // ============================================
    // EMITIR ACTUALIZACIÓN DE RECURSOS (Socket.IO)
    // ============================================
    // Esto es crucial para que el header del cliente se actualice
    // con el nuevo balance y cantidad de tickets
    try {
      const io = req.app.get('io');
      if (io) {
        // Obtener datos actualizados del usuario
        const [updatedUser] = await pool.query(
          'SELECT balance FROM users WHERE id = ?',
          [userId]
        );

        const [updatedInventory] = await pool.query(`
          SELECT 
            COALESCE(SUM(CASE WHEN room = 'bronce' AND is_gift = FALSE THEN quantity ELSE 0 END), 0) as cards_bronce,
            COALESCE(SUM(CASE WHEN room = 'plata' AND is_gift = FALSE THEN quantity ELSE 0 END), 0) as cards_plata,
            COALESCE(SUM(CASE WHEN room = 'oro' AND is_gift = FALSE THEN quantity ELSE 0 END), 0) as cards_oro,
            COALESCE(SUM(CASE WHEN room = 'bronce' AND is_gift = TRUE THEN quantity ELSE 0 END), 0) as gift_bronce,
            COALESCE(SUM(CASE WHEN room = 'plata' AND is_gift = TRUE THEN quantity ELSE 0 END), 0) as gift_plata,
            COALESCE(SUM(CASE WHEN room = 'oro' AND is_gift = TRUE THEN quantity ELSE 0 END), 0) as gift_oro
          FROM user_card_inventory
          WHERE user_id = ?
        `, [userId]);

        const inv = updatedInventory[0] || {};

        // Totales para el usuario
        const cartonesTotal = {
          bronce: (parseInt(inv.cards_bronce) || 0) + (parseInt(inv.gift_bronce) || 0),
          plata: (parseInt(inv.cards_plata) || 0) + (parseInt(inv.gift_plata) || 0),
          oro: (parseInt(inv.cards_oro) || 0) + (parseInt(inv.gift_oro) || 0)
        };

        io.to(`user_${userId}`).emit('resources_updated', {
          userId,
          balance: parseFloat(updatedUser[0].balance),
          cartones: cartonesTotal,
          // Datos extra para consistencia
          cards_bronce: parseInt(inv.cards_bronce) || 0,
          gift_bronce: parseInt(inv.gift_bronce) || 0,
          // etc...
          message: 'Inventario actualizado'
        });

        console.log(`📡 [Cards] resources_updated emitido para user_${userId}`);
      }
    } catch (socketError) {
      console.error('[Cards] ⚠️ Error emitiendo socket update:', socketError);
      // No fallar la request si falla el socket
    }

    // Determinar cuáles son gifts según packageInfo (ya declarado arriba)

    const formattedCards = selectedCards.map((card, index) => {
      // Los últimos N cartones son gifts (donde N = giftCount)
      const isGift = index >= (selectedCards.length - giftCount);

      return {
        id: card.id,
        serial: card.card_serial,
        numbers: safeParseNumbers(card.numbers),
        selectedAt: card.selected_at,
        isGift: isGift
      };
    });

    console.log(`[Cards] ✅ ${formattedCards.length} cartones seleccionados correctamente`);

    // Calcular tickets restantes según si es starter o no
    // IMPORTANTE: Solo contar cartones comprados, NO PLUS/gifts
    let remainingTickets = 0;
    let totalCardsInRoom = 0;

    // Contar cuántos cartones COMPRADOS (no gifts) tiene el usuario en esta sala
    const [purchasedCards] = await connection.query(
      `SELECT COUNT(*) as total
       FROM bingo_cards_pool
       WHERE selected_by = ? 
       AND status = 'selected' 
       AND is_gift = 0
       AND room = ?
       AND game_session_id IS NULL`,
      [userId, roomDB]
    );

    totalCardsInRoom = purchasedCards[0]?.total || 0;
    remainingTickets = Math.max(0, 20 - totalCardsInRoom); // Nunca negativo

    console.log(`[Cards] 📊 Sala ${roomDB} - Total comprado: ${totalCardsInRoom}, Puede comprar: ${remainingTickets} más`);

    // REGENERACIÓN AUTOMÁTICA: Verificar si se necesita generar más cartones
    // Se ejecuta en background sin bloquear la respuesta al usuario
    const cardPoolManager = require('../services/cardPoolManager');
    cardPoolManager.checkAndRegenerate(roomDB).catch(err => {
      console.error('[Cards] Error en regeneración automática:', err);
    });

    // Notificar via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('cards_selected', {
        room: roomDB,
        cards: formattedCards,
        remainingTickets
      });
    }

    res.json({
      success: true,
      cards: formattedCards,
      remainingTickets,
      message: `${formattedCards.length} cartón${formattedCards.length > 1 ? 'es' : ''} seleccionado${formattedCards.length > 1 ? 's' : ''} exitosamente`
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('[Cards] ❌ Error seleccionando cartones:', error);
    console.error('[Cards] ❌ Stack:', error.stack);
    res.status(500).json({
      error: 'Error al seleccionar cartones',
      details: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/**
 * GET /api/cards/my-selected/:room
 * Obtener mis cartones seleccionados para una sala
 */
exports.getMySelectedCards = async (req, res) => {
  try {
    const { room } = req.params;
    const { sessionId: querySessionId } = req.query;
    const userId = req.user.id;

    // Mapear nombre de sala
    const roomDB = ROOM_MAP[room] || room;

    // 1. Intentar obtener cartones VALIDADOS de la sesión ACTIVA o una específica
    let sessionId = querySessionId;

    if (!sessionId) {
      const [activeSession] = await pool.query(
        'SELECT id FROM game_sessions WHERE room = ? AND status IN ("active", "playing", "pending") ORDER BY id DESC LIMIT 1',
        [roomDB]
      );
      if (activeSession.length > 0) {
        sessionId = activeSession[0].id;
      }
    }

    let cards = [];
    let source = '';

    if (sessionId) {
      // Obtener cartones de la tabla de juego (validated_cards)
      // Nota: validated_cards usa serial_number y grid_numbers
      const [validated] = await pool.query(
        `SELECT id, serial_number as card_serial, grid_numbers as numbers, created_at as selected_at, game_session_id, is_gift
         FROM validated_cards
         WHERE player_id = ? AND game_session_id = ?`,
        [userId, sessionId]
      );

      if (validated.length > 0) {
        cards = validated;
        source = 'validated';
      }
    }

    // 2. Si no hay validados, buscar en el pool (fallback para Lobby o Pending)
    if (cards.length === 0) {
      // Buscar cartones 'selected' recientes (últimas 24h)
      // Nota: bingo_cards_pool usa serial y numbers
      const [poolCards] = await pool.query(
        `SELECT id, serial as card_serial, numbers, selected_at, game_session_id, is_gift
         FROM bingo_cards_pool
         WHERE selected_by = ? AND room = ? AND status = 'selected'
         AND selected_at > NOW() - INTERVAL 24 HOUR
         ORDER BY selected_at DESC`,
        [userId, roomDB]
      );
      cards = poolCards;
      source = 'pool';
    }

    const formattedCards = cards.map(card => ({
      id: card.id,
      serial: card.card_serial,
      numbers: typeof card.numbers === 'string' ? safeParseNumbers(card.numbers) : card.numbers, // Handle JSON vs String
      selectedAt: card.selected_at,
      sessionId: card.game_session_id,
      status: source === 'validated' ? 'selected' : 'selected', // Always return selected so frontend renders them
      isGift: !!card.is_gift
    }));

    res.json({ cards: formattedCards, source });
  } catch (error) {
    console.error('[Cards] ❌ Error obteniendo cartones seleccionados:', error);
    res.status(500).json({ error: 'Error al obtener cartones seleccionados' });
  }
};

/**
 * GET /api/cards/stats
 * Obtener estadísticas de cartones pagos vs gratis por sala (SuperAdmin)
 */
exports.getCardStats = async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        room,
        SUM(CASE WHEN is_gift = 0 THEN quantity ELSE 0 END) as total_paid,
        SUM(CASE WHEN is_gift = 1 THEN quantity ELSE 0 END) as total_free,
        SUM(quantity) as total_cards,
        COUNT(DISTINCT CASE WHEN is_gift = 0 THEN user_id ELSE NULL END) as users_with_paid,
        COUNT(DISTINCT CASE WHEN is_gift = 1 THEN user_id ELSE NULL END) as users_with_free,
        COUNT(DISTINCT user_id) as total_users,
        ROUND(
          (SUM(CASE WHEN is_gift = 1 THEN quantity ELSE 0 END) / 
           NULLIF(SUM(quantity), 0) * 100), 
          2
        ) as free_percentage
      FROM user_card_inventory
      WHERE quantity > 0
      GROUP BY room
      ORDER BY FIELD(room, 'bronce', 'plata', 'oro')
    `);

    // Calcular totales globales
    const [globalStats] = await pool.query(`
      SELECT 
        SUM(CASE WHEN is_gift = 0 THEN quantity ELSE 0 END) as total_paid,
        SUM(CASE WHEN is_gift = 1 THEN quantity ELSE 0 END) as total_free,
        SUM(quantity) as total_cards,
        COUNT(DISTINCT user_id) as total_users,
        ROUND(
          (SUM(CASE WHEN is_gift = 1 THEN quantity ELSE 0 END) / 
           NULLIF(SUM(quantity), 0) * 100), 
          2
        ) as free_percentage
      FROM user_card_inventory
      WHERE quantity > 0
    `);

    console.log('[Cards Stats] 📊 Estadísticas de cartones consultadas');

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      by_room: stats,
      global: globalStats[0],
      compliance: {
        rule: 'Máximo 10% de cartones pueden ser gratis',
        compliant: (globalStats[0]?.free_percentage || 0) <= 10
      }
    });
  } catch (error) {
    console.error('[Cards Stats] ❌ Error:', error);
    res.status(500).json({
      error: 'Error al obtener estadísticas de cartones',
      details: error.message
    });
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

/**
 * GET /api/cards/gift-cards/:room/:quantity
 * Obtener gift cards (cartones de yapa gratis) para un paquete
 */
exports.getGiftCards = async (req, res) => {
  try {
    const { room, quantity } = req.params;
    const userId = req.user.id;

    // Mapear nombre de sala a español para BD
    const roomDB = ROOM_MAP[room] || room;
    const giftQuantity = parseInt(quantity) || 0;

    console.log(`[Cards] 🎁 Obteniendo ${giftQuantity} gift cards para sala: ${room} (BD: ${roomDB}), usuario: ${userId}`);

    if (giftQuantity === 0) {
      return res.json({ giftCards: [] });
    }

    // Buscar gift cards disponibles en cosmetic_items
    // Estos son los tickets de yapa (consumibles tipo 'bronce', 'plata', 'oro', 'starter')
    const [giftCardsFromInventory] = await pool.query(
      `SELECT id, card_serial, numbers
       FROM bingo_cards_pool
       WHERE room = ? AND status = 'available'
       ORDER BY RAND()
       LIMIT ?`,
      [roomDB, giftQuantity]
    );

    // Parsear números
    const formattedGiftCards = giftCardsFromInventory.map(card => ({
      id: card.id,
      serial: card.card_serial,
      numbers: safeParseNumbers(card.numbers),
      isGift: true
    }));

    console.log(`[Cards] ✅ ${formattedGiftCards.length} gift cards obtenidas`);

    res.json({
      success: true,
      giftCards: formattedGiftCards,
      count: formattedGiftCards.length
    });

  } catch (error) {
    console.error('[Cards] ❌ Error obteniendo gift cards:', error);
    res.status(500).json({ error: 'Error al obtener gift cards' });
  }
};

