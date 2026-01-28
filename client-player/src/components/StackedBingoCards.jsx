import React, { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { X, RefreshCw, Minimize2, Maximize2, Target } from 'lucide-react';
import ProgressBar from './ProgressBar';
import VirtualizedCardList from './VirtualizedCardList';
import { useAdaptiveDebounce } from '../hooks/useDebounce';
import soundManager from '../utils/soundManager';
import hapticManager from '../utils/hapticManager';
import { calculateWinProbability, analyzeCardProbability } from '../utils/probabilityUtils';
import '../styles/StackedBingoCards.css';
import '../styles/Animations.css';

// Lazy load de componentes de efectos visuales (no son críticos para el render inicial)
const ConfettiEffect = lazy(() => import('./ConfettiEffect'));
const ParticleEffect = lazy(() => import('./ParticleEffect'));

/**
 * StackedBingoCards - Vista apilada inteligente de cartones
 * 
 * Features:
 * - Ordenamiento automático por progreso (mejor cartón arriba)
 * - Alertas contextuales en tiempo real
 * - Animaciones suaves de reordenamiento
 * - Click para expandir cartón individual
 * - Auto-refresh cuando se canta número
 */

export default function StackedBingoCards({ gameSessionId, socket, onCardSelect }) {
  const [cardsData, setCardsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedCard, setExpandedCard] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [lastBallCount, setLastBallCount] = useState(0);
  const refreshTimeoutRef = useRef(null);

  // Estados para efectos visuales
  const [showConfetti, setShowConfetti] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [confettiType, setConfettiType] = useState('bingo');

  // Estado para Modo Focus
  const [focusMode, setFocusMode] = useState(false);

  // Debounce adaptativo basado en cantidad de cartones
  const cardCount = cardsData?.cards?.length || 0;
  const debounceDelay = useAdaptiveDebounce(cardCount);

  // Fetch análisis de cartones (memoizado con useCallback)
  const fetchCardsAnalysis = useCallback(async () => {
    if (!gameSessionId) {
      console.warn('[StackedCards] No gameSessionId provided');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/game/my-cards-analysis/${gameSessionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setCardsData(data);
        setLastBallCount(data.meta?.ballsDrawn || 0);
        setLoading(false);
      }
    } catch (error) {
      console.error('[StackedCards] Error fetching analysis:', error);
      setLoading(false);
    }
  }, [gameSessionId]);

  // Initial fetch
  useEffect(() => {
    fetchCardsAnalysis();
  }, [gameSessionId]);

  // Socket.IO: Actualizar cuando se canta número O cuando llega reordenamiento
  useEffect(() => {
    if (!socket) return;

    const handleBallDrawn = (data) => {
      console.log('[StackedCards] Ball drawn:', data.ballNumber || data.number);

      // Debounce: Esperar 500ms antes de refetch (por si vienen varios números seguidos)
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = setTimeout(() => {
        fetchCardsAnalysis();
      }, 500);
    };

    // NUEVO: Escuchar evento de reordenamiento directo desde backend
    const handleCardsReordered = (data) => {
      console.log('[StackedCards] Cards reordered (WebSocket):', data);

      // Cancelar debounce si existe
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      // Actualizar directamente con los datos del backend (sin fetch adicional)
      if (data.cards && data.cards.length > 0) {
        setCardsData({
          success: true,
          cards: data.cards,
          alerts: data.alerts || [],
          summary: data.summary || {
            totalCards: data.cards.length,
            totalMarked: 0,
            averageProgress: data.summary?.averageProgress || 0
          },
          meta: {
            gameSessionId: data.gameSessionId,
            totalCards: data.cards.length,
            ballsDrawn: lastBallCount + 1,
            lastBall: null
          }
        });
        setLastBallCount(lastBallCount + 1);

        // Reproducir sonido al marcar número
        soundManager.playMarkSound();
        hapticManager.vibrateMark();
      }
    };

    socket.on('ball_drawn', handleBallDrawn);
    socket.on('number_drawn', handleBallDrawn); // Alias
    socket.on('cards_reordered', handleCardsReordered); // NUEVO

    // Listener para ganadores (disparar efectos visuales)
    const handleWinnerDetected = (data) => {
      console.log('[StackedCards] Winner detected:', data);

      if (data.type === 'BINGO') {
        setConfettiType('bingo');
        setShowConfetti(true);
        soundManager.playBingoSound();
        hapticManager.vibrateBingo();
        setTimeout(() => setShowConfetti(false), 3500);
      } else if (data.type === 'LINEA') {
        setShowParticles(true);
        soundManager.playLineSound();
        hapticManager.vibrateLine();
        setTimeout(() => setShowParticles(false), 2500);
      }
    };

    socket.on('winner_detected', handleWinnerDetected);

    return () => {
      socket.off('ball_drawn', handleBallDrawn);
      socket.off('number_drawn', handleBallDrawn);
      socket.off('cards_reordered', handleCardsReordered);
      socket.off('winner_detected', handleWinnerDetected);
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [socket, gameSessionId, lastBallCount]);

  // Handlers
  const handleCardClick = (card) => {
    if (expandedCard === card.cardId) {
      setExpandedCard(null);
      if (onCardSelect) onCardSelect(null);
    } else {
      setExpandedCard(card.cardId);
      if (onCardSelect) onCardSelect(card);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchCardsAnalysis();
  };

  const handleCollapseAll = () => {
    setExpandedCard(null);
    if (onCardSelect) onCardSelect(null);
  };

  // Loading state
  if (loading) {
    return (
      <div className="stacked-cards-loader">
        <div className="spinner"></div>
        <p>Analizando tus cartones...</p>
      </div>
    );
  }

  // No cards state
  if (!cardsData || cardsData.cards.length === 0) {
    return (
      <div className="no-cards">
        <p>No tienes cartones en esta partida</p>
        <button onClick={() => window.location.reload()} className="btn-buy-card">
          Comprar Cartón
        </button>
      </div>
    );
  }

  const { cards, alerts, summary, meta } = cardsData;

  // Filtrar cartones según modo focus
  const displayCards = useMemo(() => {
    if (!cards || cards.length === 0) return [];
    // En modo focus, mostrar solo el mejor cartón (el primero, ya vienen ordenados)
    return focusMode ? [cards[0]] : cards;
  }, [cards, focusMode]);

  return (
    <>
      {/* Efectos Visuales (lazy-loaded) */}
      <Suspense fallback={null}>
        <ConfettiEffect isActive={showConfetti} type={confettiType} />
        <ParticleEffect isActive={showParticles} />
      </Suspense>

      <div className={`stacked-cards-container ${isCollapsed ? 'collapsed' : ''}`}>
        {/* Header con controles */}
        <div className="stacked-cards-header">
          <h3>Mis Cartones ({summary.totalCards})</h3>
          <div className="header-controls">
            <button
              onClick={handleRefresh}
              className="btn-icon"
              title="Actualizar"
            >
              <RefreshCw size={18} />
            </button>
            <button
              onClick={() => setFocusMode(!focusMode)}
              className={`btn-icon ${focusMode ? 'active' : ''}`}
              title={focusMode ? "Mostrar todos los cartones" : "Modo Focus - Solo mejor cartón"}
            >
              <Target size={18} />
            </button>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="btn-icon"
              title={isCollapsed ? 'Expandir' : 'Minimizar'}
            >
              {isCollapsed ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
            </button>
          </div>
        </div>

        {!isCollapsed && (
          <>
            {/* Alertas Contextuales */}
            {alerts && alerts.length > 0 && (
              <div className="alerts-panel">
                {alerts.map((alert, index) => (
                  <div key={index} className={`alert alert-${alert.type}`}>
                    <span className="alert-icon">{alert.icon}</span>
                    <span className="alert-message">{alert.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Barra de Resumen */}
            <div className="summary-bar">
              <div className="summary-item">
                <span className="label">Cartones</span>
                <span className="value">{summary.totalCards}</span>
              </div>
              <div className="summary-item">
                <span className="label">Cantados</span>
                <span className="value">{meta.ballsDrawn}</span>
              </div>
              {meta.lastBall && (
                <div className="summary-item">
                  <span className="label">Último</span>
                  <span className="value last-ball">{meta.lastBall}</span>
                </div>
              )}
              <div className="summary-item">
                <span className="label">Promedio</span>
                <span className="value">{summary.averageProgress?.toFixed(1)}%</span>
              </div>
            </div>

            {/* Cartones Apilados */}
            <div className="cards-stack-wrapper">
              <div className="cards-stack">
                {displayCards.map((card, index) => {
                  const { viewConfig } = card;
                  const isExpanded = expandedCard === card.cardId;
                  const isTop = viewConfig.isTop;

                  // Análisis de probabilidad para cartones simplificados (stacked)
                  const markedSet = new Set(cardsData.metadata?.drawnNumbers || []);
                  const prob = analyzeCardProbability(card.gridNumbers, markedSet);

                  // Detectar si el cartón está a 1 número de ganar línea
                  const isAlmostWinning = card.lineAnalysis?.some(
                    line => line.missing === 1 && !line.isComplete
                  );

                  // Encontrar números faltantes para líneas casi completas
                  const missingForWin = card.lineAnalysis
                    ?.filter(line => line.missing === 1 && !line.isComplete)
                    .flatMap(line => line.missingNumbers) || [];

                  return (
                    <div
                      key={card.cardId}
                      className={`bingo-card-stacked ${isExpanded ? 'expanded' : ''} ${isTop ? 'top-card' : ''} ${isAlmostWinning ? 'card-almost-winning' : ''}`}
                      style={{
                        zIndex: isExpanded ? 9999 : viewConfig.zIndex,
                        transform: isExpanded
                          ? 'translate(-50%, -50%) scale(1.05)'
                          : `translate(-50%, ${viewConfig.offsetY}px) translateX(${viewConfig.offsetX}px)`,
                        opacity: isExpanded ? 1 : viewConfig.opacity,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                      onClick={() => handleCardClick(card)}
                    >
                      {/* Badge de posición y progreso */}
                      <div className="card-badges">
                        <span className="badge-position">#{index + 1}</span>
                        <span className="badge-progress">{card.progress}%</span>
                        {prob && (
                          <span
                            className="badge-probability"
                            style={{ backgroundColor: prob.line.color }}
                            title={`Victoria: ${prob.line.percentage}%`}
                          >
                            {prob.line.icon} {prob.line.label}
                          </span>
                        )}
                        {isTop && <span className="badge-best">★ MEJOR</span>}
                        {isAlmostWinning && <span className="badge-almost-winning">⚡ CASI</span>}
                      </div>

                      {/* Cerrar expandido */}
                      {isExpanded && (
                        <button
                          className="btn-close-expanded"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCardClick(card);
                          }}
                        >
                          <X size={20} />
                        </button>
                      )}

                      {/* Grid del cartón */}
                      <div className="bingo-grid">
                        <div className="grid-header">
                          <span>B</span>
                          <span>I</span>
                          <span>N</span>
                          <span>G</span>
                          <span>O</span>
                        </div>

                        {card.markedPositions && renderGrid(card.markedPositions, missingForWin)}
                      </div>

                      {/* Información de líneas cercanas (solo cartón superior o expandido) */}
                      {(isTop || isExpanded) && card.lineAnalysis && (
                        <div className="card-info">
                          <div className="almost-lines">
                            {card.lineAnalysis
                              .filter(l => l.almostComplete && !l.isComplete)
                              .slice(0, isExpanded ? 5 : 2)
                              .map((line, idx) => (
                                <div key={idx} className="line-hint">
                                  <span className="line-name">{line.name}</span>
                                  <span className="line-missing">
                                    {line.missing === 1 ? '¡1 número!' : `${line.missing} números`}
                                    {isExpanded && ` (${line.missingNumbers.join(', ')})`}
                                  </span>
                                </div>
                              ))}
                            {card.lineAnalysis.filter(l => l.isComplete).length > 0 && (
                              <div className="line-hint complete">
                                <span className="line-name">✅ Líneas completas</span>
                                <span className="line-missing">
                                  {card.lineAnalysis.filter(l => l.isComplete).length}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Score (solo si está expandido) */}
                      {isExpanded && (
                        <div className="card-score">
                          <span className="score-label">Score:</span>
                          <span className="score-value">{card.score}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Controles inferiores */}
            <div className="controls">
              <button onClick={handleCollapseAll} className="btn-control">
                Colapsar Todo
              </button>
              {expandedCard && (
                <button
                  onClick={() => handleCardClick(cards.find(c => c.cardId === expandedCard))}
                  className="btn-control btn-primary"
                >
                  Volver a Vista Normal
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

// Helper: Renderizar grid 5x5
const renderGrid = (positions, missingForWin = []) => {
  const rows = [];
  const missingSet = new Set(missingForWin);

  for (let row = 0; row < 5; row++) {
    const cells = [];
    for (let col = 0; col < 5; col++) {
      const pos = positions.find(p => p.row === row && p.col === col);
      const isFree = row === 2 && col === 2;
      const isMarked = pos?.marked || isFree;
      const number = isFree ? 'FREE' : pos?.number;
      const isMissingForWin = !isFree && missingSet.has(number);

      cells.push(
        <div
          key={`${row}-${col}`}
          className={`grid-cell ${isMarked ? 'marked' : ''} ${isFree ? 'free' : ''} ${isMissingForWin ? 'missing-for-win' : ''}`}
        >
          {isFree ? '★' : number}
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
