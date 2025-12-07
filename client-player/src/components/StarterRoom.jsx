import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import '../styles/StarterRoom.css';

export default function StarterRoom() {
  const { sessionId } = useParams();
  const [ballsDrawn, setBallsDrawn] = useState([]);
  const [lastBall, setLastBall] = useState(null);
  const [gameStatus, setGameStatus] = useState('waiting'); // waiting, active, ended
  const [currentBall, setCurrentBall] = useState(null);
  const [floatingBalls, setFloatingBalls] = useState([]);
  const [almostLineCards, setAlmostLineCards] = useState([]); // Cartones a 2 bolillas de línea

  // Simular bolillas flotantes en el bolillero
  useEffect(() => {
    const colors = ['#ff00ff', '#00ff00', '#00ffff', '#ffff00', '#ff0099'];
    const balls = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 3,
      duration: 3 + Math.random() * 2
    }));
    setFloatingBalls(balls);
  }, []);

  // Simulación de sorteo BINGO 90 (reemplazar con Socket.IO en producción)
  useEffect(() => {
    if (gameStatus === 'active') {
      const drawTimer = setInterval(() => {
        // Generar número del 1 al 90
        const number = Math.floor(Math.random() * 90) + 1;
        
        // Evitar duplicados
        if (ballsDrawn.some(b => b.number === number)) {
          return;
        }
        
        const newBall = {
          number,
          drawOrder: ballsDrawn.length + 1,
          timestamp: Date.now()
        };

        setCurrentBall(newBall);
        setTimeout(() => {
          setBallsDrawn(prev => [...prev, newBall]);
          setCurrentBall(null);
        }, 3000);
      }, 5000);

      return () => clearInterval(drawTimer);
    }
  }, [gameStatus, ballsDrawn]);

  // Función para obtener color según el número (estilo arcoíris)
  const getBallColor = (number) => {
    if (number >= 1 && number <= 10) return '#ff0000'; // Rojo
    if (number >= 11 && number <= 20) return '#ff7700'; // Naranja
    if (number >= 21 && number <= 30) return '#ffdd00'; // Amarillo
    if (number >= 31 && number <= 40) return '#00ff00'; // Verde
    if (number >= 41 && number <= 50) return '#00ddff'; // Cian
    if (number >= 51 && number <= 60) return '#0077ff'; // Azul
    if (number >= 61 && number <= 70) return '#7700ff'; // Púrpura
    if (number >= 71 && number <= 80) return '#ff00ff'; // Magenta
    return '#ff0099'; // Rosa (81-90)
  };

  // Organizar bolillas por decenas para el grid
  const organizedBalls = {};
  for (let i = 0; i < 9; i++) {
    const start = i * 10 + 1;
    const end = (i + 1) * 10;
    organizedBalls[i] = ballsDrawn.filter(b => b.number >= start && b.number <= (i === 8 ? 90 : end));
  }

  // Cartones de ejemplo BINGO 90 (reemplazar con datos reales)
  // Formato: 3 filas x 9 columnas, 5 números por fila, nulls para espacios vacíos
  const [playerCards] = useState([
    {
      id: 1,
      numbers: [
        [3, null, 15, null, 34, 50, null, 72, 85],
        [null, 12, null, 28, null, 51, 63, null, 88],
        [5, null, 22, null, 39, null, 68, 77, null]
      ]
    },
    {
      id: 2,
      numbers: [
        [null, 11, 20, null, 35, null, 60, 75, null],
        [6, null, null, 29, null, 54, null, 79, 89],
        [null, 18, 27, null, 42, null, 66, null, 90]
      ]
    },
    {
      id: 3,
      numbers: [
        [8, null, null, 31, null, 55, 64, null, 86],
        [null, 14, 24, null, 40, null, null, 78, 87],
        [2, null, 26, null, 48, 59, 70, null, null]
      ]
    },
    {
      id: 4,
      numbers: [
        [null, 13, 23, null, 37, null, 62, 74, null],
        [7, null, null, 32, null, 56, null, 76, 84],
        [null, 19, 25, null, 45, null, 67, null, 90]
      ]
    }
  ]);

  const isNumberCalled = (number) => {
    return ballsDrawn.some(ball => ball.number === number);
  };

  // Detectar líneas en BINGO 90 (solo horizontales - 3 filas)
  const checkLineStatus = (card) => {
    const lines = [];
    
    // Revisar las 3 filas horizontales
    for (let row = 0; row < 3; row++) {
      const rowNumbers = card.numbers[row].filter(n => n !== null && n !== undefined);
      lines.push({ 
        type: 'horizontal', 
        row, 
        line: rowNumbers 
      });
    }

    // Verificar cuántas bolillas faltan en cada línea
    const linesStatus = lines.map(lineData => {
      const missing = lineData.line.filter(num => !isNumberCalled(num));
      const marked = lineData.line.filter(num => isNumberCalled(num));
      return {
        ...lineData,
        missing: missing.length,
        markedCount: marked.length,
        missingNumbers: missing
      };
    });

    return linesStatus;
  };

  // Detectar cartones a 2 bolillas de línea
  useEffect(() => {
    if (ballsDrawn.length === 0) {
      setAlmostLineCards([]);
      return;
    }

    const cardsAlmostThere = [];
    
    playerCards.forEach(card => {
      const linesStatus = checkLineStatus(card);
      const almostLines = linesStatus.filter(line => line.missing === 2);
      
      if (almostLines.length > 0) {
        cardsAlmostThere.push({
          cardId: card.id,
          almostLineCount: almostLines.length,
          lines: almostLines
        });
      }
    });

    setAlmostLineCards(cardsAlmostThere);
  }, [ballsDrawn, playerCards]);

  return (
    <div className="starter-room">
      {/* Alerta de casi línea - Personalizada para el jugador */}
      {almostLineCards.length > 0 && (
        <div className="almost-line-alert">
          <div className="alert-icon">⚠️</div>
          <div className="alert-content">
            <div className="alert-title">¡ESTÁS A 2 BOLILLAS DE LÍNEA!</div>
            <div className="alert-message">
              {almostLineCards.length === 1 
                ? `Tienes 1 cartón cerca de ganar`
                : `Tienes ${almostLineCards.length} cartones cerca de ganar`}
            </div>
            <div className="alert-details">
              {almostLineCards.map(card => (
                <span key={card.cardId} className="card-badge">
                  Tu Cartón #{card.cardId}: {card.almostLineCount} {card.almostLineCount === 1 ? 'línea posible' : 'líneas posibles'}
                </span>
              ))}
            </div>
            <div className="alert-subtext">
              🎯 ¡Concéntrate! Solo necesitas 2 números más para cantar LÍNEA
            </div>
          </div>
          <div className="alert-pulse"></div>
        </div>
      )}

      {/* LAYOUT REORGANIZADO */}
      <div className="game-table">
        {/* Cuadrícula Digital - IZQUIERDA COMPLETA (9 columnas x 10 filas) */}
        <div className="digital-grid">
          <div className="grid-header">
            <div className="grid-title">NÚMEROS CANTADOS</div>
            <div className="grid-glow"></div>
          </div>
          
          <div className="grid-columns">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(columnIndex => {
              const start = columnIndex * 10 + 1;
              const end = columnIndex === 8 ? 90 : (columnIndex + 1) * 10;
              const columnLabel = `${start}-${end}`;
              
              return (
                <div key={columnIndex} className="grid-column">
                  <div 
                    className="column-letter" 
                    style={{ 
                      color: getBallColor(start),
                      textShadow: `0 0 20px ${getBallColor(start)}`
                    }}
                  >
                    {columnLabel}
                  </div>
                  <div className="column-numbers">
                    {Array.from({ length: end - start + 1 }, (_, i) => {
                      const number = start + i;
                      const isCalled = ballsDrawn.some(b => b.number === number);
                      const isRecent = ballsDrawn.length > 0 && 
                                       ballsDrawn[ballsDrawn.length - 1]?.number === number;
                      
                      return (
                        <div 
                          key={number} 
                          className={`grid-number ${isCalled ? 'called' : ''} ${isRecent ? 'recent' : ''}`}
                          style={isCalled ? {
                            backgroundColor: getBallColor(number),
                            boxShadow: `0 0 20px ${getBallColor(number)}`
                          } : {}}
                        >
                          {number}
                          {isCalled && (
                            <div className="number-glow-ring" style={{ borderColor: getBallColor(number) }}></div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Últimas 5 bolas */}
          {ballsDrawn.length > 0 && (
            <div className="recent-balls-bar">
              <span className="recent-label">ÚLTIMAS:</span>
              <div className="recent-balls-list">
                {ballsDrawn.slice(-5).reverse().map((ball, index) => (
                  <div 
                    key={`${ball.number}-${index}`}
                    className="recent-ball-chip"
                    style={{
                      backgroundColor: getBallColor(ball.number),
                      boxShadow: `0 0 15px ${getBallColor(ball.number)}`
                    }}
                  >
                    <span className="ball-number">{ball.number}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sección derecha: Título/Info arriba, Bolillero abajo */}
        <div className="right-section">
          {/* Info superior */}
          <div className="side-info">
            <div className="room-title">
              <span className="title-icon">🎟️</span>
              <span className="title-text">SALA STARTER</span>
              <span className="title-tag">FREE</span>
            </div>
            <div className="game-info">
              <div className="info-badge">
                <span className="badge-label">Bolas:</span>
                <span className="badge-value">{ballsDrawn.length}/90</span>
              </div>
              <div className={`status-badge ${gameStatus}`}>
                {gameStatus === 'waiting' && '⏸️ ESPERANDO'}
                {gameStatus === 'active' && '🔴 EN VIVO'}
                {gameStatus === 'ended' && '✅ FINALIZADO'}
              </div>
            </div>
          </div>

          {/* Bolillero Moderno */}
          <div className="modern-bingo-machine">
          <div className="machine-top-led"></div>
          
          <div className="acrylic-sphere">
            {/* Borde LED azul */}
            <div className="led-ring"></div>
            
            {/* Bolillas flotantes */}
            {gameStatus === 'active' && !currentBall && (
              <div className="floating-balls-container">
                {floatingBalls.map(ball => (
                  <div
                    key={ball.id}
                    className="floating-ball"
                    style={{
                      backgroundColor: ball.color,
                      boxShadow: `0 0 20px ${ball.color}`,
                      animationDelay: `${ball.delay}s`,
                      animationDuration: `${ball.duration}s`
                    }}
                  />
                ))}
              </div>
            )}

            {/* Bola actual en sorteo */}
            {currentBall && (
              <div className="current-ball-showcase">
                <div 
                  className="showcase-ball"
                  style={{
                    backgroundColor: getBallColor(currentBall.number),
                    boxShadow: `0 0 40px ${getBallColor(currentBall.number)}`
                  }}
                >
                  <div className="ball-shine"></div>
                  <div className="ball-content">
                    <div className="ball-number-large">{currentBall.number}</div>
                  </div>
                </div>
                <div className="ball-announcement">
                  <div className="announcement-number-large" style={{ color: getBallColor(currentBall.number) }}>
                    {currentBall.number}
                  </div>
                </div>
              </div>
            )}

            {/* Estado de espera */}
            {gameStatus === 'waiting' && (
              <div className="waiting-message">
                <div className="waiting-icon">⏳</div>
                <div className="waiting-text">Esperando inicio...</div>
              </div>
            )}
          </div>

          <div className="machine-base">
            <div className="base-panel"></div>
            <div className="base-lights">
              <div className="light-strip"></div>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Divider con efecto neón */}
      <div className="neon-divider">
        <div className="divider-line"></div>
        <div className="divider-pulse"></div>
      </div>

      {/* MITAD INFERIOR - LOS CARTONES */}
      <div className="player-cards-section">
        <div className="cards-header">
          <div className="cards-title">
            <span className="cards-icon">🎴</span>
            <span>MIS CARTONES</span>
          </div>
          <div className="cards-count">{playerCards.length} cartones</div>
        </div>

        <div className="cards-scroll-container">
          {[...playerCards].reverse().map((card, cardIndex) => (
            <div key={card.id} className="bingo-card-starter bingo-card-starter-90">
              <div className="card-header">
                <span className="card-number">#{playerCards.length - cardIndex}</span>
                <div className="card-glow-border"></div>
              </div>
              
              <div className="card-grid card-grid-90">
                {card.numbers.map((row, rowIndex) => (
                  <div key={rowIndex} className="card-row">
                    {row.map((num, colIndex) => {
                      const isEmpty = num === null || num === undefined;
                      const isCalled = !isEmpty && isNumberCalled(num);
                      
                      return (
                        <div 
                          key={colIndex} 
                          className={`card-cell ${isEmpty ? 'empty' : ''} ${isCalled ? 'marked' : ''}`}
                        >
                          {isEmpty ? (
                            <span className="empty-space"></span>
                          ) : (
                            <>
                              <span className="cell-number">{num}</span>
                              {isCalled && (
                                <div 
                                  className="cell-mark"
                                  style={{
                                    backgroundColor: getBallColor(num),
                                    boxShadow: `0 0 15px ${getBallColor(num)}`
                                  }}
                                />
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Botón de control (solo para testing) */}
      <div className="test-controls">
        <button 
          className="control-btn"
          onClick={() => setGameStatus(gameStatus === 'active' ? 'waiting' : 'active')}
        >
          {gameStatus === 'active' ? '⏸️ Pausar' : '▶️ Iniciar'}
        </button>
      </div>
    </div>
  );
}
