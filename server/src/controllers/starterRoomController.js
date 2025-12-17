/**
 * STARTER ROOM CONTROLLER
 * 
 * Maneja endpoints específicos de la Sala Starter:
 * - Obtener cartones disponibles
 * - Reservar cartones
 * - Estadísticas de sesión
 */

const cardPoolService = require('../services/cardPoolService');

class StarterRoomController {
  /**
   * GET /api/game/starter/available-cards/:sessionId
   * Obtiene cartones disponibles para la sesión
   */
  async getAvailableCards(req, res) {
    try {
      let { sessionId } = req.params;
      const userId = req.user ? req.user.id : null;

      // Si es 'starter_default', buscar la sesión más reciente
      if (sessionId === 'starter_default') {
        const [sessions] = await require('../db').query(`
          SELECT id FROM game_sessions 
          WHERE room = 'starter' 
          ORDER BY created_at DESC 
          LIMIT 1
        `);
        
        if (sessions.length === 0) {
          return res.json({
            success: true,
            cards: [],
            playersOnline: 0,
            timeRemaining: null,
            timeWindow: 'open',
            poolInitialized: false,
            message: 'No hay sesión activa. Contacta al administrador.'
          });
        }
        
        sessionId = sessions[0].id;
        console.log(`🔍 Usando sesión más reciente: ${sessionId}`);
      }

      // Verificar si el pool ya está en memoria
      let stats = cardPoolService.getPoolStats(sessionId);
      
      // Si no está en memoria, intentar cargar desde BD
      if (!stats) {
        console.log(`🔄 Pool no encontrado en memoria para sesión ${sessionId}, cargando desde BD...`);
        try {
          await cardPoolService.loadPoolFromDB(sessionId);
          stats = cardPoolService.getPoolStats(sessionId);
          
          if (stats) {
            console.log(`✅ Pool cargado exitosamente: ${stats.totalCards} cartones`);
          } else {
            console.log(`⚠️ No se encontraron cartones en BD para sesión ${sessionId}`);
          }
        } catch (loadError) {
          console.error(`❌ Error cargando pool desde BD:`, loadError.message);
        }
      }

      // Verificar estado de ventana de tiempo
      const timeWindowStatus = cardPoolService.getTimeWindowStatus(sessionId);
      
      if (timeWindowStatus === 'closed') {
        return res.status(403).json({
          success: false,
          message: 'La selección de cartones está cerrada durante el sorteo',
          timeWindow: 'closed'
        });
      }

      // Obtener cartones (excluir los ya reservados por este usuario)
      const cards = stats ? await cardPoolService.getAvailableCards(sessionId, userId || 'guest', true) : [];

      res.json({
        success: true,
        cards,
        playersOnline: stats ? stats.uniquePlayers : 0,
        timeRemaining: this.calculateTimeRemaining(sessionId),
        timeWindow: timeWindowStatus,
        poolInitialized: !!stats,
        actualSessionId: sessionId
      });
    } catch (error) {
      console.error('❌ Error obteniendo cartones:', error);
      res.status(500).json({
        success: false,
        message: 'Error cargando cartones disponibles'
      });
    }
  }

  /**
   * POST /api/game/starter/reserve-cards
   * Reserva cartones para un jugador
   */
  async reserveCards(req, res) {
    try {
      const { sessionId, cardIds } = req.body;
      const userId = req.user.id;

      // Validaciones
      if (!sessionId || !cardIds || !Array.isArray(cardIds)) {
        return res.status(400).json({
          success: false,
          message: 'Datos inválidos'
        });
      }

      if (cardIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Debes seleccionar al menos 1 cartón'
        });
      }

      if (cardIds.length > 20) {
        return res.status(400).json({
          success: false,
          message: 'Solo puedes seleccionar hasta 20 cartones'
        });
      }

      // Verificar ventana de tiempo
      const timeWindowStatus = cardPoolService.getTimeWindowStatus(sessionId);
      
      if (timeWindowStatus === 'closed') {
        return res.status(403).json({
          success: false,
          message: 'La selección de cartones está cerrada durante el sorteo'
        });
      }

      // Reservar cartones
      const result = await cardPoolService.reserveCards(sessionId, userId, cardIds);

      if (!result.success) {
        return res.status(409).json({
          success: false,
          message: 'No se pudieron reservar los cartones',
          errors: result.errors
        });
      }

      res.json({
        success: true,
        message: `${result.reservedCards.length} cartones reservados exitosamente`,
        reservedCards: result.reservedCards,
        errors: result.errors
      });
    } catch (error) {
      console.error('❌ Error reservando cartones:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error reservando cartones'
      });
    }
  }

  /**
   * GET /api/game/starter/my-cards/:sessionId
   * Obtiene cartones ya reservados por el jugador actual
   */
  async getMyCards(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;

      const pool = cardPoolService.pools.get(sessionId);
      if (!pool) {
        return res.json({
          success: true,
          cards: []
        });
      }

      // Filtrar cartones reservados por este usuario
      const myCards = Array.from(pool.cards.values()).filter(card => 
        card.status === 'reserved' && card.reserved_by === userId
      );

      res.json({
        success: true,
        cards: myCards
      });
    } catch (error) {
      console.error('❌ Error obteniendo mis cartones:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo cartones'
      });
    }
  }

  /**
   * GET /api/game/starter/session-stats/:sessionId
   * Obtiene estadísticas de la sesión
   */
  async getSessionStats(req, res) {
    try {
      const { sessionId } = req.params;
      
      const stats = cardPoolService.getPoolStats(sessionId);
      const timeWindow = cardPoolService.getTimeWindowStatus(sessionId);

      if (!stats) {
        return res.status(404).json({
          success: false,
          message: 'Sesión no encontrada'
        });
      }

      res.json({
        success: true,
        stats: {
          ...stats,
          timeWindow,
          timeRemaining: this.calculateTimeRemaining(sessionId)
        }
      });
    } catch (error) {
      console.error('❌ Error obteniendo stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo estadísticas'
      });
    }
  }

  /**
   * POST /api/game/starter/initialize-session
   * Inicializa una nueva sesión (solo admin)
   */
  async initializeSession(req, res) {
    try {
      const { sessionId, gameStartTime, totalCards = 10000 } = req.body;

      // Solo superadmin puede inicializar
      if (req.user.role !== 'superadmin') {
        return res.status(403).json({
          success: false,
          message: 'No autorizado'
        });
      }

      // Inicializar pool
      const cardsGenerated = await cardPoolService.initializePool(
        sessionId, 
        totalCards, 
        'starter'
      );

      // Configurar ventana de tiempo
      if (gameStartTime) {
        cardPoolService.setTimeWindow(sessionId, new Date(gameStartTime));
      }

      res.json({
        success: true,
        message: `Sesión inicializada con ${cardsGenerated} cartones`,
        sessionId,
        cardsGenerated
      });
    } catch (error) {
      console.error('❌ Error inicializando sesión:', error);
      res.status(500).json({
        success: false,
        message: 'Error inicializando sesión'
      });
    }
  }

  /**
   * POST /api/game/starter/credit-tickets
   * Acredita tickets de Starter en el inventario del jugador
   */
  async creditTickets(req, res) {
    try {
      const userId = req.user ? req.user.id : null;
      const { quantity } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const ticketsToCredit = quantity || 20;
      console.log(`🎫 Acreditando ${ticketsToCredit} tickets Starter para usuario ${userId}`);

      const db = require('../db');

      // Verificar si ya tiene tickets de starter
      const [existing] = await db.query(`
        SELECT id, quantity 
        FROM cosmetic_inventory 
        WHERE user_id = ? AND item_id = (
          SELECT id FROM cosmetic_items WHERE ticket_room = 'starter' LIMIT 1
        )
      `, [userId]);

      if (existing.length > 0) {
        // Actualizar cantidad existente
        const newQuantity = parseInt(existing[0].quantity) + ticketsToCredit;
        await db.query(`
          UPDATE cosmetic_inventory 
          SET quantity = ?, updated_at = NOW()
          WHERE id = ?
        `, [newQuantity, existing[0].id]);

        console.log(`✅ Tickets actualizados: ${existing[0].quantity} → ${newQuantity}`);
      } else {
        // Crear nuevo registro
        const [starterItem] = await db.query(`
          SELECT id FROM cosmetic_items WHERE ticket_room = 'starter' LIMIT 1
        `);

        if (starterItem.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No existe item de tickets para Starter'
          });
        }

        await db.query(`
          INSERT INTO cosmetic_inventory (user_id, item_id, quantity, created_at, updated_at)
          VALUES (?, ?, ?, NOW(), NOW())
        `, [userId, starterItem[0].id, ticketsToCredit]);

        console.log(`✅ ${ticketsToCredit} tickets Starter creados para usuario ${userId}`);
      }

      res.json({
        success: true,
        message: `${ticketsToCredit} tickets Starter acreditados`,
        quantity: ticketsToCredit
      });
    } catch (error) {
      console.error('❌ Error acreditando tickets:', error);
      res.status(500).json({
        success: false,
        message: 'Error al acreditar tickets'
      });
    }
  }

  /**
   * POST /api/game/starter/auto-assign-cards/:sessionId
   * Asigna automáticamente 20 cartones al jugador si no tiene ninguno
   */
  async autoAssignCards(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user ? req.user.id : null;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      console.log(`🎁 Auto-asignando 20 cartones para usuario ${userId} en sesión ${sessionId}`);

      // Obtener cartones disponibles
      const availableCards = cardPoolService.getAvailableCards(sessionId, 20);

      if (availableCards.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No hay cartones disponibles en el pool'
        });
      }

      // Tomar los primeros 20 (o los que haya disponibles)
      const cardsToAssign = availableCards.slice(0, 20);
      const cardIds = cardsToAssign.map(c => c.id);

      // Reservar los cartones
      const reserved = cardPoolService.reserveCards(sessionId, userId, cardIds);

      if (!reserved) {
        return res.status(400).json({
          success: false,
          message: 'Error al reservar cartones'
        });
      }

      res.json({
        success: true,
        message: `${cardsToAssign.length} cartones asignados automáticamente`,
        cards: cardsToAssign,
        count: cardsToAssign.length
      });
    } catch (error) {
      console.error('❌ Error en auto-asignación:', error);
      res.status(500).json({
        success: false,
        message: 'Error al asignar cartones automáticamente'
      });
    }
  }

  /**
   * Calcula tiempo restante para inicio del sorteo
   */
  calculateTimeRemaining(sessionId) {
    const window = cardPoolService.timeWindows.get(sessionId);
    if (!window) return null;

    const now = Date.now();
    const gameStart = window.gameStartTime.getTime();
    
    if (now >= gameStart) return 0;
    
    return Math.floor((gameStart - now) / 1000); // Segundos
  }

  /**
   * Limpieza periódica de reservas expiradas
   */
  startCleanupJob() {
    setInterval(() => {
      cardPoolService.pools.forEach((pool, sessionId) => {
        cardPoolService.cleanExpiredReservations(sessionId);
      });
    }, 5 * 60 * 1000); // Cada 5 minutos

    console.log('🧹 Job de limpieza de reservas iniciado (cada 5 min)');
  }
}

const starterRoomController = new StarterRoomController();

// Iniciar job de limpieza
starterRoomController.startCleanupJob();

module.exports = starterRoomController;
