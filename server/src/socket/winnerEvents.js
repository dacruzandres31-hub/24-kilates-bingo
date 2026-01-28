// ============================================
// SOCKET.IO EVENTS - SISTEMA DE PREMIOS
// ============================================

/**
 * Notifica a todos los jugadores que alguien ganó una línea
 * Y envía mensaje especial al ganador
 * 
 * @param {Object} io - Instancia de Socket.IO
 * @param {Number} roomId - ID de la sala
 * @param {Object} winner - { id, username }
 * @param {Number} prizeAmount - Monto del premio
 * @param {String} lineType - Tipo de línea ganada
 * @param {Object} winningCard - Datos del cartón ganador (opcional)
 */
function notifyLineWinner(io, roomId, winner, prizeAmount, lineType, winningCard = null) {
  // Broadcast a TODOS los jugadores de la sala
  io.to(`game_${roomId}`).emit('line_winner', {
    room: roomId,  // CRÍTICO: incluir room para filtro en frontend
    winner: {
      userId: winner.id,
      username: winner.username
    },
    prizeAmount: prizeAmount,
    lineType: lineType,
    winningCard: winningCard, // { numbers: [[...]], winningNumbers: [...] }
    timestamp: new Date()
  });

  // Mensaje ESPECIAL solo para el ganador
  io.to(`user_${winner.id}`).emit('line_won_by_you', {
    prizeAmount: prizeAmount,
    lineType: lineType,
    message: '¡Felicitaciones! Al finalizar el sorteo te pediremos tus datos bancarios para cobrar tu premio.',
    showPaymentFormLater: true,
    timestamp: new Date()
  });

  console.log(`[Socket.IO] Línea ganada: ${winner.username} (${lineType}) - $${prizeAmount}`);
}

/**
 * Notifica que alguien ganó BINGO (fin del juego)
 * 
 * @param {Object} io - Instancia de Socket.IO
 * @param {Number} roomId - ID de la sala
 * @param {Object} winner - { id, username }
 * @param {Number} prizeAmount - Monto del premio
 * @param {Number} gameSessionId - ID de la sesión que finalizó
 */
function notifyBingoWinner(io, roomId, winner, prizeAmount, gameSessionId) {
  // Broadcast a TODOS
  io.to(`game_${roomId}`).emit('bingo_winner', {
    room: roomId,  // CRÍTICO: incluir room para filtro en frontend
    winner: {
      userId: winner.id,
      username: winner.username
    },
    prizeAmount: prizeAmount,
    gameSessionId: gameSessionId,
    gameEnded: true,
    timestamp: new Date()
  });

  // Mensaje especial al ganador de BINGO
  io.to(`user_${winner.id}`).emit('bingo_won_by_you', {
    prizeAmount: prizeAmount,
    gameSessionId: gameSessionId,
    message: '¡BINGO! Al finalizar el sorteo te pediremos tus datos bancarios para cobrar TODOS tus premios.',
    showPaymentFormSoon: true,
    timestamp: new Date()
  });

  // Notificar fin de juego a toda la sala
  io.to(`game_${roomId}`).emit('game_ended', {
    gameSessionId: gameSessionId,
    winner: winner.username,
    timestamp: new Date()
  });

  console.log(`[Socket.IO] BINGO ganado: ${winner.username} - $${prizeAmount}`);
}

/**
 * Muestra formulario de pago a TODOS los ganadores de la sesión
 * (Solo después de que el juego haya terminado)
 * 
 * @param {Object} io - Instancia de Socket.IO
 * @param {Number} gameSessionId - ID de la sesión finalizada
 * @param {Array} winners - Array de { userId, username, prizes: [{ type, amount }] }
 */
async function showPaymentForms(io, gameSessionId, winners) {
  console.log(`[Socket.IO] Mostrando formularios de pago a ${winners.length} ganadores`);

  for (const winner of winners) {
    const totalAmount = winner.prizes.reduce((sum, prize) => sum + prize.amount, 0);

    // Emitir evento a cada ganador
    io.to(`user_${winner.userId}`).emit('show_payment_form', {
      gameSessionId: gameSessionId,
      prizes: winner.prizes, // [{ type: 'linea', amount: 2500 }, { type: 'bingo', amount: 25000 }]
      totalAmount: totalAmount,
      message: 'Completa tus datos bancarios para recibir tu premio',
      timestamp: new Date()
    });

    console.log(`[Socket.IO] Formulario enviado a ${winner.username} - Total: $${totalAmount}`);
  }
}

/**
 * Confirma que el jugador envió sus datos de pago
 * 
 * @param {Object} io - Instancia de Socket.IO
 * @param {Number} userId - ID del usuario
 * @param {Number} paymentInfoId - ID del registro en winner_payment_info
 */
function confirmPaymentDataSubmitted(io, userId, paymentInfoId) {
  io.to(`user_${userId}`).emit('payment_data_confirmed', {
    paymentInfoId: paymentInfoId,
    message: '¡Datos recibidos! Procesaremos tu pago y te enviaremos el comprobante por WhatsApp.',
    timestamp: new Date()
  });

  console.log(`[Socket.IO] Datos de pago confirmados para usuario ${userId}`);
}

/**
 * Notifica al jugador que su pago fue procesado
 * 
 * @param {Object} io - Instancia de Socket.IO
 * @param {Number} userId - ID del usuario
 * @param {Number} amount - Monto pagado
 * @param {String} receipt - URL del comprobante
 */
function notifyPaymentCompleted(io, userId, amount, receipt) {
  io.to(`user_${userId}`).emit('payment_completed', {
    amount: amount,
    receipt: receipt,
    message: `¡Pago de $${amount.toLocaleString()} completado! Comprobante enviado por WhatsApp.`,
    timestamp: new Date()
  });

  console.log(`[Socket.IO] Pago completado notificado a usuario ${userId} - $${amount}`);
}

/**
 * Envía recordatorio a ganadores que no han completado datos
 * 
 * @param {Object} io - Instancia de Socket.IO
 * @param {Number} userId - ID del usuario
 * @param {Number} pendingAmount - Monto pendiente
 */
function sendPaymentReminder(io, userId, pendingAmount) {
  io.to(`user_${userId}`).emit('payment_reminder', {
    pendingAmount: pendingAmount,
    hasPendingPayments: true,
    message: `Tienes $${pendingAmount.toLocaleString()} pendientes de cobro. Completa tus datos bancarios.`,
    timestamp: new Date()
  });

  console.log(`[Socket.IO] Recordatorio enviado a usuario ${userId} - $${pendingAmount}`);
}

module.exports = {
  notifyLineWinner,
  notifyBingoWinner,
  showPaymentForms,
  confirmPaymentDataSubmitted,
  notifyPaymentCompleted,
  sendPaymentReminder
};
