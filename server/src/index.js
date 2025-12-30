// Forces restart
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const scheduler = require('./services/scheduler');
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
const winnersPaymentRoutes = require('./routes/winnersPaymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const gameAdminRoutes = require('./routes/gameAdminRoutes');
const starterRoomRoutes = require('./routes/starterRoom');
const giftCardsRoutes = require('./routes/giftCards');
const cardsRoutes = require('./routes/cardsRoutes');
const gameAdminController = require('./controllers/gameAdminController');
const cardPoolService = require('./services/cardPoolService');
const activityHistoryRoutes = require('./routes/activityHistoryRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes'); // Nueva ruta
const db = require('./db');
const fs = require('fs');
const path = require('path');

// CONFIGURACIÓN INICIAL
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// EXPRESS APP
const app = express();

// GLOBAL DEBUG LOGGER
app.get('/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date() });
});

const logFile = path.join(__dirname, '..', 'live_debug.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

app.use((req, res, next) => {
  const logMsg = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}\n`;
  logStream.write(logMsg);
  console.log(logMsg);
  next();
});

app.use(helmet());
app.use(morgan('combined'));

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

// INICIALIZAR WEBSOCKET SERVICE (para pozos en vivo)
websocketService.initialize(io);

// INICIALIZAR MOTOR DE JUEGO AUTOMÁTICO
gameAdminController.initGameEngine(io);

// Almacenar instancia de Socket.IO en app para acceso desde controllers
app.set('io', io);

// También hacer io accesible globalmente para servicios
global.io = io;

const metricsService = require('./services/metricsService'); // Add import

// ...

// SOCKET.IO - Event handlers
const chatEvents = require('./socket/chatEvents'); // Importar lógica de chat

io.on('connection', (socket) => {
  metricsService.increment('activeConnections');
  metricsService.increment('totalConnections');
  console.log(`[Socket.IO] Cliente conectado: ${socket.id}`);

  // Entregar gestión de chat
  chatEvents(io, socket);

  // Handler para unirse a room personal (para actualizaciones de balance en tiempo real)
  socket.on('join_personal_room', ({ userId }) => {
    if (userId) {
      const roomName = `user_${userId}`;
      socket.join(roomName);
      console.log(`[Socket.IO] 📍 Usuario ${userId} unido a room personal: ${roomName}`);
    }
  });

<<<<<<< HEAD
  // Handler para unirse a una sala de juego (DEPRECATED - Usar join_session)
  socket.on('join_game', ({ room }) => {
    if (room) {
      const roomName = `room_${room}`;
      socket.join(roomName);
      console.log(`[Socket.IO] 🎮 Socket ${socket.id} unido a sala de juego: ${roomName}`);
    }
=======
  // Chat en vivo
  socket.on('chat_message', (data) => {
    const { gameSessionId, username, message, timestamp } = data;
    console.log(`[Socket.IO] Chat message from ${username} in session ${gameSessionId}`);

    // Broadcast a todos en la sesión
    io.to(`session_${gameSessionId}`).emit('chat_message', {
      username,
      message,
      timestamp
    });
  });

  // Reacciones emoji
  socket.on('emoji_reaction', (data) => {
    const { gameSessionId, emoji } = data;
    const userData = socket.userData || {};
    console.log(`[Socket.IO] Emoji reaction ${emoji} from ${userData.username} in session ${gameSessionId}`);

    // Broadcast a todos en la sesión
    io.to(`session_${gameSessionId}`).emit('emoji_reaction', {
      emoji,
      username: userData.username || 'Anónimo'
    });
  });

  // Eventos del juego
  socket.on('join_game', (data) => {
    console.log(`[Socket.IO] Join game: ${data.userId} en sala ${data.room}`);
    socket.join(`game_${data.room}`);
>>>>>>> da36289 (feat: implement AI probability prediction, game replay system, and mobile enhancements)
  });

  // NEW: Handler para unirse a una sesión específica (Sincronización v2.0)
  socket.on('join_session', ({ sessionId }) => {
    if (sessionId) {
      const sessionRoom = `session_${sessionId}`;
      socket.join(sessionRoom);
      console.log(`[Socket.IO] 🎲 Socket ${socket.id} unido a sesión: ${sessionRoom}`);

      // Enviar estado actual si el juego está en curso
      if (gameAdminController.gameEngine) {
        const state = gameAdminController.gameEngine.getGameState(sessionId);
        if (state) {
          socket.emit('current_game_state', state);
        }
      }
    }
  });

  // NEW: Handler para unirse a sala global como espectador (Transmisión Pública)
  socket.on('join_room_spectator', ({ room }) => {
    if (room) {
      const globalRoom = `room_${room}`;
      socket.join(globalRoom);
      console.log(`[Socket.IO] 📺 Socket ${socket.id} unido como espectador a: ${globalRoom}`);

      // Enviar estado actual de cualquier sorteo activo en esta sala
      if (gameAdminController.gameEngine) {
        const state = gameAdminController.gameEngine.getRoomGameState(room);
        if (state) {
          socket.emit('current_game_state', state);
        }
      }
    }
  });

  // NEW: Handler para salir de sala global
  socket.on('leave_room_spectator', ({ room }) => {
    if (room) {
      const globalRoom = `room_${room}`;
      socket.leave(globalRoom);
      console.log(`[Socket.IO] 👋 Socket ${socket.id} salió de: ${globalRoom}`);
    }
  });


  socket.on('disconnect', () => {
    metricsService.increment('activeConnections', -1);
    console.log(`[Socket.IO] Cliente desconectado: ${socket.id}`);
  });

  socket.on('error', (error) => {
    console.error(`[Socket.IO] Error: ${error}`);
  });
});

// RUTAS API
console.log('🚀 [Server] Rutas cargadas: ' + new Date().toLocaleTimeString());

// Middleware para debuguear rutas admin
app.use('/api/admin', (req, res, next) => {
  console.log(`📡 [Admin Request] ${req.method} ${req.url}`);
  next();
});

// ADMIN ROUTES (Higher priority to avoid shadowing)
app.use('/api/admin/gift-cards', giftCardsRoutes);
app.use('/api/admin', adminRoutes);

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
app.use('/api/deposits', require('./routes/depositRoutes')); // Nueva ruta de depósitos
app.use('/api/commissions', require('./routes/commissionRoutes')); // Sistema de comisiones
app.use('/api/winners-payment', winnersPaymentRoutes);
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/game-admin', gameAdminRoutes);
app.use('/api/support', require('./routes/supportRoutes'));
app.use('/api/whatsapp', whatsappRoutes); // Montar nuevas rutas

// HEALTH CHECK
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    scheduler: scheduler.getStatus(),
    environment: NODE_ENV
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
    console.log('🎫 Cargando pools de cartones desde BD...');

    // Buscar sesiones recientes de Starter con cartones
    const [sessions] = await db.query(`
      SELECT DISTINCT cp.session_id, COUNT(*) as card_count
      FROM card_pool cp
      INNER JOIN game_sessions gs ON cp.session_id = gs.id
      WHERE gs.room = 'starter'
      AND gs.created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY cp.session_id
      HAVING card_count > 0
      ORDER BY gs.created_at DESC
      LIMIT 5
    `);

    if (sessions.length === 0) {
      console.log('ℹ️  No hay pools para cargar');
      return;
    }

    // Cargar cada pool en memoria
    for (const session of sessions) {
      await cardPoolService.loadPoolFromDB(session.session_id);
      console.log(`✅ Pool cargado: Sesión ${session.session_id} (${session.card_count} cartones)`);
    }

    console.log(`✅ ${sessions.length} pool(s) cargados en memoria\n`);
  } catch (error) {
    console.error('❌ Error cargando pools:', error.message);
    // No fallar el inicio del servidor por esto
  }
}

// MIGRACIÓN AUTOMÁTICA DE BASE DE DATOS (IF NOT EXISTS)
async function updateDatabaseSchema() {
  try {
    const sqlPath = path.join(__dirname, '..', 'ADD_WHATSAPP_CONFIGS.sql');
    if (fs.existsSync(sqlPath)) {
      console.log('🔄 Verificando esquema de base de datos (WhatsApp)...');
      const sql = fs.readFileSync(sqlPath, 'utf8');
      const statements = sql
        .replace(/\r?\n/g, ' ')
        .split(';')
        .filter(st => st.trim().length > 0);

      for (let statement of statements) {
        try {
          await db.query(statement);
        } catch (err) {
          // Ignorar errores de "ya existe" (IF NOT EXISTS maneja tablas, pero no columnas)
          if (err.code !== 'ER_DUP_FIELDNAME' && err.code !== 'ER_TABLE_EXISTS_ERROR') {
            // console.warn(`[Migration] Nota: ${err.message}`);
          }
        }
      }
      console.log('✅ Esquema de WhatsApp verificado.');
    }
  } catch (error) {
    console.error('❌ Error en auto-migración:', error.message);
  }
}

// INICIAR SERVIDOR
const startServer = async () => {
  try {
    // Aplicar actualizaciones de esquema si existen
    await updateDatabaseSchema();

    // Cargar pools de cartones existentes desde BD
    await loadExistingPools();

    // INICIALIZAR CARD POOL MANAGER
    // Verificar y generar cartones iniciales para todas las salas
    console.log('🎫 Inicializando Card Pool Manager...');
    const cardPoolManager = require('./services/cardPoolManager');
    const initResults = await cardPoolManager.initializeAllRooms();
    console.log('✅ Card Pool Manager inicializado:', initResults);
    console.log('');

    // Inicializar motor de juego automático
    const gameAdminController = require('./controllers/gameAdminController');
    gameAdminController.initGameEngine(io);
    console.log('✅ Motor de juego automático inicializado');

    // [NUEVO] Recuperar sesiones interrumpidas y activar Watchdog
    if (gameAdminController.gameEngine) {
      gameAdminController.gameEngine.resumeActiveSessions();
      gameAdminController.gameEngine.startWatchdog();
    }
    console.log('');

    // Inicializar inicio automático de sorteos programados
    const { AutoDrawStarter } = require('./services/sessionScheduler');
    const autoDrawStarter = new AutoDrawStarter(gameAdminController.gameEngine);
    autoDrawStarter.start();
    console.log('✅ Inicio automático de sorteos programados activado');
    console.log('');

    // Iniciar scheduler
    scheduler.start();

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

// Iniciar
startServer();

module.exports = { app, server, io };
