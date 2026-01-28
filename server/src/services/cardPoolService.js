/**
 * CARD POOL SERVICE
 * 
 * Gestiona el pool de cartones disponibles por sesión
 * - Generación automática al crear sesión
 * - Sistema de reservas (no duplicados entre jugadores)
 * - Ventanas de tiempo (5 min antes y después del sorteo)
 * - Soporte concurrente para 500+ jugadores
 */

const BingoCardGenerator = require('./cardGenerator');
const db = require('../db');

class CardPoolService {
  constructor() {
    this.generator = new BingoCardGenerator();
    this.pools = new Map(); // sessionId -> { cards, reservations }
    this.timeWindows = new Map(); // sessionId -> { openTime, closeTime, status }
  }

  /**
   * Obtiene el siguiente lote de contadores globales (atómico)
   * @param {number} quantity - Cantidad de contadores necesarios
   * @returns {number} Contador inicial para el lote
   */
  async getNextCounterBatch(quantity) {
    // Usar UPDATE con LAST_INSERT_ID para operación atómica
    const query = `
      UPDATE global_card_counter 
      SET counter = LAST_INSERT_ID(counter + ?)
      WHERE id = 1
    `;

    await db.query(query, [quantity]);

    // Obtener el valor ANTES del incremento
    const [rows] = await db.query('SELECT LAST_INSERT_ID() as counter');
    const newCounter = rows[0].counter;

    // El rango asignado es: [newCounter - quantity, newCounter)
    return newCounter - quantity;
  }

  /**
   * Inicializa pool de cartones para una sesión
   * @param {string} sessionId 
   * @param {number} totalCards - Total de cartones a generar (default: 10000)
   * @param {string} roomType - Tipo de sala
   */
  async initializePool(sessionId, totalCards = 10000, roomType = 'starter') {
    // PRIMERO: Verificar si ya existen cartones en BD
    const checkQuery = 'SELECT COUNT(*) as count FROM bingo_cards_pool WHERE game_session_id = ?';
    const [checkRows] = await db.query(checkQuery, [sessionId]);

    if (checkRows[0].count > 0) {
      console.log(`ℹ️ Ya existen ${checkRows[0].count} cartones para sesión ${sessionId}, cargando desde BD...`);
      await this.loadPoolFromDB(sessionId);
      return checkRows[0].count;
    }

    console.log(`🎫 Generando ${totalCards} cartones NUEVOS para sesión ${sessionId}...`);

    const roomLetters = {
      starter: 'S',
      bronze: 'B',
      silver: 'P', // Plata
      gold: 'O'    // Oro
    };

    // Obtener lote de contadores globales (atómico)
    const counterStart = await this.getNextCounterBatch(totalCards);
    console.log(`🔢 Contador global asignado: ${counterStart} - ${counterStart + totalCards - 1}`);

    const cards = this.generator.generateCardBatch(
      totalCards,
      sessionId,
      roomLetters[roomType] || 'S',
      counterStart // Pasar contador inicial
    );

    // Guardar en memoria (Map) para acceso rápido
    this.pools.set(sessionId, {
      cards: new Map(cards.map(c => [c.id, c])),
      reservations: new Map(), // cardId -> { userId, timestamp }
      roomType
    });

    // Guardar en base de datos para persistencia
    await this.savePoolToDB(sessionId, cards);

    console.log(`✅ Pool de ${totalCards} cartones creado para sesión ${sessionId}`);
    return cards.length;
  }

  /**
   * Guarda pool en base de datos
   */
  async savePoolToDB(sessionId, cards) {
    if (cards.length === 0) {
      console.log('⚠️ No hay cartones para guardar');
      return;
    }

    const values = cards.map(card => [
      card.id,
      sessionId,
      card.serial,
      JSON.stringify(card.numbers),
      'available'
    ]);

    // Usar INSERT IGNORE para no fallar si ya existen
    const query = `
      INSERT IGNORE INTO bingo_cards_pool (id, game_session_id, card_serial, numbers, status)
      VALUES ?
    `;

    try {
      const [result] = await db.query(query, [values]);
      console.log(`💾 ${result.affectedRows} cartones guardados en BD (${cards.length - result.affectedRows} ya existían)`);
    } catch (error) {
      console.error('❌ Error guardando pool en BD:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene cartones disponibles para un jugador
   * @param {string} sessionId 
   * @param {string} userId 
   * @param {boolean} excludeUserCards - Si true, excluye cartones ya reservados por el usuario
   * @returns {Array} Lista de cartones disponibles y reservados
   */
  async getAvailableCards(sessionId, userId, excludeUserCards = false) {
    const pool = this.pools.get(sessionId);

    if (!pool) {
      // Intentar cargar desde BD
      await this.loadPoolFromDB(sessionId);
      return this.getAvailableCards(sessionId, userId, excludeUserCards);
    }

    const availableCards = [];

    pool.cards.forEach(card => {
      const reservation = pool.reservations.get(card.id);

      if (!reservation) {
        // Disponible
        availableCards.push({
          ...card,
          status: 'available'
        });
      } else if (reservation.userId === userId) {
        // Reservado por este usuario - solo incluir si NO se excluyen
        if (!excludeUserCards) {
          availableCards.push({
            ...card,
            status: 'selected'
          });
        }
      } else {
        // Reservado por otro usuario (mostrar como ocupado)
        availableCards.push({
          id: card.id,
          serial: card.serial,
          numbers: card.numbers,
          status: 'reserved'
        });
      }
    });

    return availableCards;
  }

  /**
   * Reserva cartones para un usuario
   * @param {string} sessionId 
   * @param {string} userId 
   * @param {Array} cardIds - IDs de los cartones a reservar
   * @returns {Object} { success, reservedCards, errors }
   */
  async reserveCards(sessionId, userId, cardIds) {
    const pool = this.pools.get(sessionId);

    if (!pool) {
      throw new Error('Pool de cartones no encontrado');
    }

    const reservedCards = [];
    const errors = [];

    // Validar ventana de tiempo
    const timeWindow = this.getTimeWindowStatus(sessionId);
    if (timeWindow === 'closed') {
      throw new Error('La selección de cartones está cerrada durante el sorteo');
    }

    // Verificar límite de 20 cartones por usuario
    const userReservations = Array.from(pool.reservations.values())
      .filter(r => r.userId === userId);

    if (userReservations.length + cardIds.length > 20) {
      throw new Error('Solo puedes reservar hasta 20 cartones por sesión');
    }

    // Snapshot de reservas anteriores (para rollback)
    const previousReservations = new Map();

    // Intentar reservar cada cartón
    for (const cardId of cardIds) {
      const card = pool.cards.get(cardId);

      if (!card) {
        errors.push({ cardId, error: 'Cartón no existe' });
        continue;
      }

      const existingReservation = pool.reservations.get(cardId);

      if (existingReservation && existingReservation.userId !== userId) {
        errors.push({ cardId, error: 'Cartón ya reservado por otro jugador' });
        continue;
      }

      // Guardar estado anterior
      previousReservations.set(cardId, existingReservation || null);

      // Reservar en memoria
      pool.reservations.set(cardId, {
        userId,
        timestamp: Date.now()
      });

      reservedCards.push({
        ...card,
        status: 'reserved'
      });
    }

    // Actualizar en BD - si falla, hacer rollback
    if (reservedCards.length > 0) {
      try {
        await this.updateReservationsInDB(sessionId, userId, reservedCards);
      } catch (error) {
        // ROLLBACK: Restaurar estado anterior en memoria
        console.error('🔄 Haciendo rollback de reservas en memoria...');
        previousReservations.forEach((oldValue, cardId) => {
          if (oldValue === null) {
            pool.reservations.delete(cardId);
          } else {
            pool.reservations.set(cardId, oldValue);
          }
        });
        throw error; // Re-lanzar para que controller maneje el error
      }
    }

    return {
      success: reservedCards.length > 0,
      reservedCards,
      errors
    };
  }

  /**
   * Actualiza reservas en base de datos
   */
  async updateReservationsInDB(sessionId, userId, cards) {
    if (cards.length === 0) return;

    const cardIds = cards.map(c => c.id);

    const query = `
      UPDATE bingo_cards_pool 
      SET status = 'reserved', reserved_by = ?, reserved_at = NOW()
      WHERE id IN (?) AND game_session_id = ? AND status = 'available'
    `;

    try {
      const [result] = await db.query(query, [userId, cardIds, sessionId]);

      if (result.affectedRows !== cards.length) {
        throw new Error(`Solo ${result.affectedRows}/${cards.length} cartones fueron reservados. Puede que algunos ya estén ocupados.`);
      }

      console.log(`💾 ${result.affectedRows} cartones reservados en BD para usuario ${userId}`);
    } catch (error) {
      console.error('❌ Error actualizando reservas en BD:', error.message);
      throw error; // Lanzar error para rollback en memoria
    }
  }

  /**
   * Carga pool desde base de datos (fallback)
   */
  async loadPoolFromDB(sessionId) {
    const query = `
      SELECT id, game_session_id AS session_id, card_serial AS serial, numbers, status, reserved_by, is_gift
      FROM bingo_cards_pool
      WHERE game_session_id = ?
    `;

    try {
      const [rows] = await db.query(query, [sessionId]);

      const cards = new Map();
      const reservations = new Map();

      rows.forEach(row => {
        // Validar que numbers no sea null/undefined
        if (!row.numbers) {
          console.warn(`⚠️ Cartón ${row.id} sin números, saltando...`);
          return;
        }

        const card = {
          id: row.id,
          serial: row.serial,
          numbers: typeof row.numbers === 'string' ? JSON.parse(row.numbers) : row.numbers,
          sessionId: row.session_id,
          status: row.status,
          isGift: !!row.is_gift // Convert 1/0 to boolean
        };

        cards.set(card.id, card);

        if (row.status === 'reserved' && row.reserved_by) {
          reservations.set(card.id, {
            userId: row.reserved_by,
            timestamp: Date.now()
          });
        }
      });

      this.pools.set(sessionId, { cards, reservations, roomType: 'starter' });

      console.log(`✅ Pool cargado desde BD: ${cards.size} cartones`);
    } catch (error) {
      console.error('❌ Error cargando pool desde BD:', error);
      throw error;
    }
  }

  /**
   * Configura ventana de tiempo para selección
   * @param {string} sessionId 
   * @param {Date} gameStartTime - Hora de inicio del sorteo
   */
  setTimeWindow(sessionId, gameStartTime) {
    const startTime = new Date(gameStartTime);
    const openTime = new Date(startTime.getTime() - 5 * 60 * 1000); // 5 min antes
    const closeTime = new Date(startTime.getTime() + 5 * 60 * 1000); // 5 min después

    this.timeWindows.set(sessionId, {
      openTime,
      closeTime,
      gameStartTime: startTime
    });
  }

  /**
   * Obtiene estado de la ventana de tiempo
   * @returns {string} 'open' | 'closed' | 'drawing'
   */
  getTimeWindowStatus(sessionId) {
    const window = this.timeWindows.get(sessionId);

    if (!window) return 'open'; // Sin restricciones si no hay ventana configurada

    const now = Date.now();
    const openTime = window.openTime.getTime();
    const closeTime = window.closeTime.getTime();
    const gameStartTime = window.gameStartTime.getTime();

    if (now < openTime) {
      return 'closed'; // Muy temprano
    } else if (now >= openTime && now < gameStartTime) {
      return 'open'; // Ventana abierta antes del juego
    } else if (now >= gameStartTime && now < closeTime) {
      return 'drawing'; // Durante el sorteo
    } else if (now >= closeTime) {
      return 'open'; // Después del sorteo (nueva ventana)
    }

    return 'closed';
  }

  /**
   * Libera reservas expiradas (timeout de 10 minutos)
   */
  cleanExpiredReservations(sessionId) {
    const pool = this.pools.get(sessionId);
    if (!pool) return;

    const now = Date.now();
    const timeout = 10 * 60 * 1000; // 10 minutos
    let cleaned = 0;

    pool.reservations.forEach((reservation, cardId) => {
      if (now - reservation.timestamp > timeout) {
        pool.reservations.delete(cardId);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      console.log(`🧹 ${cleaned} reservas expiradas limpiadas en sesión ${sessionId}`);
    }
  }

  /**
   * Obtiene estadísticas del pool
   */
  getPoolStats(sessionId) {
    const pool = this.pools.get(sessionId);
    if (!pool) return null;

    return {
      totalCards: pool.cards.size,
      availableCards: pool.cards.size - pool.reservations.size,
      reservedCards: pool.reservations.size,
      uniquePlayers: new Set(Array.from(pool.reservations.values()).map(r => r.userId)).size
    };
  }
}

// Singleton
const cardPoolService = new CardPoolService();

module.exports = cardPoolService;
