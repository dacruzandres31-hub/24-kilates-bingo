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

  // Simulación de sorteo (reemplazar con Socket.IO en producción)
  useEffect(() => {
    if (gameStatus === 'active') {
      const drawTimer = setInterval(() => {
        const letters = ['B', 'I', 'N', 'G', 'O'];
        const ranges = { B: [1, 15], I: [16, 30], N: [31, 45], G: [46, 60], O: [61, 75] };
        const letter = letters[Math.floor(Math.random() * letters.length)];
        const range = ranges[letter];
        const number = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
        
        const newBall = {
          letter,
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
  }, [gameStatus, ballsDrawn.length]);

  const getBallColor = (letter) => {
    const colors = {
      'B': '#00d4ff',
      'I': '#ff00ff',
      'N': '#00ff00',
      'G': '#ffff00',
      'O': '#ff0099'
    };
    return colors[letter] || '#00ffff';
  };

  const organizedBalls = {
    B: ballsDrawn.filter(b => b.letter === 'B').sort((a, b) => a.number - b.number),
    I: ballsDrawn.filter(b => b.letter === 'I').sort((a, b) => a.number - b.number),
    N: ballsDrawn.filter(b => b.letter === 'N').sort((a, b) => a.number - b.number),
    G: ballsDrawn.filter(b => b.letter === 'G').sort((a, b) => a.number - b.number),
    O: ballsDrawn.filter(b => b.letter === 'O').sort((a, b) => a.number - b.number)
  };

  const letters = ['B', 'I', 'N', 'G', 'O'];
  const ranges = { B: [1, 15], I: [16, 30], N: [31, 45], G: [46, 60], O: [61, 75] };

  // Cartones de ejemplo (reemplazar con datos reales)
  const [playerCards] = useState([
    {
      id: 1,
      numbers: {
        B: [3, 7, 12, 14, 15],
        I: [16, 19, 24, 28, 30],
        N: [32, 38, 0, 44, 45],
        G: [51, 54, 58, 60, 61],
        O: [65, 68, 72, 74, 75]
      }
    },
    {
      id: 2,
      numbers: {
        B: [1, 5, 9, 11, 13],
        I: [17, 21, 25, 27, 29],
        N: [33, 36, 0, 42, 46],
        G: [49, 52, 56, 59, 62],
        O: [64, 67, 70, 73, 75]
      }
    },
    {
      id: 3,
      numbers: {
        B: [2, 6, 8, 10, 14],
        I: [18, 20, 23, 26, 30],
        N: [31, 37, 0, 43, 47],
        G: [50, 53, 57, 60, 63],
        O: [66, 69, 71, 74, 75]
      }
    }
  ]);

  const isNumberCalled = (number) => {
    return ballsDrawn.some(ball => ball.number === number);
  };

  // Detectar líneas (horizontal, vertical, diagonal)
  const checkLineStatus = (card) => {
    const lines = [];
    const letters = ['B', 'I', 'N', 'G', 'O'];

    // Líneas horizontales
    for (let row = 0; row < 5; row++) {
      const line = letters.map(letter => card.numbers[letter][row]);
      lines.push({ type: 'horizontal', row, line });
    }

    // Líneas verticales
    letters.forEach((letter, col) => {
      const line = card.numbers[letter];
      lines.push({ type: 'vertical', col, line });
    });

    // Diagonal principal (top-left to bottom-right)
    const diagonal1 = letters.map((letter, idx) => card.numbers[letter][idx]);
    lines.push({ type: 'diagonal', dir: 'main', line: diagonal1 });

    // Diagonal secundaria (top-right to bottom-left)
    const diagonal2 = letters.map((letter, idx) => card.numbers[letter][4 - idx]);
    lines.push({ type: 'diagonal', dir: 'secondary', line: diagonal2 });

    // Verificar cuántas bolillas faltan en cada línea
    const linesStatus = lines.map(lineData => {
      const missing = lineData.line.filter(num => num !== 0 && !isNumberCalled(num));
      const marked = lineData.line.filter(num => num === 0 || isNumberCalled(num));
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
        {/* Cuadrícula Digital - IZQUIERDA COMPLETA */}
        <div className="digital-grid">
          <div className="grid-header">
            <div className="grid-title">NÚMEROS CANTADOS</div>
            <div className="grid-glow"></div>
          </div>
          
          <div className="grid-columns">
            {letters.map(letter => (
              <div key={letter} className="grid-column">
                <div 
                  className="column-letter" 
                  style={{ 
                    color: getBallColor(letter),
                    textShadow: `0 0 20px ${getBallColor(letter)}`
                  }}
                >
                  {letter}
                </div>
                <div className="column-numbers">
                  {[...Array(15)].map((_, i) => {
                    const number = ranges[letter][0] + i;
                    const isCalled = organizedBalls[letter].some(b => b.number === number);
                    const isRecent = ballsDrawn.length > 0 && 
                                     ballsDrawn[ballsDrawn.length - 1]?.number === number;
                    
                    return (
                      <div 
                        key={number} 
                        className={`grid-number ${isCalled ? 'called' : ''} ${isRecent ? 'recent' : ''}`}
                        style={isCalled ? {
                          backgroundColor: getBallColor(letter),
                          boxShadow: `0 0 20px ${getBallColor(letter)}`
                        } : {}}
                      >
                        {number}
                        {isCalled && (
                          <div className="number-glow-ring" style={{ borderColor: getBallColor(letter) }}></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Últimas 5 bolas */}
          {ballsDrawn.length > 0 && (
            <div className="recent-balls-bar">
              <span className="recent-label">ÚLTIMAS:</span>
              <div className="recent-balls-list">
                {ballsDrawn.slice(-5).reverse().map((ball, index) => (
                  <div 
                    key={`${ball.letter}-${ball.number}-${index}`}
                    className="recent-ball-chip"
                    style={{
                      backgroundColor: getBallColor(ball.letter),
                      boxShadow: `0 0 15px ${getBallColor(ball.letter)}`
                    }}
                  >
                    <span className="ball-letter">{ball.letter}</span>
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
                <span className="badge-value">{ballsDrawn.length}/75</span>
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
                    backgroundColor: getBallColor(currentBall.letter),
                    boxShadow: `0 0 40px ${getBallColor(currentBall.letter)}`
                  }}
                >
                  <div className="ball-shine"></div>
                  <div className="ball-content">
                    <div className="ball-letter">{currentBall.letter}</div>
                    <div className="ball-number">{currentBall.number}</div>
                  </div>
                </div>
                <div className="ball-announcement">
                  <div className="announcement-letter" style={{ color: getBallColor(currentBall.letter) }}>
                    {currentBall.letter}
                  </div>
                  <div className="announcement-separator">-</div>
                  <div className="announcement-number" style={{ color: getBallColor(currentBall.letter) }}>
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
            <div key={card.id} className="bingo-card-starter">
              <div className="card-header">
                <span className="card-number">#{playerCards.length - cardIndex}</span>
                <div className="card-glow-border"></div>
              </div>
              
              <div className="card-grid">
                <div className="card-letters">
                  {letters.map(letter => (
                    <div 
                      key={letter} 
                      className="card-letter"
                      style={{ 
                        color: getBallColor(letter),
                        textShadow: `0 0 10px ${getBallColor(letter)}`
                      }}
                    >
                      {letter}
                    </div>
                  ))}
                </div>
                
                <div className="card-numbers-grid">
                  {letters.map(letter => (
                    <div key={letter} className="card-column">
                      {card.numbers[letter].map((num, idx) => {
                        const isCalled = num !== 0 && isNumberCalled(num);
                        return (
                          <div 
                            key={idx} 
                            className={`card-cell ${num === 0 ? 'free' : ''} ${isCalled ? 'marked' : ''}`}
                          >
                            {num === 0 ? (
                              <span className="free-space">★</span>
                            ) : (
                              <>
                                <span className="cell-number">{num}</span>
                                {isCalled && (
                                  <div 
                                    className="cell-mark"
                                    style={{
                                      backgroundColor: getBallColor(letter),
                                      boxShadow: `0 0 15px ${getBallColor(letter)}`
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
