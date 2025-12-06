const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const scheduler = require('./services/scheduler');
const notificationService = require('./services/notificationService');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const gameRoutes = require('./routes/gameRoutes');
const financeRoutes = require('./routes/financeRoutes');
const gamificationRoutes = require('./routes/gamificationRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const shopRoutes = require('./routes/shopRoutes');
const chipsRoutes = require('./routes/chipsRoutes');
const withdrawalRoutes = require('./routes/withdrawalRoutes');
const adminRoutes = require('./routes/adminRoutes');

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

// Almacenar instancia de Socket.IO en app para acceso desde controllers
app.set('io', io);

// SOCKET.IO - Event handlers
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Cliente conectado: ${socket.id}`);

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
app.use('/api/game', gameRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/chips', chipsRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/admin', adminRoutes);

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

// INICIAR SERVIDOR
const startServer = async () => {
  try {
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

// GRACEFUL SHUTDOWN
process.on('SIGTERM', () => {
  console.log('📛 SIGTERM recibido, apagando servidor...');
  scheduler.stop();
  server.close(() => {
    console.log('✅ Servidor apagado correctamente');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📛 SIGINT recibido, apagando servidor...');
  scheduler.stop();
  server.close(() => {
    console.log('✅ Servidor apagado correctamente');
    process.exit(0);
  });
});

// UNCAUGHT EXCEPTIONS
process.on('uncaughtException', (error) => {
  console.error('❌ Excepción no capturada:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada:', reason);
  process.exit(1);
});

// Iniciar
startServer();

module.exports = { app, server, io };
