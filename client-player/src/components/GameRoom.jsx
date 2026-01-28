import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import BingoBallMachine from './BingoBallMachine';
import BallHistory from './BallHistory';
import StackedBingoCards from './StackedBingoCards';
import WinnerNotifications from './WinnerNotifications';
import { useSocket } from '../hooks/useSocket';
import '../styles/GameRoom.css';

/**
 * GameRoom - Sala de juego principal
 * 
 * Layout dividido verticalmente:
 * - Superior (50%): Bolillero + Historial de bolas
 * - Inferior (50%): Cartones del jugador
 */
export default function GameRoom() {
  const { sessionId } = useParams();
  const socket = useSocket();
  const [currentUser, setCurrentUser] = useState(null);
  const [gameSession, setGameSession] = useState(null);
  const [ballsDrawn, setBallsDrawn] = useState([]);
  const [lastBall, setLastBall] = useState(null);
  const [gameStatus, setGameStatus] = useState('waiting'); // waiting, active, ended
  const [loading, setLoading] = useState(true);

  // Cargar datos iniciales
  useEffect(() => {
    loadGameData();
    loadCurrentUser();
  }, [sessionId]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    // Escuchar nueva bola cantada
    socket.on('ball_drawn', (data) => {
      console.log('[GameRoom] Ball drawn:', data);

      const newBall = {
        number: data.ballNumber,
        letter: data.ballLetter,
        drawOrder: data.drawOrder
      };

      setLastBall(newBall);
      setBallsDrawn(prev => [...prev, newBall]);
    });

    // Escuchar inicio de juego
    socket.on('game_started', (data) => {
      console.log('[GameRoom] Game started:', data);
      setGameStatus('active');
    });

    // Escuchar fin de juego
    socket.on('game_ended', (data) => {
      console.log('[GameRoom] Game ended:', data);
      setGameStatus('ended');
    });

    return () => {
      socket.off('ball_drawn');
      socket.off('game_started');
      socket.off('game_ended');
    };
  }, [socket]);

  const loadGameData = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/game/sessions/${sessionId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('playerToken') || localStorage.getItem('token')}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setGameSession(data);
        setGameStatus(data.status);

        // Cargar bolas ya cantadas
        if (data.balls) {
          setBallsDrawn(data.balls.map(b => ({
            number: b.ball_number,
            letter: b.ball_letter,
            drawOrder: b.draw_order
          })));

          if (data.balls.length > 0) {
            const last = data.balls[data.balls.length - 1];
            setLastBall({
              number: last.ball_number,
              letter: last.ball_letter,
              drawOrder: last.draw_order
            });
          }
        }
      }
    } catch (error) {
      console.error('[GameRoom] Error loading game data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentUser = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/users/me`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('playerToken') || localStorage.getItem('token')}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data);
      }
    } catch (error) {
      console.error('[GameRoom] Error loading user:', error);
    }
  };

  if (loading) {
    return (
      <div className="game-room-loading">
        <div className="loading-spinner"></div>
        <p>Cargando sala de juego...</p>
      </div>
    );
  }

  return (
    <div className="game-room">
      {/* Sección Superior: Bolillero + Historial */}
      <div className="game-room-upper">
        {/* Historial de Bolas (Izquierda) */}
        <div className="game-room-history">
          <BallHistory balls={ballsDrawn} />
        </div>

        {/* Bolillero (Derecha) */}
        <div className="game-room-machine">
          <BingoBallMachine
            lastBall={lastBall}
            isActive={gameStatus === 'active'}
            totalDrawn={ballsDrawn.length}
          />
        </div>
      </div>

      {/* Divisor visual */}
      <div className="game-room-divider"></div>

      {/* Sección Inferior: Cartones */}
      <div className="game-room-lower">
        <StackedBingoCards
          gameSessionId={sessionId}
          socket={socket}
        />
      </div>

      {/* Notificaciones de ganadores */}
      <WinnerNotifications
        socket={socket}
        currentUser={currentUser}
      />

      {/* Información de estado */}
      <div className="game-room-status">
        <div className="status-badge" data-status={gameStatus}>
          {gameStatus === 'waiting' && '⏳ Esperando inicio'}
          {gameStatus === 'active' && '🎮 En juego'}
          {gameStatus === 'ended' && '🏁 Finalizado'}
        </div>
        <div className="balls-count">
          Bolas cantadas: <strong>{ballsDrawn.length}/90</strong>
        </div>
      </div>
    </div>
  );
}
