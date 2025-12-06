// ============================================
// COMPONENTES: NOTIFICACIONES DE GANADORES
// ============================================
// Ubicación sugerida: client-player/src/components/WinnerNotifications.jsx

import React, { useState, useEffect } from 'react';

/**
 * COMPONENTE 1: Notificación que ven TODOS los jugadores
 * Aparece en esquina superior derecha durante 5 segundos
 */
export const WinnerNotification = ({ winner, prizeType, prizeAmount, lineType }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  const icon = prizeType === 'linea' ? '📏' : '🎯';
  const text = prizeType === 'linea' 
    ? `ganó la línea ${lineType || ''}`
    : '¡BINGO! Ganó el sorteo';

  return (
    <div className="winner-notification corner-notification">
      <div className="notification-content">
        <div className="notification-icon">{icon}</div>
        <div className="notification-text">
          <div className="winner-name">{winner.username}</div>
          <div className="win-type">{text}</div>
          <div className="prize-amount">${prizeAmount.toLocaleString()}</div>
        </div>
      </div>
      <div className="notification-progress-bar" />
    </div>
  );
};

/**
 * COMPONENTE 2: Notificación que ve SOLO EL GANADOR
 * Aparece en centro de pantalla con mensaje especial
 */
export const PersonalWinNotification = ({ prizeType, prizeAmount, lineType }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 8000); // Dura más tiempo (8 segundos)

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  const isLine = prizeType === 'linea';
  const icon = isLine ? '📏' : '🎯';
  const title = isLine ? `¡Ganaste la línea ${lineType || ''}!` : '¡BINGO! ¡GANASTE!';
  const message = isLine 
    ? 'Al finalizar el sorteo te pediremos tus datos bancarios para cobrar tu premio.'
    : 'Al finalizar el sorteo te pediremos tus datos bancarios para cobrar TODOS tus premios.';

  return (
    <div className="winner-notification personal-win-modal">
      <div className="personal-win-content">
        <div className="celebration-animation">
          <div className="confetti">🎊</div>
          <div className="confetti">🎉</div>
          <div className="confetti">✨</div>
        </div>

        <div className="win-icon">{icon}</div>
        <h1 className="win-title">{title}</h1>
        <div className="win-amount">${prizeAmount.toLocaleString()}</div>

        <div className="win-message-box">
          <div className="message-icon">ℹ️</div>
          <p className="win-message">{message}</p>
        </div>

        {isLine && (
          <div className="game-continues-banner">
            <div className="pulse-indicator" />
            <span>El sorteo continúa para el BINGO...</span>
          </div>
        )}

        <button 
          className="btn-close-notification"
          onClick={() => setIsVisible(false)}
        >
          Entendido
        </button>
      </div>
    </div>
  );
};

/**
 * COMPONENTE 3: Sistema de notificaciones (gestiona ambos tipos)
 * Se integra con Socket.IO para escuchar eventos
 */
export const WinnerNotificationSystem = ({ socket, userId }) => {
  const [publicNotification, setPublicNotification] = useState(null);
  const [personalNotification, setPersonalNotification] = useState(null);

  useEffect(() => {
    if (!socket) return;

    // Evento: Alguien ganó línea (broadcast a todos)
    const handleLineWinner = (data) => {
      console.log('Line winner:', data);
      setPublicNotification({
        winner: data.winner,
        prizeType: 'linea',
        prizeAmount: data.prizeAmount,
        lineType: data.lineType
      });

      // Limpiar después de 5 segundos
      setTimeout(() => {
        setPublicNotification(null);
      }, 5000);
    };

    // Evento: YO gané línea (solo para el ganador)
    const handleLineWonByYou = (data) => {
      console.log('You won the line!', data);
      setPersonalNotification({
        prizeType: 'linea',
        prizeAmount: data.prizeAmount,
        lineType: data.lineType || ''
      });

      // Limpiar después de 8 segundos
      setTimeout(() => {
        setPersonalNotification(null);
      }, 8000);
    };

    // Evento: Alguien ganó BINGO (broadcast a todos)
    const handleBingoWinner = (data) => {
      console.log('Bingo winner:', data);
      setPublicNotification({
        winner: data.winner,
        prizeType: 'bingo',
        prizeAmount: data.prizeAmount
      });

      setTimeout(() => {
        setPublicNotification(null);
      }, 5000);
    };

    // Evento: YO gané BINGO (solo para el ganador)
    const handleBingoWonByYou = (data) => {
      console.log('You won the bingo!', data);
      setPersonalNotification({
        prizeType: 'bingo',
        prizeAmount: data.prizeAmount
      });

      setTimeout(() => {
        setPersonalNotification(null);
      }, 8000);
    };

    // Registrar listeners
    socket.on('line_winner', handleLineWinner);
    socket.on('line_won_by_you', handleLineWonByYou);
    socket.on('bingo_winner', handleBingoWinner);
    socket.on('bingo_won_by_you', handleBingoWonByYou);

    // Cleanup
    return () => {
      socket.off('line_winner', handleLineWinner);
      socket.off('line_won_by_you', handleLineWonByYou);
      socket.off('bingo_winner', handleBingoWinner);
      socket.off('bingo_won_by_you', handleBingoWonByYou);
    };
  }, [socket, userId]);

  return (
    <>
      {/* Notificación pública (esquina) */}
      {publicNotification && (
        <WinnerNotification
          winner={publicNotification.winner}
          prizeType={publicNotification.prizeType}
          prizeAmount={publicNotification.prizeAmount}
          lineType={publicNotification.lineType}
        />
      )}

      {/* Notificación personal (centro) */}
      {personalNotification && (
        <PersonalWinNotification
          prizeType={personalNotification.prizeType}
          prizeAmount={personalNotification.prizeAmount}
          lineType={personalNotification.lineType}
        />
      )}
    </>
  );
};

/**
 * EJEMPLO DE USO en GameRoom.jsx
 */
export const GameRoomExample = () => {
  const [socket, setSocket] = useState(null);
  const [userId] = useState(42); // Tu ID de usuario

  useEffect(() => {
    // Conectar Socket.IO
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, []);

  return (
    <div className="game-room">
      {/* Tus componentes de juego */}
      <GameBoard />
      <BallDisplay />
      
      {/* Sistema de notificaciones de ganadores */}
      <WinnerNotificationSystem socket={socket} userId={userId} />
    </div>
  );
};

/**
 * ESTILOS CSS SUGERIDOS (winner-notifications.css)
 */
const styles = `
/* Notificación en esquina (para todos) */
.winner-notification.corner-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 15px;
  padding: 20px;
  min-width: 300px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  z-index: 10000;
  animation: slideInRight 0.5s ease-out;
}

@keyframes slideInRight {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 15px;
  color: white;
}

.notification-icon {
  font-size: 40px;
}

.winner-name {
  font-size: 18px;
  font-weight: bold;
}

.win-type {
  font-size: 14px;
  opacity: 0.9;
}

.prize-amount {
  font-size: 20px;
  color: #ffd700;
  font-weight: bold;
  margin-top: 5px;
}

.notification-progress-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  margin-top: 15px;
  border-radius: 2px;
  position: relative;
  overflow: hidden;
}

.notification-progress-bar::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 100%;
  background: #ffd700;
  animation: progressBar 5s linear forwards;
}

@keyframes progressBar {
  from { width: 100%; }
  to { width: 0%; }
}

/* Notificación personal (centro, solo para ganador) */
.winner-notification.personal-win-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.personal-win-content {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 3px solid #ffd700;
  border-radius: 25px;
  padding: 50px;
  text-align: center;
  max-width: 500px;
  position: relative;
  animation: scaleIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  box-shadow: 0 20px 60px rgba(255, 215, 0, 0.3);
}

@keyframes scaleIn {
  from {
    transform: scale(0.5);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.celebration-animation {
  position: absolute;
  top: -30px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  font-size: 50px;
}

.confetti {
  animation: confettiFall 2s ease-in-out infinite;
}

.confetti:nth-child(2) {
  animation-delay: 0.3s;
}

.confetti:nth-child(3) {
  animation-delay: 0.6s;
}

@keyframes confettiFall {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100px) rotate(360deg);
    opacity: 0;
  }
}

.win-icon {
  font-size: 100px;
  margin: 20px 0;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.win-title {
  font-size: 36px;
  color: #ffd700;
  margin: 20px 0;
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
}

.win-amount {
  font-size: 48px;
  color: white;
  font-weight: bold;
  margin: 20px 0;
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
}

.win-message-box {
  background: rgba(255, 215, 0, 0.1);
  border: 2px solid #ffd700;
  border-radius: 15px;
  padding: 20px;
  margin: 30px 0;
  display: flex;
  align-items: start;
  gap: 15px;
  text-align: left;
}

.message-icon {
  font-size: 30px;
  flex-shrink: 0;
}

.win-message {
  color: white;
  font-size: 16px;
  line-height: 1.6;
  margin: 0;
}

.game-continues-banner {
  background: rgba(76, 175, 80, 0.2);
  border: 2px solid #4caf50;
  border-radius: 10px;
  padding: 15px;
  margin: 20px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #4caf50;
  font-weight: 600;
}

.pulse-indicator {
  width: 12px;
  height: 12px;
  background: #4caf50;
  border-radius: 50%;
  animation: pulseGlow 1.5s ease-in-out infinite;
}

@keyframes pulseGlow {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 5px #4caf50;
  }
  50% {
    opacity: 0.5;
    box-shadow: 0 0 20px #4caf50;
  }
}

.btn-close-notification {
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  color: #1a1a2e;
  border: none;
  padding: 15px 40px;
  border-radius: 10px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  margin-top: 20px;
  transition: transform 0.3s, box-shadow 0.3s;
}

.btn-close-notification:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(255, 215, 0, 0.5);
}

/* Responsive */
@media (max-width: 768px) {
  .winner-notification.corner-notification {
    top: 10px;
    right: 10px;
    left: 10px;
    min-width: auto;
  }

  .personal-win-content {
    padding: 30px 20px;
    margin: 20px;
  }

  .win-title {
    font-size: 28px;
  }

  .win-amount {
    font-size: 36px;
  }
}
`;
