// ============================================
// SOCKET.IO EVENTS - WINNER NOTIFICATIONS
// ============================================
// Este archivo debe integrarse en server/src/socket/gameSocket.js

/**
 * EVENTO 1: Cuando un jugador gana una LÍNEA
 * Se emite cuando el backend valida exitosamente una línea
 */
function notifyLineWinner(io, roomId, winner, prizeAmount, lineType) {
  // Notificar a TODOS los jugadores en la sala
  io.to(roomId).emit('line_winner', {
    winner: {
      userId: winner.id,
      username: winner.username
    },
    prizeAmount: prizeAmount,
    lineType: lineType, // 'horizontal', 'vertical', 'diagonal'
    timestamp: new Date().toISOString()
  });

  // Notificación especial para el ganador
  io.to(`user_${winner.id}`).emit('line_won_by_you', {
    prizeAmount: prizeAmount,
    lineType: lineType,
    message: '¡Felicitaciones! Ganaste la línea. Al finalizar el sorteo te pediremos datos para cobrar tu premio.',
    showPaymentFormLater: true
  });

  console.log(`[WINNER] ${winner.username} ganó línea en sala ${roomId} - $${prizeAmount}`);
}

/**
 * EVENTO 2: Cuando un jugador gana BINGO (fin del sorteo)
 * Se emite cuando el backend valida exitosamente un bingo completo
 */
function notifyBingoWinner(io, roomId, winner, prizeAmount, gameSessionId) {
  // Notificar a TODOS los jugadores en la sala
  io.to(roomId).emit('bingo_winner', {
    winner: {
      userId: winner.id,
      username: winner.username
    },
    prizeAmount: prizeAmount,
    gameEnded: true,
    gameSessionId: gameSessionId,
    timestamp: new Date().toISOString()
  });

  // Notificación especial para el ganador del bingo
  io.to(`user_${winner.id}`).emit('bingo_won_by_you', {
    prizeAmount: prizeAmount,
    message: '¡BINGO! ¡Felicitaciones, ganaste el premio mayor!',
    gameSessionId: gameSessionId,
    showPaymentFormSoon: true
  });

  console.log(`[BINGO WINNER] ${winner.username} ganó bingo en sala ${roomId} - $${prizeAmount}`);
}

/**
 * EVENTO 3: Mostrar formulario de pago a ganadores
 * Se emite DESPUÉS de finalizar el sorteo, a cada ganador
 */
async function showPaymentForms(io, gameSessionId, winners) {
  // winners es un array de objetos: [{ userId, prizes: [{ type, amount }] }]
  
  for (const winner of winners) {
    const totalAmount = winner.prizes.reduce((sum, p) => sum + p.amount, 0);
    
    // Enviar evento solo al ganador específico
    io.to(`user_${winner.userId}`).emit('show_payment_form', {
      gameSessionId: gameSessionId,
      prizes: winner.prizes,
      totalAmount: totalAmount,
      message: 'Por favor completa tus datos bancarios para recibir tu premio',
      required: true // El formulario es obligatorio para salas monetizadas
    });

    console.log(`[PAYMENT FORM] Enviando formulario a user ${winner.userId} - Total: $${totalAmount}`);
  }
}

/**
 * EVENTO 4: Confirmación de datos enviados
 * Se emite cuando el jugador completa exitosamente el formulario
 */
function confirmPaymentDataSubmitted(io, userId, paymentInfoId) {
  io.to(`user_${userId}`).emit('payment_data_confirmed', {
    paymentInfoId: paymentInfoId,
    message: '¡Datos recibidos! Procesaremos tu pago y enviaremos el comprobante por WhatsApp.',
    status: 'pending'
  });

  console.log(`[PAYMENT DATA] Usuario ${userId} completó datos de pago (ID: ${paymentInfoId})`);
}

/**
 * EVENTO 5: Notificar cuando el pago fue procesado
 * Se emite cuando admin/cajero marca el pago como completado
 */
function notifyPaymentCompleted(io, userId, amount, receipt) {
  io.to(`user_${userId}`).emit('payment_completed', {
    amount: amount,
    receipt: receipt,
    message: '¡Tu premio fue transferido! Revisa tu WhatsApp para ver el comprobante.',
    status: 'completed',
    timestamp: new Date().toISOString()
  });

  console.log(`[PAYMENT COMPLETED] Pago de $${amount} procesado para user ${userId}`);
}

/**
 * INTEGRACIÓN CON EL FLUJO DE JUEGO EXISTENTE
 */

// En gameController.js o donde se valide la línea:
exports.claimLine = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { gameSessionId, cardId, lineType } = req.body;

    // ... validación de línea ...

    if (isValidLine) {
      const room = await getRoomInfo(gameSessionId);
      const winner = await getUserInfo(userId);
      
      // Determinar premio según sala
      const prizeAmount = room.linePrize; // ej: 5000 para sala Oro
      
      // Registrar ganador en base de datos
      await saveLineWinner(gameSessionId, userId, prizeAmount, lineType);
      
      // EMITIR EVENTOS SOCKET.IO
      const io = req.app.get('io'); // Obtener instancia de Socket.IO
      notifyLineWinner(io, room.id, winner, prizeAmount, lineType);
      
      return res.json({ success: true, message: 'Línea válida', prize: prizeAmount });
    }
  } catch (error) {
    console.error('Error en claimLine:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// En gameController.js o donde se valide el bingo:
exports.claimBingo = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { gameSessionId, cardId } = req.body;

    // ... validación de bingo ...

    if (isValidBingo) {
      const room = await getRoomInfo(gameSessionId);
      const winner = await getUserInfo(userId);
      
      // Determinar premio según sala
      const prizeAmount = room.bingoPrize; // ej: 50000 para sala Oro
      
      // Registrar ganador en base de datos
      await saveBingoWinner(gameSessionId, userId, prizeAmount);
      
      // EMITIR EVENTO DE BINGO
      const io = req.app.get('io');
      notifyBingoWinner(io, room.id, winner, prizeAmount, gameSessionId);
      
      // Marcar juego como finalizado
      await endGame(gameSessionId);
      
      // DESPUÉS DE 5 SEGUNDOS, MOSTRAR FORMULARIOS A GANADORES
      setTimeout(async () => {
        const winners = await getGameWinners(gameSessionId);
        // winners: [{ userId: 123, prizes: [{ type: 'linea', amount: 5000 }, { type: 'bingo', amount: 50000 }] }]
        await showPaymentForms(io, gameSessionId, winners);
      }, 5000);
      
      return res.json({ success: true, message: 'BINGO!', prize: prizeAmount });
    }
  } catch (error) {
    console.error('Error en claimBingo:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * FUNCIONES AUXILIARES A IMPLEMENTAR
 */

// Obtener todos los ganadores de un sorteo
async function getGameWinners(gameSessionId) {
  const pool = require('../db');
  
  const [winners] = await pool.query(`
    SELECT 
      user_id,
      prize_type,
      prize_amount
    FROM game_winners
    WHERE game_session_id = ?
    ORDER BY user_id, created_at
  `, [gameSessionId]);
  
  // Agrupar premios por usuario
  const grouped = {};
  winners.forEach(w => {
    if (!grouped[w.user_id]) {
      grouped[w.user_id] = { userId: w.user_id, prizes: [] };
    }
    grouped[w.user_id].prizes.push({
      type: w.prize_type,
      amount: parseFloat(w.prize_amount)
    });
  });
  
  return Object.values(grouped);
}

// Verificar si una sala es monetizada
function isMonetizedRoom(roomType) {
  return ['bronze', 'silver', 'gold', 'bronce', 'plata', 'oro'].includes(roomType.toLowerCase());
}

/**
 * CONEXIÓN DE USUARIOS A SUS ROOMS PERSONALES
 * Agregar esto en el handler de conexión Socket.IO
 */
io.on('connection', (socket) => {
  const userId = socket.handshake.auth.userId;
  
  if (userId) {
    // Unir al usuario a su room personal para notificaciones directas
    socket.join(`user_${userId}`);
    console.log(`[SOCKET] Usuario ${userId} conectado y unido a room personal`);
  }
  
  // ... resto del código de conexión ...
});

/**
 * EXPORTAR FUNCIONES
 */
module.exports = {
  notifyLineWinner,
  notifyBingoWinner,
  showPaymentForms,
  confirmPaymentDataSubmitted,
  notifyPaymentCompleted,
  getGameWinners,
  isMonetizedRoom
};
