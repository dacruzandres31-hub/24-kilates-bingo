import React, { useState, useEffect } from 'react';
import '../styles/BingoBallMachine.css';

/**
 * BingoBallMachine - Bolillero 3D animado con bolas girando
 * Muestra la última bola cantada con efecto de zoom elegante
 */
export default function BingoBallMachine({ lastBall, isActive, totalDrawn }) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [showingBall, setShowingBall] = useState(null);
  const [zoomEffect, setZoomEffect] = useState(false);

  useEffect(() => {
    if (lastBall && lastBall.drawOrder > totalDrawn - 1) {
      // Nueva bola cantada
      setIsSpinning(true);

      // Después de 1 segundo, mostrar la bola con zoom
      setTimeout(() => {
        setShowingBall(lastBall);
        setZoomEffect(true);
        setIsSpinning(false);
      }, 1000);

      // Quitar el zoom después de 2 segundos
      setTimeout(() => {
        setZoomEffect(false);
      }, 3000);
    }
  }, [lastBall]);

  const getBallColor = (letter) => {
    const colors = {
      'B': '#4A90E2', // Azul
      'I': '#E74C3C', // Rojo
      'N': '#F39C12', // Naranja
      'G': '#2ECC71', // Verde
      'O': '#9B59B6'  // Morado
    };
    return colors[letter] || '#95A5A6';
  };

  return (
    <div className="bingo-ball-machine">
      {/* Título */}
      <div className="machine-header">
        <h2>🎱 Bolillero</h2>
        <div className="ball-counter">
          {totalDrawn} / 90
        </div>
      </div>

      {/* Contenedor principal del bolillero */}
      <div className="machine-container">
        {/* Cámara de vidrio con bolas */}
        <div className={`machine-chamber ${isSpinning ? 'spinning' : ''}`}>
          {/* Bolas flotantes de fondo (decorativas) */}
          {isActive && !showingBall && (
            <div className="floating-balls">
              {[...Array(15)].map((_, i) => (
                <div
                  key={i}
                  className="floating-ball"
                  style={{
                    '--delay': `${i * 0.2}s`,
                    '--duration': `${3 + Math.random() * 2}s`,
                    '--x': `${Math.random() * 100}%`,
                    '--y': `${Math.random() * 100}%`
                  }}
                />
              ))}
            </div>
          )}

          {/* Bola actual (con zoom) */}
          {showingBall && (
            <div className={`current-ball-display ${zoomEffect ? 'zoom-in' : ''}`}>
              <div
                className="current-ball"
                style={{
                  '--ball-color': getBallColor(showingBall.letter)
                }}
              >
                <div className="ball-shine"></div>
                <div className="ball-letter">{showingBall.letter}</div>
                <div className="ball-number">{showingBall.number}</div>
              </div>

              {/* Texto decorativo */}
              <div className="ball-announcement">
                <span className="announcement-letter">{showingBall.letter}</span>
                <span className="announcement-separator">-</span>
                <span className="announcement-number">{showingBall.number}</span>
              </div>
            </div>
          )}

          {/* Estado de espera */}
          {!isActive && !showingBall && (
            <div className="machine-idle">
              <div className="idle-icon">🎱</div>
              <p>Esperando inicio...</p>
            </div>
          )}

          {/* Spinner mientras gira */}
          {isSpinning && (
            <div className="machine-spinning">
              <div className="spinner-icon">🌀</div>
              <p>Sorteando...</p>
            </div>
          )}
        </div>

        {/* Base del bolillero */}
        <div className="machine-base">
          <div className="base-top"></div>
          <div className="base-middle"></div>
          <div className="base-bottom"></div>
        </div>
      </div>

      {/* Última bola cantada (miniatura fija) */}
      {showingBall && !zoomEffect && (
        <div className="last-ball-mini">
          <span className="mini-label">Última:</span>
          <div
            className="mini-ball"
            style={{ backgroundColor: getBallColor(showingBall.letter) }}
          >
            {showingBall.letter}-{showingBall.number}
          </div>
        </div>
      )}
    </div>
  );
}
