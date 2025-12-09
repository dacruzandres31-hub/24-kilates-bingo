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
