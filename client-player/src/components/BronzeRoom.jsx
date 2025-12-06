import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import '../styles/BronzeRoom.css';

export default function BronzeRoom() {
  const { sessionId } = useParams();
  const [ballsDrawn, setBallsDrawn] = useState([]);
  const [lastBall, setLastBall] = useState(null);
  const [gameStatus, setGameStatus] = useState('waiting'); // waiting, active, ended
  const [currentBall, setCurrentBall] = useState(null);
  const [mechanicalParts, setMechanicalParts] = useState([]);

  // Simular partes mecánicas girando en el bolillero
  useEffect(() => {
    const parts = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      angle: (360 / 8) * i,
      radius: 60 + Math.random() * 40,
      speed: 0.5 + Math.random() * 0.5
    }));
    setMechanicalParts(parts);
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
        }, 3500);
      }, 6000);

      return () => clearInterval(drawTimer);
    }
  }, [gameStatus, ballsDrawn.length]);

  const getBallColor = (letter) => {
    // Tonos bronce/cobre para cada letra
    const colors = {
      'B': '#cd7f32',
      'I': '#b87333',
      'N': '#d4a86a',
      'G': '#c19a6b',
      'O': '#c08552'
    };
    return colors[letter] || '#cd7f32';
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

  return (
    <div className="bronze-room">
      {/* Header */}
      <div className="bronze-header">
        <div className="room-title">
          <span className="title-icon">🥉</span>
          <span className="title-text">SALA BRONCE</span>
          <div className="title-plate">$500</div>
        </div>
        <div className="game-info">
          <div className="info-gauge">
            <div className="gauge-label">BOLAS</div>
            <div className="gauge-display">
              <span className="gauge-value">{ballsDrawn.length}</span>
              <span className="gauge-separator">/</span>
              <span className="gauge-max">75</span>
            </div>
          </div>
          <div className={`status-indicator ${gameStatus}`}>
            <div className="indicator-light"></div>
            <div className="indicator-text">
              {gameStatus === 'waiting' && 'EN ESPERA'}
              {gameStatus === 'active' && 'EN CURSO'}
              {gameStatus === 'ended' && 'FINALIZADO'}
            </div>
          </div>
        </div>
      </div>

      {/* MITAD SUPERIOR - LA MESA */}
      <div className="game-table-bronze">
        {/* Cuadrícula con Marco Metálico (Izquierda) */}
        <div className="nixie-grid">
          <div className="metal-frame">
            <div className="frame-corner tl"></div>
            <div className="frame-corner tr"></div>
            <div className="frame-corner bl"></div>
            <div className="frame-corner br"></div>
            <div className="frame-rivet tl"></div>
            <div className="frame-rivet tr"></div>
            <div className="frame-rivet bl"></div>
            <div className="frame-rivet br"></div>
          </div>

          <div className="grid-title-bronze">
            <span className="title-plate-small">NÚMEROS CANTADOS</span>
          </div>
          
          <div className="nixie-columns">
            {letters.map(letter => (
              <div key={letter} className="nixie-column">
                <div className="column-header-bronze" style={{ color: getBallColor(letter) }}>
                  <span className="header-letter">{letter}</span>
                  <span className="header-range">{ranges[letter][0]}-{ranges[letter][1]}</span>
                </div>
                <div className="nixie-tubes">
                  {[...Array(15)].map((_, i) => {
                    const number = ranges[letter][0] + i;
                    const isCalled = organizedBalls[letter].some(b => b.number === number);
                    const isRecent = ballsDrawn.length > 0 && 
                                     ballsDrawn[ballsDrawn.length - 1]?.number === number;
                    
                    return (
                      <div 
                        key={number} 
                        className={`nixie-tube ${isCalled ? 'lit' : ''} ${isRecent ? 'flickering' : ''}`}
                      >
                        <div className="tube-glass">
                          <div className="tube-cathode">
                            {isCalled && (
                              <div className="nixie-glow" style={{ 
                                color: '#ff8c00',
                                textShadow: '0 0 20px #ff8c00, 0 0 40px #ff6600'
                              }}>
                                {number}
                              </div>
                            )}
                            {!isCalled && <div className="tube-number-dark">{number}</div>}
                          </div>
                          <div className="tube-filament"></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Panel de últimas bolas */}
          {ballsDrawn.length > 0 && (
            <div className="recent-panel-bronze">
              <div className="panel-label">ÚLTIMAS CANTADAS</div>
              <div className="recent-balls-strip">
                {ballsDrawn.slice(-5).reverse().map((ball, index) => (
                  <div key={`${ball.letter}-${ball.number}-${index}`} className="ball-tag-bronze">
                    <div className="tag-rivet"></div>
                    <span className="tag-letter">{ball.letter}</span>
                    <span className="tag-dash">-</span>
                    <span className="tag-number">{ball.number}</span>
                    <div className="tag-rivet"></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bolillero Mecánico (Derecha) */}
        <div className="mechanical-bingo-machine">
          <div className="machine-crown">
            <div className="crown-detail"></div>
          </div>

          <div className="clockwork-chamber">
            {/* Marco de cobre/bronce */}
            <div className="copper-ring outer"></div>
            <div className="copper-ring middle"></div>
            
            {/* Vidrio con tinte ámbar */}
            <div className="amber-glass">
              {/* Engranajes mecánicos de fondo */}
              {gameStatus === 'active' && !currentBall && (
                <div className="clockwork-gears">
                  {mechanicalParts.map(part => (
                    <div
                      key={part.id}
                      className="gear"
                      style={{
                        transform: `rotate(${part.angle}deg)`,
                        animationDuration: `${10 / part.speed}s`
                      }}
                    >
                      <div className="gear-tooth"></div>
                      <div className="gear-tooth"></div>
                      <div className="gear-tooth"></div>
                      <div className="gear-tooth"></div>
                    </div>
                  ))}
                </div>
              )}

              {/* Bola actual en sorteo */}
              {currentBall && (
                <div className="current-ball-display-bronze">
                  <div className="vintage-ball">
                    <div className="ball-surface-cream">
                      <div className="ball-wear"></div>
                      <div className="ball-text">
                        <div className="ball-letter-bronze">{currentBall.letter}</div>
                        <div className="ball-number-bronze">{currentBall.number}</div>
                      </div>
                    </div>
                  </div>
                  <div className="ball-label-plate">
                    <div className="plate-rivet left"></div>
                    <span className="plate-text">{currentBall.letter}-{currentBall.number}</span>
                    <div className="plate-rivet right"></div>
                  </div>
                </div>
              )}

              {/* Estado de espera */}
              {gameStatus === 'waiting' && (
                <div className="waiting-state-bronze">
                  <div className="waiting-gear">⚙️</div>
                  <div className="waiting-text-bronze">Aguardando inicio...</div>
                </div>
              )}
            </div>

            {/* Detalles mecánicos externos */}
            <div className="machine-bolt tl"></div>
            <div className="machine-bolt tr"></div>
            <div className="machine-bolt bl"></div>
            <div className="machine-bolt br"></div>
          </div>

          <div className="machine-pedestal">
            <div className="pedestal-plate top"></div>
            <div className="pedestal-body"></div>
            <div className="pedestal-plate bottom"></div>
            <div className="brass-nameplate">SALA BRONCE • 20:00 HS</div>
          </div>
        </div>
      </div>

      {/* Separador con remaches */}
      <div className="industrial-divider">
        <div className="divider-plate"></div>
        <div className="rivet-line">
          <div className="rivet"></div>
          <div className="rivet"></div>
          <div className="rivet"></div>
          <div className="rivet"></div>
          <div className="rivet"></div>
        </div>
      </div>

      {/* MITAD INFERIOR - CARTONES ESTILO PERGAMINO */}
      <div className="parchment-cards-section">
        <div className="section-header-bronze">
          <div className="header-plate">
            <span className="plate-icon">📜</span>
            <span className="plate-title">MIS CARTONES</span>
            <div className="plate-badge">{playerCards.length}</div>
          </div>
        </div>

        <div className="cards-scroll-bronze">
          {playerCards.map((card, cardIndex) => (
            <div key={card.id} className="bingo-card-bronze">
              {/* Marco metálico de cobre */}
              <div className="copper-frame">
                <div className="frame-edge top"></div>
                <div className="frame-edge right"></div>
                <div className="frame-edge bottom"></div>
                <div className="frame-edge left"></div>
                <div className="corner-ornament tl">◢</div>
                <div className="corner-ornament tr">◣</div>
                <div className="corner-ornament bl">◥</div>
                <div className="corner-ornament br">◤</div>
              </div>

              {/* Textura de pergamino */}
              <div className="parchment-texture"></div>

              <div className="card-header-bronze">
                <div className="card-seal">
                  <span className="seal-number">#{cardIndex + 1}</span>
                </div>
                <div className="vintage-stamp">BRONCE</div>
              </div>
              
              <div className="card-grid-bronze">
                <div className="card-letters-bronze">
                  {letters.map(letter => (
                    <div 
                      key={letter} 
                      className="card-letter-bronze"
                      style={{ color: getBallColor(letter) }}
                    >
                      {letter}
                    </div>
                  ))}
                </div>
                
                <div className="card-numbers-grid-bronze">
                  {letters.map(letter => (
                    <div key={letter} className="card-column-bronze">
                      {card.numbers[letter].map((num, idx) => {
                        const isCalled = num !== 0 && isNumberCalled(num);
                        return (
                          <div 
                            key={idx} 
                            className={`card-cell-bronze ${num === 0 ? 'free' : ''} ${isCalled ? 'stamped' : ''}`}
                          >
                            {num === 0 ? (
                              <div className="wax-seal">
                                <span className="seal-star">✦</span>
                              </div>
                            ) : (
                              <>
                                <span className="cell-number-bronze">{num}</span>
                                {isCalled && (
                                  <div className="red-ink-mark">
                                    <svg viewBox="0 0 40 40" className="x-mark">
                                      <line x1="8" y1="8" x2="32" y2="32" stroke="#8b0000" strokeWidth="3" strokeLinecap="round"/>
                                      <line x1="32" y1="8" x2="8" y2="32" stroke="#8b0000" strokeWidth="3" strokeLinecap="round"/>
                                    </svg>
                                  </div>
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

              {/* Firma vintage en la parte inferior */}
              <div className="card-signature">
                <div className="signature-line"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Botón de control (testing) */}
      <div className="test-controls-bronze">
        <button 
          className="brass-button"
          onClick={() => setGameStatus(gameStatus === 'active' ? 'waiting' : 'active')}
        >
          <div className="button-plate">
            {gameStatus === 'active' ? '⏸ PAUSAR' : '▶ INICIAR'}
          </div>
        </button>
      </div>
    </div>
  );
}
