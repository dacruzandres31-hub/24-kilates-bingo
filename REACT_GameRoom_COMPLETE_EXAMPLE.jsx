// ============================================
// INTEGRACIÓN COMPLETA: GAME ROOM CON SISTEMA DE PREMIOS
// ============================================
// Ubicación: client-player/src/pages/GameRoom.jsx

import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { WinnerNotificationSystem } from '../components/WinnerNotifications';
import PaymentFormModal from '../components/PaymentFormModal';

/**
 * Componente principal de sala de juego
 * Maneja Socket.IO y sistema completo de premios
 */
const GameRoom = ({ roomId, user }) => {
  // Estado de Socket.IO
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Estado del juego
  const [gameSession, setGameSession] = useState(null);
  const [currentBall, setCurrentBall] = useState(null);
  const [calledNumbers, setCalledNumbers] = useState([]);
  const [myCards, setMyCards] = useState([]);

  // Estado de premios
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState(null);
  const [myPrizes, setMyPrizes] = useState([]);

  // ============================================
  // CONEXIÓN SOCKET.IO
  // ============================================
  useEffect(() => {
    // Crear conexión
    const newSocket = io('http://localhost:3001', {
      auth: {
        token: localStorage.getItem('token')
      }
    });

    // Evento: Conexión exitosa
    newSocket.on('connect', () => {
      console.log('✅ Conectado a Socket.IO');
      setIsConnected(true);
      
      // Unirse a la sala
      newSocket.emit('join_room', { roomId, userId: user.id });
    });

    // Evento: Desconexión
    newSocket.on('disconnect', () => {
      console.log('❌ Desconectado de Socket.IO');
      setIsConnected(false);
    });

    setSocket(newSocket);

    // Cleanup
    return () => {
      newSocket.disconnect();
    };
  }, [roomId, user.id]);

  // ============================================
  // EVENTOS DE JUEGO
  // ============================================
  useEffect(() => {
    if (!socket) return;

    // Juego iniciado
    socket.on('game_started', (data) => {
      console.log('Juego iniciado:', data);
      setGameSession(data);
      setCalledNumbers([]);
    });

    // Nueva bola extraída
    socket.on('ball_drawn', (data) => {
      console.log('Bola:', data.ball);
      setCurrentBall(data.ball);
      setCalledNumbers(prev => [...prev, data.ball]);
    });

    // Juego finalizado
    socket.on('game_ended', (data) => {
      console.log('Juego finalizado:', data);
      // Aquí podrías mostrar resumen del juego
    });

    return () => {
      socket.off('game_started');
      socket.off('ball_drawn');
      socket.off('game_ended');
    };
  }, [socket]);

  // ============================================
  // EVENTOS DE PREMIOS (CRÍTICO)
  // ============================================
  useEffect(() => {
    if (!socket) return;

    // 🎯 EVENTO: Mostrar formulario de pago (después del juego)
    socket.on('show_payment_form', (data) => {
      console.log('📝 Mostrar formulario de pago:', data);
      
      // Guardar datos del formulario
      setPaymentFormData({
        gameSessionId: data.gameSessionId,
        prizes: data.prizes,
        totalAmount: data.totalAmount
      });

      // Mostrar formulario después de 1 segundo (efecto dramático)
      setTimeout(() => {
        setShowPaymentForm(true);
      }, 1000);
    });

    // 🎉 EVENTO: Pago completado (admin procesó el pago)
    socket.on('payment_completed', (data) => {
      console.log('✅ Pago completado:', data);
      
      // Mostrar notificación de éxito
      alert(`¡Pago recibido! $${data.amount.toLocaleString()}\nComprobante: ${data.receipt}`);
    });

    // 📱 EVENTO: Recordatorio de completar datos
    socket.on('payment_reminder', (data) => {
      console.log('⏰ Recordatorio de pago:', data);
      
      // Mostrar notificación si aún no completó datos
      if (!showPaymentForm && data.hasPendingPayments) {
        const shouldShow = window.confirm(
          'Tienes premios pendientes de cobro. ¿Quieres completar tus datos ahora?'
        );
        
        if (shouldShow) {
          setShowPaymentForm(true);
        }
      }
    });

    return () => {
      socket.off('show_payment_form');
      socket.off('payment_completed');
      socket.off('payment_reminder');
    };
  }, [socket, showPaymentForm]);

  // ============================================
  // FUNCIONES DE JUEGO
  // ============================================

  // Cantar línea
  const claimLine = async (cardId, lineType) => {
    try {
      const response = await fetch('/api/game/claim-line', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          gameSessionId: gameSession.id,
          cardId,
          lineType // 'horizontal', 'vertical', 'diagonal'
        })
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Línea válida:', data);
        // Socket.IO enviará notificaciones automáticamente
      } else {
        alert('Línea inválida: ' + data.message);
      }
    } catch (error) {
      console.error('Error cantando línea:', error);
      alert('Error al cantar línea');
    }
  };

  // Cantar BINGO
  const claimBingo = async (cardId) => {
    try {
      const response = await fetch('/api/game/claim-bingo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          gameSessionId: gameSession.id,
          cardId
        })
      });

      const data = await response.json();

      if (data.success) {
        console.log('🎯 BINGO válido:', data);
        // Socket.IO enviará notificaciones y formulario automáticamente
      } else {
        alert('BINGO inválido: ' + data.message);
      }
    } catch (error) {
      console.error('Error cantando BINGO:', error);
      alert('Error al cantar BINGO');
    }
  };

  // ============================================
  // HANDLERS DE FORMULARIO
  // ============================================

  const handlePaymentFormClose = () => {
    setShowPaymentForm(false);
  };

  const handlePaymentFormSubmit = () => {
    console.log('✅ Datos de pago enviados');
    setShowPaymentForm(false);
    
    // Mostrar confirmación
    alert('¡Datos enviados correctamente!\n\nProcesaremos tu pago y enviaremos el comprobante por WhatsApp.');
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="game-room-container">
      {/* Header de sala */}
      <div className="game-header">
        <h1>Sala: {roomId}</h1>
        <div className="connection-status">
          {isConnected ? (
            <span className="status-online">🟢 Conectado</span>
          ) : (
            <span className="status-offline">🔴 Desconectado</span>
          )}
        </div>
      </div>

      {/* Información del juego */}
      {gameSession && (
        <div className="game-info">
          <div className="info-item">
            <span className="info-label">Sesión:</span>
            <span className="info-value">#{gameSession.id}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Premio Línea:</span>
            <span className="info-value prize">${gameSession.linePrize?.toLocaleString()}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Premio BINGO:</span>
            <span className="info-value prize">${gameSession.bingoPrize?.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Bola actual */}
      {currentBall && (
        <div className="current-ball-display">
          <div className="ball-animation">
            <div className="ball">{currentBall}</div>
          </div>
          <p className="ball-label">Última bola</p>
        </div>
      )}

      {/* Números cantados */}
      <div className="called-numbers-board">
        <h3>Números cantados ({calledNumbers.length})</h3>
        <div className="numbers-grid">
          {Array.from({ length: 75 }, (_, i) => i + 1).map(num => (
            <div
              key={num}
              className={`number-cell ${calledNumbers.includes(num) ? 'called' : ''}`}
            >
              {num}
            </div>
          ))}
        </div>
      </div>

      {/* Mis cartones (ejemplo simple) */}
      <div className="my-cards-section">
        <h3>Mis cartones</h3>
        {myCards.length > 0 ? (
          <div className="cards-grid">
            {myCards.map(card => (
              <div key={card.id} className="bingo-card">
                {/* Aquí renderizarías el cartón completo */}
                <p>Cartón #{card.id}</p>
                <button onClick={() => claimLine(card.id, 'horizontal')}>
                  Cantar Línea
                </button>
                <button onClick={() => claimBingo(card.id)}>
                  Cantar BINGO
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-cards">No tienes cartones en esta sala</p>
        )}
      </div>

      {/* Sistema de notificaciones de ganadores */}
      <WinnerNotificationSystem socket={socket} userId={user.id} />

      {/* Formulario de pago (aparece al finalizar el juego) */}
      {showPaymentForm && paymentFormData && (
        <PaymentFormModal
          isOpen={showPaymentForm}
          onClose={handlePaymentFormClose}
          gameSessionId={paymentFormData.gameSessionId}
          prizes={paymentFormData.prizes}
          totalAmount={paymentFormData.totalAmount}
        />
      )}
    </div>
  );
};

export default GameRoom;

/**
 * ============================================
 * ESTILOS CSS SUGERIDOS (game-room.css)
 * ============================================
 */
const styles = `
.game-room-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
  padding: 20px;
  color: white;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  margin-bottom: 30px;
}

.connection-status {
  font-size: 16px;
  font-weight: 600;
}

.status-online {
  color: #4caf50;
}

.status-offline {
  color: #f44336;
}

.game-info {
  display: flex;
  gap: 20px;
  justify-content: space-around;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 15px;
  margin-bottom: 30px;
}

.info-item {
  text-align: center;
}

.info-label {
  display: block;
  font-size: 14px;
  opacity: 0.7;
  margin-bottom: 5px;
}

.info-value {
  display: block;
  font-size: 24px;
  font-weight: bold;
}

.info-value.prize {
  color: #ffd700;
}

.current-ball-display {
  text-align: center;
  margin: 40px 0;
}

.ball-animation {
  display: inline-block;
  animation: bounce 1s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-20px);
  }
}

.ball {
  width: 120px;
  height: 120px;
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: bold;
  color: #1a1a2e;
  box-shadow: 0 10px 30px rgba(255, 215, 0, 0.5);
  margin: 0 auto;
}

.ball-label {
  margin-top: 20px;
  font-size: 18px;
  opacity: 0.8;
}

.called-numbers-board {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 15px;
  padding: 20px;
  margin-bottom: 30px;
}

.numbers-grid {
  display: grid;
  grid-template-columns: repeat(15, 1fr);
  gap: 5px;
  margin-top: 15px;
}

.number-cell {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.3s;
}

.number-cell.called {
  background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
  transform: scale(1.1);
  box-shadow: 0 2px 10px rgba(76, 175, 80, 0.5);
}

.my-cards-section {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 15px;
  padding: 20px;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.bingo-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 15px;
  padding: 20px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
}

.bingo-card button {
  width: 100%;
  padding: 10px;
  margin-top: 10px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}

.bingo-card button:hover {
  transform: translateY(-2px);
}

.no-cards {
  text-align: center;
  padding: 40px;
  opacity: 0.6;
}

@media (max-width: 768px) {
  .game-info {
    flex-direction: column;
    gap: 15px;
  }

  .numbers-grid {
    grid-template-columns: repeat(10, 1fr);
  }

  .cards-grid {
    grid-template-columns: 1fr;
  }
}
`;

/**
 * ============================================
 * RESUMEN DEL FLUJO COMPLETO
 * ============================================
 * 
 * 1. INICIO DEL JUEGO
 *    - Socket.IO emite 'game_started'
 *    - Frontend muestra información de premios
 * 
 * 2. DURANTE EL JUEGO
 *    - Socket.IO emite 'ball_drawn' cada vez que sale una bola
 *    - Frontend marca números en cartones
 * 
 * 3. ALGUIEN CANTA LÍNEA
 *    - Player hace POST /api/game/claim-line
 *    - Backend valida y emite eventos:
 *      * 'line_winner' (a todos)
 *      * 'line_won_by_you' (solo al ganador)
 *    - Frontend muestra notificaciones:
 *      * WinnerNotification (esquina, 5 seg)
 *      * PersonalWinNotification (centro, 8 seg con mensaje "espera")
 * 
 * 4. CONTINÚA EL JUEGO
 *    - Se siguen extrayendo bolas
 *    - Pueden ganar más líneas
 * 
 * 5. ALGUIEN CANTA BINGO
 *    - Player hace POST /api/game/claim-bingo
 *    - Backend valida y emite eventos:
 *      * 'bingo_winner' (a todos)
 *      * 'bingo_won_by_you' (solo al ganador)
 *      * 'game_ended' (fin del juego)
 *    - Frontend muestra notificaciones
 * 
 * 6. FINALIZA EL JUEGO (5 segundos después)
 *    - Backend emite 'show_payment_form' solo a ganadores
 *    - Frontend abre PaymentFormModal
 *    - Ganador completa: CBU, titular, WhatsApp
 * 
 * 7. DATOS ENVIADOS
 *    - Frontend hace POST /api/winners-payment/submit
 *    - Backend guarda en winner_payment_info
 *    - Estado: pending
 * 
 * 8. ADMIN PROCESA PAGO
 *    - Admin ve pagos pendientes en dashboard
 *    - Hace POST /api/winners-payment/:id/process
 *    - Backend emite 'payment_completed' al ganador
 *    - Ganador recibe notificación + comprobante por WhatsApp
 */
