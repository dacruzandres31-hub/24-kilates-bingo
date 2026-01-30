const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const scheduler = require('./services/scheduler');
const sessionWatchdog = require('./services/sessionWatchdog'); // 🛡️ WATCHDOG
const notificationService = require('./services/notificationService');
const websocketService = require('./services/websocketService');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const gameRoutes = require('./routes/gameRoutes');
const financeRoutes = require('./routes/financeRoutes');
const gamificationRoutes = require('./routes/gamificationRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const shopRoutes = require('./routes/shopRoutes');
const chipsRoutes = require('./routes/chipsRoutes');
const withdrawalRoutes = require('./routes/withdrawalRoutes');
const depositRoutes = require('./routes/depositRoutes');
const winnersPaymentRoutes = require('./routes/winnersPaymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const gameAdminRoutes = require('./routes/gameAdminRoutes');
const starterRoomRoutes = require('./routes/starterRoom');
const giftCardsRoutes = require('./routes/giftCards');
const cardsRoutes = require('./routes/cardsRoutes');
const membershipRoutes = require('./routes/membershipRoutes');
const referralRoutes = require('./routes/referralRoutes');
const gameAdminController = require('./controllers/gameAdminController');
const cardPoolService = require('./services/cardPoolService');
const db = require('./db');

// CONFIGURACIÓN INICIAL
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// EXPRESS APP
const app = express();

// MIDDLEWARE SEGURIDAD
app.use(helmet());

// Morgan logger - excluir webhook de WhatsApp para evitar spam
app.use(morgan('combined', {
  skip: (req) => req.url === '/api/webhook/whatsapp'
}));

// CORS
const corsOptions = {
  origin: [
    'http://localhost:5173',  // Player dev
    'http://localhost:5174',  // Admin dev
    process.env.CORS_ORIGIN_PLAYER,
    process.env.CORS_ORIGIN_ADMIN
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// BODY PARSER
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// SOCKET.IO
const server = http.createServer(app);
const io = socketIo(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling']
});

// INICIALIZAR NOTIFICATION SERVICE
notificationService.initialize(io);

// INICIALIZAR PERSISTENT NOTIFICATIONS SERVICE (Campana tipo WhatsApp)
const persistentNotifications = require('./services/persistentNotifications');
persistentNotifications.initialize(io);

// INICIALIZAR WEBSOCKET SERVICE (para pozos en vivo)
websocketService.initialize(io);

// INICIALIZAR MOTOR DE JUEGO AUTOMÁTICO
gameAdminController.initGameEngine(io);

// Almacenar instancia de Socket.IO en app para acceso desde controllers
app.set('io', io);

// SOCKET.IO - Event handlers
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Cliente conectado: ${socket.id}`);

  // Join a room personal del usuario
  socket.on('join_personal_room', (data) => {
    const { userId } = data;
    if (userId) {
      socket.join(`user_${userId}`);
      console.log(`[Socket.IO] Usuario ${userId} joined personal room: user_${userId}`);
    }
  });

  // Heartbeat para detectar conexiones zombie
  socket.on('ping_heartbeat', (data) => {
    socket.emit('pong_heartbeat', {
      timestamp: Date.now(),
      clientTimestamp: data?.timestamp
    });
  });

  // Eventos del juego
  socket.on('join_game', (data) => {
    const roomName = `game_${data.room}`;
    socket.join(roomName);
    const roomSockets = io.sockets.adapter.rooms.get(roomName);
    const clientsCount = roomSockets ? roomSockets.size : 0;
    console.log(`[Socket.IO] 🎮 Join game: socket ${socket.id} unido a ${roomName} (${clientsCount} clientes en sala)`);
  });

  socket.on('number_drawn', (data) => {
    console.log(`[Socket.IO] Número sorteado: ${data.number}`);
    io.to(`game_${data.room}`).emit('number_drawn', data);
  });

  socket.on('winner_detected', (data) => {
    console.log(`[Socket.IO] Ganador detectado: ${data.userId}`);
    io.to(`game_${data.room}`).emit('winner_detected', data);
  });

  socket.on('pot_update', (data) => {
    console.log(`[Socket.IO] Actualización de pots`);
    io.emit('pot_update', data);
  });

  socket.on('cascade_transfer', (data) => {
    console.log(`[Socket.IO] Cascada de jackpot transferida`);
    io.emit('cascade_transfer', data);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Cliente desconectado: ${socket.id}`);
  });

  socket.on('error', (error) => {
    console.error(`[Socket.IO] Error: ${error}`);
  });
});

// RUTAS API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/activity-history', require('./routes/activityHistoryRoutes')); // Historial del jugador
app.use('/api/cards', cardsRoutes); // Pool de cartones
app.use('/api/game/starter', starterRoomRoutes); // DEBE IR ANTES de /api/game
app.use('/api/game', gameRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/chips', chipsRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/deposits', depositRoutes);
app.use('/api/commissions', require('./routes/commissionRoutes')); // Sistema de comisiones
app.use('/api/support', require('./routes/supportRoutes')); // Soporte técnico
app.use('/api/winners-payment', winnersPaymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/gift-cards', giftCardsRoutes);
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/game-admin', gameAdminRoutes);
app.use('/api/whatsapp', require('./routes/whatsapp24KRoutes')); // WhatsApp 24K Premium
app.use('/api/notifications', require('./routes/notifications')); // Notificaciones persistentes
app.use('/api/memberships', membershipRoutes); // Sistema de membresías Club VIP
app.use('/api/referrals', referralRoutes); // Sistema de referidos

// WEBHOOK de WhatsApp Evolution API - Silenciar spam (responde 200 sin logging)
app.post('/api/webhook/whatsapp', (req, res) => res.sendStatus(200));

// HEALTH CHECK
app.get('/health', async (req, res) => {
  try {
    // Obtener reporte del watchdog
    const watchdogReport = await sessionWatchdog.getHealthReport();

    res.json({
      status: 'ok',
      timestamp: new Date(),
      scheduler: scheduler.getStatus(),
      watchdog: watchdogReport,
      environment: NODE_ENV
    });
  } catch (error) {
    res.json({
      status: 'degraded',
      timestamp: new Date(),
      scheduler: scheduler.getStatus(),
      watchdog: { error: error.message },
      environment: NODE_ENV
    });
  }
});

// WATCHDOG INCIDENTS - Ver incidentes recientes (para debugging)
app.get('/health/incidents', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  res.json({
    incidents: sessionWatchdog.getRecentIncidents(limit),
    total: sessionWatchdog.incidents?.length || 0
  });
});

// ERROR HANDLER
app.use((err, req, res, next) => {
  console.error('[Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor'
  });
});

// 404 HANDLER
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

// CARGAR POOLS EXISTENTES AL INICIAR
async function loadExistingPools() {
  try {
    console.log('🎫 Verificando pools de cartones...');

    // Verificar que hay cartones disponibles en el pool
    const [countResult] = await db.query(`
      SELECT room, COUNT(*) as card_count
      FROM bingo_cards_pool
      WHERE status = 'available'
      GROUP BY room
    `);

    if (countResult.length === 0) {
      console.log('ℹ️  No hay cartones en el pool - se generarán al iniciar sorteos');
      return;
    }

    // Mostrar estado de cada sala
    for (const row of countResult) {
      console.log(`   📦 ${row.room}: ${row.card_count} cartones disponibles`);
    }

    console.log(`✅ Pools verificados\n`);
  } catch (error) {
    console.error('❌ Error verificando pools:', error.message);
    // No fallar el inicio del servidor por esto
  }
}

// INICIAR SERVIDOR
const startServer = async () => {
  try {
    // Cargar pools de cartones existentes desde BD
    await loadExistingPools();

    // INICIALIZAR CARD POOL MANAGER
    // Verificar y generar cartones iniciales para todas las salas
    console.log('🎫 Inicializando Card Pool Manager...');
    const cardPoolManager = require('./services/cardPoolManager');
    const initResults = await cardPoolManager.initializeAllRooms();
    console.log('✅ Card Pool Manager inicializado:', initResults);
    console.log('');

    // Inicializar WhatsApp 24K Service
    console.log('📱 Inicializando WhatsApp 24K Service...');
    const whatsapp24KService = require('./services/whatsapp24KService');
    await whatsapp24KService.initialize();
    console.log('');

    // Iniciar scheduler
    scheduler.start();

    // Inyectar gameEngine al scheduler para auto-start de sorteos
    if (gameAdminController.gameEngine) {
      scheduler.setGameEngine(gameAdminController.gameEngine);

      // 🛡️ INICIAR SESSION WATCHDOG - Sistema de vigilancia y auto-recuperación
      console.log('🛡️ Inicializando Session Watchdog...');
      sessionWatchdog.initialize(io, gameAdminController.gameEngine);
      sessionWatchdog.start();
      console.log('✅ Session Watchdog activo - Monitoreo continuo habilitado');
      console.log('');
    } else {
      console.warn('[Index] ⚠️ GameEngine no disponible para scheduler/watchdog');
    }

    // Iniciar servidor HTTP
    server.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║   🎰 BINGO 24K - SERVIDOR INICIADO    ║
╚════════════════════════════════════════╝
`);
      console.log(`📍 Ambiente: ${NODE_ENV}`);
      console.log(`🚀 Puerto: ${PORT}`);
      console.log(`🔗 URL: http://localhost:${PORT}`);
      console.log(`📊 Health: http://localhost:${PORT}/health`);
      console.log(`🔌 Socket.IO: Conectado`);
      console.log(`⏰ Scheduler: ${scheduler.getStatus().activeJobs} jobs activos`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
};

// GRACEFUL SHUTDOWN - Solo para Ctrl+C manual del usuario
let isShuttingDown = false;

process.on('SIGTERM', async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('\n📛 SIGTERM recibido, apagando servidor...');

  try {
    sessionWatchdog.stop(); // 🛡️ Detener watchdog
    await scheduler.stop();
    server.close(() => {
      console.log('✅ Servidor apagado correctamente');
      process.exit(0);
    });

    // Forzar salida después de 10 segundos
    setTimeout(() => {
      console.log('⏱️ Tiempo agotado, forzando salida...');
      process.exit(0);
    }, 10000);
  } catch (error) {
    console.error('❌ Error en shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('\n📛 SIGINT recibido (Ctrl+C), apagando servidor...');

  try {
    sessionWatchdog.stop(); // 🛡️ Detener watchdog
    await scheduler.stop();
    server.close(() => {
      console.log('✅ Servidor apagado correctamente');
      process.exit(0);
    });

    // Forzar salida después de 10 segundos
    setTimeout(() => {
      console.log('⏱️ Tiempo agotado, forzando salida...');
      process.exit(0);
    }, 10000);
  } catch (error) {
    console.error('❌ Error en shutdown:', error);
    process.exit(1);
  }
});

// UNCAUGHT EXCEPTIONS - Solo loguear, NO cerrar servidor
process.on('uncaughtException', (error) => {
  console.error('❌ Excepción no capturada:', error);
  console.error('   Stack:', error.stack);
  // NO llamar process.exit() - dejar que el servidor continúe
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada:', reason);
  console.error('   Promise:', promise);
  // NO llamar process.exit() - dejar que el servidor continúe
});

// Iniciar solo si se ejecuta directamente (no cuando se importa para tests)
if (require.main === module) {
  startServer();
}

module.exports = { app, server, io, startServer };
