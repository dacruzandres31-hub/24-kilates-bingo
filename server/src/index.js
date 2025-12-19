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
const db = require('./db');

// CONFIGURACIÓN INICIAL
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// EXPRESS APP
const app = express();

// MIDDLEWARE SEGURIDAD
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

  // Eventos del juego
  socket.on('join_game', (data) => {
    console.log(`[Socket.IO] Join game: ${data.userId} en sala ${data.room}`);
    socket.join(`game_${data.room}`);
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
app.use('/api/cards', cardsRoutes); // Pool de cartones
app.use('/api/game/starter', starterRoomRoutes); // DEBE IR ANTES de /api/game
app.use('/api/game', gameRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/chips', chipsRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/commissions', require('./routes/commissionRoutes')); // Sistema de comisiones
app.use('/api/winners-payment', winnersPaymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/gift-cards', giftCardsRoutes);
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/game-admin', gameAdminRoutes);

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

// INICIAR SERVIDOR
const startServer = async () => {
  try {
    // Cargar pools de cartones existentes desde BD
    await loadExistingPools();

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
