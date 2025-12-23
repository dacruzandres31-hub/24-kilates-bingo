import React from 'react';
import '../styles/BallHistory.css';

/**
 * BallHistory - Historial de bolas cantadas en cuadrícula
 * Muestra todas las bolas organizadas por letra (B-I-N-G-O)
 */
export default function BallHistory({ balls }) {
  // Organizar bolas por columna (B, I, N, G, O)
  const organizedBalls = {
    B: balls.filter(b => b.letter === 'B').sort((a, b) => a.number - b.number),
    I: balls.filter(b => b.letter === 'I').sort((a, b) => a.number - b.number),
    N: balls.filter(b => b.letter === 'N').sort((a, b) => a.number - b.number),
    G: balls.filter(b => b.letter === 'G').sort((a, b) => a.number - b.number),
    O: balls.filter(b => b.letter === 'O').sort((a, b) => a.number - b.number)
  };

  const getBallColor = (letter) => {
    const colors = {
      'B': '#4A90E2',
      'I': '#E74C3C',
      'N': '#F39C12',
      'G': '#2ECC71',
      'O': '#9B59B6'
    };
    return colors[letter];
  };

  const letters = ['B', 'I', 'N', 'G', 'O'];
  const ranges = {
    B: [1, 15],
    I: [16, 30],
    N: [31, 45],
    G: [46, 60],
    O: [61, 75]
  };

  return (
    <div className="ball-history">
      {/* Título */}
      <div className="history-header">
        <h2>📊 Bolas Cantadas</h2>
        <div className="total-balls">
          {balls.length} de 75
        </div>
      </div>

      {/* Cuadrícula de bolas */}
      <div className="history-grid">
        {letters.map(letter => (
          <div key={letter} className="history-column">
            {/* Encabezado de columna */}
            <div
              className="column-header"
              style={{ backgroundColor: getBallColor(letter) }}
            >
              <span className="header-letter">{letter}</span>
              <span className="header-range">
                {ranges[letter][0]}-{ranges[letter][1]}
              </span>
            </div>

            {/* Lista de números */}
            <div className="column-numbers">
              {[...Array(15)].map((_, i) => {
                const number = ranges[letter][0] + i;
                const isCalled = organizedBalls[letter].some(b => b.number === number);
                const ball = organizedBalls[letter].find(b => b.number === number);
                const isRecent = ball && ball.drawOrder === balls.length; // Última bola

                return (
                  <div
                    key={number}
                    className={`history-number ${isCalled ? 'called' : ''} ${isRecent ? 'recent' : ''}`}
                    style={{
                      '--ball-color': getBallColor(letter)
                    }}
                  >
                    {number}
                    {isCalled && <div className="check-mark">✓</div>}
                    {isRecent && <div className="pulse-ring"></div>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Últimas 6 bolas (horizontal) */}
      {balls.length > 0 && (
        <div className="recent-balls-bar">
          <span className="recent-label">ÚLTIMAS:</span>
          <div className="recent-balls-list">
            {balls.slice(-6).reverse().map((ball, index) => (
              <div
                key={`recent-${index}`}
                className="main-ball mini"
                style={{ '--ball-color': getBallColor(ball.letter) }}
              >
                <span className="ball-number">{ball.number}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
