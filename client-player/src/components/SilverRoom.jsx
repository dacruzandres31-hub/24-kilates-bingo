import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import '../styles/SilverRoom.css';

export default function SilverRoom() {
  const { sessionId } = useParams();
  
  const [ballsDrawn, setBallsDrawn] = useState([]);
  const [currentBall, setCurrentBall] = useState(null);
  const [gameStatus, setGameStatus] = useState('waiting'); // 'waiting', 'active', 'ended'
  const [magneticField, setMagneticField] = useState([]);

  // Generar campo magnético flotante
  useEffect(() => {
    const particles = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      angle: (360 / 12) * i,
      radius: 80 + Math.random() * 30,
      speed: 0.3 + Math.random() * 0.4
    }));
    setMagneticField(particles);
  }, []);

  // Simulación de sorteo (cada 5 segundos)
  useEffect(() => {
    if (gameStatus === 'active' && ballsDrawn.length < 75) {
      const drawTimer = setInterval(() => {
        const remainingNumbers = [];
        for (let i = 1; i <= 75; i++) {
          if (!ballsDrawn.some(ball => ball.number === i)) {
            remainingNumbers.push(i);
          }
        }

        if (remainingNumbers.length > 0) {
          const randomIndex = Math.floor(Math.random() * remainingNumbers.length);
          const number = remainingNumbers[randomIndex];
          const letter = getLetterForNumber(number);
          
          const newBall = { letter, number };
          setCurrentBall(newBall);
          
          // Después de 3 segundos, agregar a la lista
          setTimeout(() => {
            setBallsDrawn(prev => [...prev, newBall]);
            setCurrentBall(null);
          }, 3000);
        }
      }, 5000);

      return () => clearInterval(drawTimer);
    }
  }, [gameStatus, ballsDrawn.length]);

  const getLetterForNumber = (num) => {
    if (num <= 15) return 'B';
    if (num <= 30) return 'I';
    if (num <= 45) return 'N';
    if (num <= 60) return 'G';
    return 'O';
  };

  const getBallColor = (letter) => {
    const colors = {
      'B': '#c0c0c0', // Plata
      'I': '#b0b8c0', // Gris acero claro
      'N': '#e0e8f0', // Blanco hielo
      'G': '#a8b8c8', // Azul gris
      'O': '#90a0b0'  // Gris azulado
    };
    return colors[letter] || '#c0c0c0';
  };

  // Organizar bolas por letra
  const letters = ['B', 'I', 'N', 'G', 'O'];
  const organizedBalls = letters.reduce((acc, letter) => {
    acc[letter] = ballsDrawn.filter(ball => ball.letter === letter);
    return acc;
  }, {});

  const isNumberCalled = (num) => {
    return ballsDrawn.some(ball => ball.number === num);
  };

  const isRecentBall = (num) => {
    const index = ballsDrawn.findIndex(ball => ball.number === num);
    return index >= ballsDrawn.length - 5;
  };

  // Cartones de ejemplo
  const [playerCards] = useState([
    {
      id: 'CARD-001-SV',
      numbers: {
        B: [3, 12, 7, 15, 1],
        I: [22, 28, 17, 30, 19],
        N: [33, 41, 0, 58, 44],
        G: [52, 47, 60, 55, 50],
        O: [68, 73, 65, 71, 69]
      }
    },
    {
      id: 'CARD-002-SV',
      numbers: {
        B: [8, 14, 2, 11, 5],
        I: [25, 18, 29, 21, 27],
        N: [38, 42, 0, 35, 48],
        G: [51, 59, 46, 53, 57],
        O: [70, 66, 74, 62, 72]
      }
    },
    {
      id: 'CARD-003-SV',
      numbers: {
        B: [4, 10, 13, 6, 9],
        I: [24, 20, 26, 16, 23],
        N: [40, 34, 0, 43, 39],
        G: [49, 56, 54, 61, 48],
        O: [67, 75, 63, 69, 71]
      }
    }
  ]);

  return (
    <div className="silver-room">
      {/* HEADER FUTURISTA */}
      <div className="silver-header">
        <div className="room-title-silver">
          <span className="title-icon-silver">🥈</span>
          <span className="title-text-chrome">SALA PLATA</span>
          <div className="title-chip">$1000</div>
        </div>

        <div className="game-info-silver">
          <div className="info-display-digital">
            <div className="digital-label">BOLAS SORTEADAS</div>
            <div className="digital-counter">
              <span className="counter-digit">{String(ballsDrawn.length).padStart(2, '0')}</span>
              <span className="counter-separator">/</span>
              <span className="counter-max">75</span>
            </div>
          </div>

          <div className={`status-led ${gameStatus}`}>
            <div className="led-ring"></div>
            <div className="led-core"></div>
            <div className="status-text-silver">
              {gameStatus === 'waiting' && 'STANDBY'}
              {gameStatus === 'active' && 'ACTIVO'}
              {gameStatus === 'ended' && 'FINALIZADO'}
            </div>
          </div>
        </div>
      </div>

      {/* MITAD SUPERIOR - LA MESA */}
      <div className="game-table-silver">
        {/* IZQUIERDA: PANEL HOLOGRÁFICO */}
        <div className="holographic-panel">
          <div className="glass-overlay"></div>
          <div className="grid-title-silver">
            <div className="title-chip-small">MATRIZ DE NÚMEROS</div>
          </div>

          <div className="holographic-grid">
            {letters.map(letter => (
              <div key={letter} className="holo-column">
                <div className="column-header-silver">
                  <span className="header-letter-chrome">{letter}</span>
                  <span className="header-range-silver">
                    {letter === 'B' && '1-15'}
                    {letter === 'I' && '16-30'}
                    {letter === 'N' && '31-45'}
                    {letter === 'G' && '46-60'}
                    {letter === 'O' && '61-75'}
                  </span>
                </div>

                <div className="holo-numbers">
                  {Array.from({ length: 15 }, (_, i) => {
                    const number = i + 1 + (letter === 'B' ? 0 : letter === 'I' ? 15 : letter === 'N' ? 30 : letter === 'G' ? 45 : 60);
                    const isCalled = organizedBalls[letter]?.some(b => b.number === number);
                    const isRecent = isRecentBall(number);

                    return (
                      <div 
                        key={number}
                        className={`holo-cell ${isCalled ? 'projected' : ''} ${isRecent ? 'pulsing' : ''}`}
                      >
                        <div className="cell-glass">
                          {isCalled && (
                            <div className="laser-number" style={{ color: '#00d4ff' }}>
                              {number}
                            </div>
                          )}
                          {!isCalled && (
                            <div className="dormant-number">{number}</div>
                          )}
                        </div>
                        {isCalled && <div className="cell-flare"></div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Panel de últimas bolas */}
          <div className="recent-panel-silver">
            <div className="panel-label-digital">ÚLTIMAS 10 BOLAS</div>
            <div className="recent-balls-digital">
              {ballsDrawn.slice(-10).reverse().map((ball, idx) => (
                <div key={idx} className="ball-chip-silver" style={{ backgroundColor: getBallColor(ball.letter) }}>
                  <span className="chip-letter">{ball.letter}</span>
                  <span className="chip-separator">-</span>
                  <span className="chip-number">{ball.number}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* DERECHA: BOLILLERO LEVITANTE */}
        <div className="magnetic-bingo-machine">
          <div className="levitation-chamber">
            {/* Campo magnético */}
            <div className="magnetic-field">
              {magneticField.map(particle => (
                <div 
                  key={particle.id}
                  className="field-particle"
                  style={{
                    transform: `rotate(${particle.angle}deg)`,
                    animationDuration: `${8 / particle.speed}s`
                  }}
                >
                  <div className="particle-dot"></div>
                </div>
              ))}
            </div>

            {/* Cápsula de vidrio templado */}
            <div className="tempered-glass-capsule">
              <div className="capsule-top"></div>
              <div className="capsule-body">
                <div className="chrome-ring top"></div>
                <div className="chrome-ring middle"></div>
                <div className="chrome-ring bottom"></div>

                {/* Área de visualización */}
                <div className="viewing-area">
                  {gameStatus === 'active' && !currentBall && (
                    <div className="levitation-effect">
                      <div className="energy-waves"></div>
                      <div className="magnetic-core"></div>
                    </div>
                  )}

                  {/* Bola actual */}
                  {currentBall && (
                    <div className="current-ball-silver">
                      <div className="metallic-ball">
                        <div className="ball-surface-chrome">
                          <div className="chrome-highlight"></div>
                          <div className="ball-data">
                            <div className="ball-letter-silver">{currentBall.letter}</div>
                            <div className="ball-number-silver">{currentBall.number}</div>
                          </div>
                        </div>
                        <div className="ball-shadow"></div>
                      </div>
                    </div>
                  )}

                  {/* Estado en espera */}
                  {gameStatus === 'waiting' && !currentBall && (
                    <div className="waiting-state-silver">
                      <div className="standby-icon">⏸</div>
                      <div className="standby-text">SISTEMA EN ESPERA</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="capsule-bottom"></div>
            </div>

            {/* Base magnética */}
            <div className="magnetic-base">
              <div className="base-plate top">
                <div className="plate-lights">
                  <div className="indicator-light blue"></div>
                  <div className="indicator-light cyan"></div>
                  <div className="indicator-light blue"></div>
                </div>
              </div>
              <div className="base-cylinder"></div>
              <div className="base-plate bottom">
                <div className="holo-label">SALA PLATA • 21:00 HS</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SEPARADOR METÁLICO */}
      <div className="steel-divider">
        <div className="divider-line"></div>
        <div className="divider-bolts">
          <div className="bolt"></div>
          <div className="bolt"></div>
          <div className="bolt"></div>
          <div className="bolt"></div>
        </div>
      </div>

      {/* MITAD INFERIOR - CARTONES DEL JUGADOR */}
      <div className="aluminum-cards-section">
        <div className="section-header-silver">
          <div className="header-bar">
            <span className="bar-icon">📋</span>
            <span className="bar-title">MIS CARTONES</span>
            <span className="bar-badge">{playerCards.length}</span>
          </div>
        </div>

        <div className="cards-scroll-silver">
          {playerCards.map((card, cardIndex) => (
            <div key={card.id} className="bingo-card-silver">
              {/* Marco de aluminio */}
              <div className="aluminum-frame">
                <div className="frame-bar top"></div>
                <div className="frame-bar right"></div>
                <div className="frame-bar bottom"></div>
                <div className="frame-bar left"></div>
              </div>

              {/* Superficie cepillada */}
              <div className="brushed-texture"></div>

              {/* Header del cartón */}
              <div className="card-header-silver">
                <div className="card-id-chip">
                  <span className="chip-hash">#</span>
                  <span className="chip-id">{card.id}</span>
                </div>
                <div className="card-barcode">
                  <div className="barcode-line"></div>
                  <div className="barcode-line"></div>
                  <div className="barcode-line"></div>
                  <div className="barcode-line"></div>
                  <div className="barcode-line"></div>
                </div>
              </div>

              {/* Grid del cartón */}
              <div className="card-grid-silver">
                {/* Letras */}
                <div className="card-letters-silver">
                  {letters.map(letter => (
                    <div key={letter} className="card-letter-silver" style={{ color: getBallColor(letter) }}>
                      {letter}
                    </div>
                  ))}
                </div>

                {/* Números */}
                <div className="card-numbers-grid-silver">
                  {letters.map(letter => (
                    <div key={letter} className="card-column-silver">
                      {card.numbers[letter].map((num, idx) => {
                        const isCalled = num !== 0 && isNumberCalled(num);
                        return (
                          <div 
                            key={idx}
                            className={`card-cell-silver ${num === 0 ? 'free' : ''} ${isCalled ? 'pressed' : ''}`}
                          >
                            {num === 0 ? (
                              <div className="laser-symbol">
                                <span className="symbol-star">✦</span>
                              </div>
                            ) : (
                              <>
                                <span className="cell-number-silver">{num}</span>
                                {isCalled && (
                                  <div className="steel-press">
                                    <div className="press-overlay"></div>
                                    <div className="press-glow"></div>
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

              {/* Footer del cartón */}
              <div className="card-footer-silver">
                <div className="footer-line"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TEST CONTROLS */}
      <div className="test-controls-silver">
        <button 
          className="chrome-button"
          onClick={() => setGameStatus(gameStatus === 'active' ? 'waiting' : 'active')}
        >
          <div className="button-surface">
            {gameStatus === 'active' ? '⏸ PAUSAR' : '▶ INICIAR'}
          </div>
        </button>
      </div>
    </div>
  );
}
