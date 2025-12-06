import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './StackedCards.css'; // Estilos al final

/**
 * COMPONENTE: Vista Apilada de Cartones con Ordenamiento Inteligente
 * 
 * Características:
 * - Cartones apilados como cartas de poker
 * - Ordenamiento automático por progreso
 * - Alertas en tiempo real: "4 cartones a 2 números de línea"
 * - Actualización cada vez que se canta un número
 * - Animaciones suaves al reordenar
 */

const StackedBingoCards = ({ gameSessionId, socket }) => {
  const [cardsData, setCardsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedCard, setExpandedCard] = useState(null);

  // Fetch inicial de análisis
  useEffect(() => {
    fetchCardsAnalysis();
  }, [gameSessionId]);

  // Socket.IO: Actualizar cuando se canta un número
  useEffect(() => {
    if (!socket) return;

    socket.on('ball_drawn', (data) => {
      console.log('Número cantado:', data.ballNumber);
      fetchCardsAnalysis(); // Re-analizar cartones
    });

    return () => {
      socket.off('ball_drawn');
    };
  }, [socket]);

  const fetchCardsAnalysis = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/game/my-cards-analysis/${gameSessionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCardsData(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error al obtener análisis:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="stacked-cards-loader">
        <div className="spinner"></div>
        <p>Analizando tus cartones...</p>
      </div>
    );
  }

  if (!cardsData || cardsData.cards.length === 0) {
    return (
      <div className="no-cards">
        <p>No tienes cartones en esta partida</p>
      </div>
    );
  }

  const { cards, alerts, summary, meta } = cardsData;

  return (
    <div className="stacked-cards-container">
      {/* Alertas Contextuales */}
      <div className="alerts-panel">
        {alerts.map((alert, index) => (
          <div key={index} className={`alert alert-${alert.type}`}>
            <span className="alert-icon">{alert.icon}</span>
            <span className="alert-message">{alert.message}</span>
          </div>
        ))}
      </div>

      {/* Resumen */}
      <div className="summary-bar">
        <div className="summary-item">
          <span className="label">Cartones:</span>
          <span className="value">{summary.totalCards}</span>
        </div>
        <div className="summary-item">
          <span className="label">Números cantados:</span>
          <span className="value">{meta.ballsDrawn}</span>
        </div>
        <div className="summary-item">
          <span className="label">Último número:</span>
          <span className="value last-ball">{meta.lastBall || '-'}</span>
        </div>
        <div className="summary-item">
          <span className="label">Progreso promedio:</span>
          <span className="value">{summary.averageProgress.toFixed(1)}%</span>
        </div>
      </div>

      {/* Cartones Apilados */}
      <div className="cards-stack">
        {cards.map((card, index) => {
          const { viewConfig } = card;
          const isExpanded = expandedCard === card.cardId;

          return (
            <div
              key={card.cardId}
              className={`bingo-card-wrapper ${isExpanded ? 'expanded' : ''} ${viewConfig.isTop ? 'top-card' : ''}`}
              style={{
                zIndex: viewConfig.zIndex,
                transform: isExpanded 
                  ? 'translateY(0) translateX(0) scale(1.1)'
                  : `translateY(${viewConfig.offsetY}px) translateX(${viewConfig.offsetX}px)`,
                opacity: isExpanded ? 1 : viewConfig.opacity,
                transition: 'all 0.3s ease-out'
              }}
              onClick={() => setExpandedCard(isExpanded ? null : card.cardId)}
            >
              {/* Badge de progreso */}
              <div className="card-badge">
                <span className="badge-score">#{index + 1}</span>
                <span className="badge-progress">{card.progress}%</span>
              </div>

              {/* Grid del cartón */}
              <div className="bingo-grid">
                <div className="grid-header">
                  <span>B</span>
                  <span>I</span>
                  <span>N</span>
                  <span>G</span>
                  <span>O</span>
                </div>

                {card.markedPositions && renderGrid(card.markedPositions)}
              </div>

              {/* Líneas casi completas */}
              {viewConfig.isTop && (
                <div className="almost-lines">
                  {card.lineAnalysis
                    .filter(l => l.almostComplete && !l.isComplete)
                    .slice(0, 3)
                    .map((line, idx) => (
                      <div key={idx} className="line-hint">
                        <span className="line-name">{line.name}</span>
                        <span className="line-missing">
                          Faltan: {line.missingNumbers.join(', ')}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Controles */}
      <div className="controls">
        <button onClick={fetchCardsAnalysis} className="btn-refresh">
          🔄 Actualizar
        </button>
        <button onClick={() => setExpandedCard(null)} className="btn-collapse">
          📚 Colapsar Todo
        </button>
      </div>
    </div>
  );
};

// Helper: Renderizar grid 5x5
const renderGrid = (positions) => {
  const rows = [];
  for (let row = 0; row < 5; row++) {
    const cells = [];
    for (let col = 0; col < 5; col++) {
      const pos = positions.find(p => p.row === row && p.col === col);
      cells.push(
        <div
          key={`${row}-${col}`}
          className={`grid-cell ${pos?.marked ? 'marked' : ''} ${pos?.number === 'FREE' ? 'free' : ''}`}
        >
          {pos?.number === 'FREE' ? '★' : pos?.number}
        </div>
      );
    }
    rows.push(
      <div key={row} className="grid-row">
        {cells}
      </div>
    );
  }
  return rows;
};

export default StackedBingoCards;

/* ========================================
   ESTILOS CSS (StackedCards.css)
   ======================================== */

/*
.stacked-cards-container {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  position: relative;
}

.alerts-panel {
  margin-bottom: 20px;
}

.alert {
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 500;
  animation: slideIn 0.3s ease-out;
}

.alert-critical {
  background: linear-gradient(135deg, #ff4444, #ff6b6b);
  color: white;
  box-shadow: 0 4px 12px rgba(255, 68, 68, 0.3);
}

.alert-warning {
  background: linear-gradient(135deg, #ffaa00, #ffcc44);
  color: #333;
}

.alert-info {
  background: linear-gradient(135deg, #4a90e2, #67b5ff);
  color: white;
}

.alert-success {
  background: linear-gradient(135deg, #28a745, #5cb85c);
  color: white;
}

.alert-super-critical {
  background: linear-gradient(135deg, #e91e63, #ff6090);
  color: white;
  border: 2px solid gold;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

.summary-bar {
  display: flex;
  justify-content: space-between;
  background: #f8f9fa;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-item .label {
  font-size: 11px;
  color: #666;
  text-transform: uppercase;
}

.summary-item .value {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.value.last-ball {
  color: #e91e63;
  font-size: 24px;
}

.cards-stack {
  position: relative;
  height: 500px;
  margin-bottom: 20px;
}

.bingo-card-wrapper {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 400px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: all 0.3s ease-out;
}

.bingo-card-wrapper:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

.bingo-card-wrapper.expanded {
  z-index: 9999 !important;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(1.1) !important;
  width: 95%;
  max-width: 450px;
}

.top-card {
  border: 3px solid #4CAF50;
}

.card-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 8px;
}

.badge-score {
  background: #333;
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.badge-progress {
  background: linear-gradient(135deg, #4CAF50, #8BC34A);
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.bingo-grid {
  padding: 20px;
}

.grid-header {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  margin-bottom: 8px;
  font-weight: bold;
  font-size: 18px;
  text-align: center;
  color: #4a90e2;
}

.grid-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  margin-bottom: 4px;
}

.grid-cell {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  border-radius: 6px;
  font-weight: 600;
  font-size: 16px;
  transition: all 0.2s;
}

.grid-cell.marked {
  background: linear-gradient(135deg, #4CAF50, #8BC34A);
  color: white;
  box-shadow: 0 2px 4px rgba(76, 175, 80, 0.3);
}

.grid-cell.free {
  background: gold;
  color: #333;
  font-size: 24px;
}

.almost-lines {
  padding: 12px 20px;
  background: #fff3cd;
  border-top: 1px solid #ffc107;
}

.line-hint {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 13px;
}

.line-name {
  font-weight: bold;
  color: #333;
}

.line-missing {
  color: #666;
}

.controls {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.btn-refresh, .btn-collapse {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-refresh {
  background: #4a90e2;
  color: white;
}

.btn-collapse {
  background: #666;
  color: white;
}

.btn-refresh:hover, .btn-collapse:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

@keyframes slideIn {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.stacked-cards-loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #4a90e2;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
*/
