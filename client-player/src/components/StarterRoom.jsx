import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/StarterRoom.css';
import GiftIcon from '../assets/Gift_icon.png';
import selectCardsButton from '../assets/select_cards_button.png';
import voiceService from '../services/voiceService';
import audioService from '../services/audioService';
import PlayerSidebar from './PlayerSidebar';
import CardSelectionLobby from './CardSelectionLobby';

export default function StarterRoom() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [ballsDrawn, setBallsDrawn] = useState([]);
  const [lastBall, setLastBall] = useState(null);
  const [gameStatus, setGameStatus] = useState('waiting'); // waiting, active, ended
  const [previousGameStatus, setPreviousGameStatus] = useState('waiting'); // Para detectar cambios
  const [currentBall, setCurrentBall] = useState(null);
  const [floatingBalls, setFloatingBalls] = useState([]);
  const [almostLineCards, setAlmostLineCards] = useState([]); // Cartones a 2 bolillas de línea
  const [expandedCard, setExpandedCard] = useState(null); // Cartón expandido actualmente
  const [lastHitCard, setLastHitCard] = useState(null); // Último cartón con acierto
  const [winnerCards, setWinnerCards] = useState([]); // Cartones ganadores con línea completa
  const [showVoiceSelector, setShowVoiceSelector] = useState(false); // Selector de voz
  const [availableVoices, setAvailableVoices] = useState([]); // Voces disponibles
  const [currentVoice, setCurrentVoice] = useState(null); // Voz actual
  const [audioStatus, setAudioStatus] = useState({ musicEnabled: true, efectosEnabled: true }); // Estado UI audio
const [lineCelebrated, setLineCelebrated] = useState(false); // ¿Ya se festejó la línea?
const [pauseTimeout, setPauseTimeout] = useState(null); // Controlar pausa automática
const [highlightedLine, setHighlightedLine] = useState(null); // Línea a resaltar
const [sidebarOpen, setSidebarOpen] = useState(false); // Estado del sidebar
const [showCardSelection, setShowCardSelection] = useState(false); // Mostrar lobby de selección de cartones
const [selectedPlayerCards, setSelectedPlayerCards] = useState([]); // Cartones seleccionados por el jugador
const [cardsRemaining, setCardsRemaining] = useState(20); // Cartones que faltan por seleccionar

// Efectos de festejo (fuera del componente o arriba)
const celebrationAudio = new Audio('/audio/celebration.mp3');
celebrationAudio.volume = 0.7;

  // Verificar cartones existentes del jugador al montar
  useEffect(() => {
    const checkExistingCards = async () => {
      try {
        const response = await fetch(`/api/game/starter/my-cards/${sessionId || 'starter_default'}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          const currentCards = data.cards || [];
          
          console.log('🔍 DEBUG - Cartones cargados desde /my-cards:', currentCards.map(c => ({
            id: c.id,
            serial: c.serial,
            hasSerial: !!c.serial,
            hasNumbers: !!c.numbers
          })));
          
          setSelectedPlayerCards(currentCards);
          const remaining = 20 - currentCards.length;
          setCardsRemaining(remaining);
          
          // Si tiene menos de 20, mostrar botón para seleccionar más
          if (remaining > 0) {
            console.log(`📋 Tiene ${currentCards.length} cartones, faltan ${remaining}`);
          } else {
            console.log('✅ Ya tiene 20 cartones completos');
          }
        }
      } catch (error) {
        console.log('Sin cartones previos');
        setCardsRemaining(20);
      }
    };
    
    checkExistingCards();
  }, [sessionId]);

  // Generar número de serie del cartón: DDMMYY-S0001
  const generateCardSerial = (cardIndex, roomLetter = 'S') => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const cardNumber = String(cardIndex + 1).padStart(4, '0');
    return `${day}${month}${year}-${roomLetter}${cardNumber}`;
  };

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

    // Activar audio en primer click
    let activated = false;
    const handleClick = () => {
      if (!activated) {
        activated = true;
        audioService.playForRoom('starter');
        document.removeEventListener('click', handleClick);
      }
    };
    
    document.addEventListener('click', handleClick);

    // Cargar voces disponibles
    setTimeout(() => {
      const voices = voiceService.getSpanishVoices();
      setAvailableVoices(voices);
      setCurrentVoice(voiceService.getCurrentVoice());
    }, 500);
    
    return () => {
      document.removeEventListener('click', handleClick);
    };
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

  // Usar cartones seleccionados por el jugador (si hay)
  const playerCards = selectedPlayerCards.length > 0 ? selectedPlayerCards : [];

  // Handlers para selección de cartones
  const handleCardsSelected = (reservedCards) => {
    console.log('🔍 DEBUG - Cartones recibidos del backend:', reservedCards.map(c => ({
      id: c.id,
      serial: c.serial,
      hasSerial: !!c.serial
    })));
    
    // Combinar cartones existentes con nuevos
    const allCards = [...selectedPlayerCards, ...reservedCards];
    setSelectedPlayerCards(allCards);
    
    console.log('🔍 DEBUG - Todos los cartones después de combinar:', allCards.map(c => ({
      id: c.id,
      serial: c.serial,
      hasSerial: !!c.serial
    })));
    
    const remaining = 20 - allCards.length;
    setCardsRemaining(remaining);
    setShowCardSelection(false);
    console.log(`✅ Total de cartones: ${allCards.length}, faltan: ${remaining}`);
  };

  const handleCancelSelection = () => {
    // Volver al lobby si no tiene cartones
    if (selectedPlayerCards.length === 0) {
      navigate('/lobby');
    } else {
      setShowCardSelection(false);
    }
  };

  const isNumberCalled = (number) => {
    return ballsDrawn.some(ball => ball.number === number);
  };

  // Calcular progreso del cartón (números marcados de 15 totales)
  const getCardProgress = (card) => {
    const allNumbers = card.numbers.flat().filter(n => n !== null && n !== undefined);
    const markedNumbers = allNumbers.filter(num => isNumberCalled(num));
    return markedNumbers.length; // Retorna cantidad de números marcados (de 15)
  };

  // Expandir cartón (por click o por acierto)
  const expandCard = (cardId) => {
    setExpandedCard(cardId);
    setTimeout(() => {
      setExpandedCard(null);
    }, 3500); // 3.5 segundos expandido
  };

  // Detectar cuando un número coincide con un cartón
  useEffect(() => {
    if (ballsDrawn.length > 0) {
      const latestBall = ballsDrawn[ballsDrawn.length - 1];
      
      // Buscar cartones que tienen este número
      playerCards.forEach(card => {
        const hasNumber = card.numbers.flat().includes(latestBall.number);
        if (hasNumber && expandedCard !== card.id) {
          setLastHitCard(card.id);
          expandCard(card.id);
        }
      });
    }
  }, [ballsDrawn]);

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

  // Detectar cartones a 1-2 números de línea y líneas completas
  useEffect(() => {
  if (ballsDrawn.length === 0) {
    setAlmostLineCards([]);
    setWinnerCards([]);
    setLineCelebrated(false);
    setHighlightedLine(null);
    return;
  }

  const cardsAlmostThere = [];
  const cardsWithWinningLines = [];

  playerCards.forEach(card => {
    const linesStatus = checkLineStatus(card);
    const almostLines = linesStatus.filter(line => line.missing === 1 || line.missing === 2);
    const completedLines = linesStatus.filter(line => line.missing === 0);

    if (almostLines.length > 0) {
      const minMissing = Math.min(...almostLines.map(line => line.missing));
      cardsAlmostThere.push({
        cardId: card.id,
        almostLineCount: almostLines.length,
        lines: almostLines,
        minMissing: minMissing
      });
    }

    if (completedLines.length > 0) {
      cardsWithWinningLines.push({
        cardId: card.id,
        cardSerial: card.serial || generateCardSerial(playerCards.indexOf(card)),
        lineCount: completedLines.length,
        lines: completedLines,
        card // importante para renderizado
      });
    }
  });

  setAlmostLineCards(cardsAlmostThere);

  // Mostrar celebración si hay nuevos ganadores y no se festejó la línea
  if (
    cardsWithWinningLines.length > winnerCards.length &&
    !lineCelebrated &&
    cardsWithWinningLines.length > 0
  ) {
    setWinnerCards(cardsWithWinningLines);
    setLineCelebrated(true);
    // Anunciar línea ganadora
    voiceService.speak('Ganaste Línea');
    // Reproducir efectos de festejo
    celebrationAudio.currentTime = 0;
celebrationAudio.play();
    // Pausar sorteo 20 segundos y cerrar modal automáticamente
    if (gameStatus === 'active') {
      setGameStatus('waiting');
      const timeout = setTimeout(() => {
        setGameStatus('active');
        setWinnerCards([]);
        setHighlightedLine(null);
      }, 20000);
      setPauseTimeout(timeout);
    }
    // Resaltar la línea ganadora (primera del primer cartón)
    if (cardsWithWinningLines[0]?.lines?.length > 0) {
      setHighlightedLine(cardsWithWinningLines[0].lines[0].numbers);
    }
  }
}, [ballsDrawn, playerCards]);

useEffect(() => {
  return () => {
    if (pauseTimeout) clearTimeout(pauseTimeout);
  };
}, [pauseTimeout]);

  // Detectar cambios en el estado del juego y anunciar
  useEffect(() => {
    if (gameStatus === 'active' && previousGameStatus === 'waiting') {
      voiceService.announceSorteoIniciado();
    } else if (gameStatus === 'waiting' && previousGameStatus === 'active') {
      voiceService.announceSorteoPausado();
    } else if (gameStatus === 'active' && previousGameStatus === 'paused') {
      voiceService.announceSorteoReiniciado();
    }
    setPreviousGameStatus(gameStatus);
  }, [gameStatus]);

  // Anunciar número cantado
  useEffect(() => {
    if (ballsDrawn.length > 0 && gameStatus === 'active') {
      const lastDrawnBall = ballsDrawn[ballsDrawn.length - 1];
      
      // Anunciar el número con voz
      setTimeout(() => {
        voiceService.announceNumber(lastDrawnBall.number);
      }, 500);
    }
  }, [ballsDrawn.length, gameStatus]);

  return (
    <div className="starter-room">
      {/* Lobby de selección de cartones (overlay sobre la sala) */}
      {showCardSelection && (
        <CardSelectionLobby
          sessionId={sessionId || 'starter_default'}
          onCardsSelected={handleCardsSelected}
          onCancel={handleCancelSelection}
          maxCards={cardsRemaining}
          currentCards={selectedPlayerCards.length}
          timeWindow="open"
        />
      )}

      {/* Sala de juego (solo visible después de seleccionar cartones) */}
      {!showCardSelection && (
        <>
          {/* Sidebar con información del jugador */}
          <PlayerSidebar 
            isOpen={sidebarOpen} 
            onToggle={() => setSidebarOpen(!sidebarOpen)} 
          />

          {/* CELEBRACIÓN DE LÍNEA GANADORA */}
          {winnerCards.length > 0 && (
  <div className="winner-celebration-overlay">
    <div className="celebration-content">
      <div className="celebration-title">🎉 ¡LÍNEA! 🎉</div>
      <div className="celebration-message">
        {winnerCards.length === 1 
          ? `¡Ganaste con el cartón ${winnerCards[0].cardSerial}!`
          : `¡${winnerCards.length} cartones ganadores!`}
      </div>
      {/* Mostrar cartón completo y línea resaltada */}
      {winnerCards[0] && (
        <div className="celebration-card-expanded">
          <div className="card-header">
            <span className="card-number">N° Serie: {winnerCards[0].cardSerial}</span>
          </div>
          <div className="card-grid card-grid-90">
            {winnerCards[0].card.numbers.map((row, rowIdx) => (
              <div key={rowIdx} className="card-row">
                {row.map((num, colIdx) => {
                  const isEmpty = num === null || num === undefined;
                  const isLineCell = highlightedLine && highlightedLine.includes(num);
                  return (
                    <div
                      key={colIdx}
                      className={`card-cell ${isEmpty ? 'empty' : ''} ${isLineCell ? 'highlighted-line' : ''}`}
                    >
                      {isEmpty ? (
                        <span className="empty-space"></span>
                      ) : (
                        <span className="cell-number">{num}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    <div className="confetti-container">
      {Array.from({ length: 50 }).map((_, i) => (
        <div 
          key={i} 
          className="confetti"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            backgroundColor: getBallColor(Math.floor(Math.random() * 90) + 1)
          }}
        />
      ))}
    </div>
  </div>
)}

      {/* LAYOUT REORGANIZADO */}
      <div className="game-table">
        {/* Cuadrícula Digital - IZQUIERDA COMPLETA - 3 FILAS */}
        <div className="digital-grid-full">
          <div className="grid-header">
            <div className="grid-title">NÚMEROS CANTADOS</div>
            <div className="grid-glow"></div>
          </div>
          
          {/* FILA 1: 1-10, 11-20, 21-30 */}
          <div className="grid-row">
            {[0, 1, 2].map(columnIndex => {
              const start = columnIndex * 10 + 1;
              const end = (columnIndex + 1) * 10;
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
                    {Array.from({ length: 10 }, (_, i) => {
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

          {/* FILA 2: 31-40, 41-50, 51-60 */}
          <div className="grid-row">
            {[3, 4, 5].map(columnIndex => {
              const start = columnIndex * 10 + 1;
              const end = (columnIndex + 1) * 10;
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
                    {Array.from({ length: 10 }, (_, i) => {
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

          {/* FILA 3: 61-70, 71-80, 81-90 */}
          <div className="grid-row">
            {[6, 7, 8].map(columnIndex => {
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
        </div>

        {/* Sección derecha: Título/Info arriba, Bolillero abajo */}
        <div className="right-section">
          {/* Info superior */}
          <div className="side-info">
            <div className="room-title">
              <img src={GiftIcon} alt="Gift" className="title-icon" />
              <span className="title-text" style={{ 
                color: '#00d4ff',
                textShadow: '0 0 20px rgba(0, 212, 255, 1), 0 0 40px rgba(0, 212, 255, 0.8)',
                WebkitTextFillColor: '#00d4ff'
              }}>SALA STARTER</span>
              <span className="title-tag">GRATIS</span>
              <button 
                className="lobby-btn"
                onClick={() => navigate('/')}
                title="Volver al lobby"
              >
                LOBBY
              </button>
              <div className="info-badge">
                <span className="badge-label">Bolas:</span>
                <span className="badge-value">{ballsDrawn.length}/90</span>
              </div>
              <div className={`status-badge ${gameStatus}`}>
                {gameStatus === 'waiting' && '⏸️ ESPERA'}
                {gameStatus === 'active' && '🔴 EN VIVO'}
                {gameStatus === 'ended' && '✅ FINALIZADO'}
              </div>
            </div>

            {/* Alerta de casi línea - Compacta */}
            {almostLineCards.length > 0 && (() => {
              const minMissing = Math.min(...almostLineCards.map(card => card.minMissing));
              return (
                <div className="compact-line-alert">
                  <div className="alert-flash"></div>
                  <span className="alert-icon-compact">⚠️</span>
                  <span className="alert-text-compact">
                    ¡A {minMissing} NÚMERO{minMissing > 1 ? 'S' : ''} DE LÍNEA!
                    {almostLineCards.length > 1 && ` (${almostLineCards.length} cartones)`}
                  </span>
                  <div className="alert-glow"></div>
                </div>
              );
            })()}
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

            {/* Estado de espera - Botón de Selección de Cartones */}
            {gameStatus === 'waiting' && cardsRemaining > 0 && (
              <div className="card-selection-sphere">
                <button 
                  className="select-cards-sphere-btn"
                  onClick={() => setShowCardSelection(true)}
                  title={`Seleccionar cartones (${cardsRemaining} restantes)`}
                >
                  <img 
                    src={selectCardsButton} 
                    alt="Seleccionar Cartones" 
                    className="sphere-btn-image"
                  />
                </button>
              </div>
            )}

            {/* Mensaje de espera cuando no hay cartones disponibles */}
            {gameStatus === 'waiting' && cardsRemaining === 0 && (
              <div className="waiting-message">
                <div className="waiting-icon">⏳</div>
                <div className="waiting-text">Esperando inicio...</div>
              </div>
            )}
          </div>

          {/* Contador de Cartones - Fuera del círculo */}
          {gameStatus === 'waiting' && cardsRemaining > 0 && (
            <div className="external-counter">
              <div className="counter-line top-line"></div>
              <div className="counter-number">{cardsRemaining}</div>
              <div className="counter-line bottom-line"></div>
              <div className="counter-label">Cartones Disponibles</div>
            </div>
          )}

          <div className="machine-base">
            <div className="base-panel"></div>
            <div className="base-lights">
              <div className="light-strip"></div>
            </div>
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
        </div>
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

        <div className="cards-grid-container">
          {/* Grid compacto 5x4 */}
          <div className="cards-compact-grid">
            {playerCards.map((card, index) => {
              const cardSerial = card.serial || generateCardSerial(index);
              
              // DEBUG: Log solo la primera vez o cuando cambia
              if (index === 0 && card.serial) {
                console.log(`🔍 RENDER - Cartón ${index}: serial=${card.serial}, usando=${cardSerial}`);
              }
              
              const progress = getCardProgress(card);
              const isExpanded = expandedCard === card.id;
              
              return (
                <div 
                  key={card.id} 
                  className={`compact-card ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => !isExpanded && expandCard(card.id)}
                  style={{
                    cursor: 'pointer'
                  }}
                >
                  {!isExpanded && (
                    <>
                      <div className="compact-card-serial">{cardSerial}</div>
                      <div className="compact-card-progress">
                        {Array.from({ length: 15 }).map((_, i) => (
                          <div 
                            key={i} 
                            className={`progress-segment ${i < progress ? 'filled' : ''}`}
                            style={{
                              color: i < progress ? getBallColor((i + 1) * 6) : 'rgba(255,0,255,0.3)'
                            }}
                          />
                        ))}
                      </div>
                      <div className="compact-card-count">{progress}/15</div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Cartón expandido en el centro */}
          {expandedCard && (
            <div className="expanded-card-overlay">
              {playerCards
                .filter(card => card.id === expandedCard)
                .map(card => {
                  const cardSerial = card.serial || generateCardSerial(playerCards.indexOf(card));
                  
                  return (
                    <div key={card.id} className="bingo-card-expanded bingo-card-starter-90">
                      <div className="card-header">
                        <span className="card-number">N° Serie: {cardSerial}</span>
                        <div className="card-glow-border"></div>
                      </div>
                    
                      <div className="card-grid card-grid-90">
                        {card.numbers.map((row, rowIndex) => (
                          <div key={rowIndex} className="card-row">
                            {row.map((num, colIndex) => {
                              const isEmpty = num === null || num === undefined;
                              const isCalled = !isEmpty && isNumberCalled(num);
                              const isLatest = !isEmpty && ballsDrawn.length > 0 && 
                                              ballsDrawn[ballsDrawn.length - 1].number === num;
                              
                              return (
                                <div 
                                  key={colIndex} 
                                  className={`card-cell ${isEmpty ? 'empty' : ''} ${isCalled ? 'marked' : ''} ${isLatest ? 'latest-hit' : ''}`}
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
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Selector de Voz */}
      {showVoiceSelector && (
        <div className="voice-selector-overlay" onClick={() => setShowVoiceSelector(false)}>
          <div className="voice-selector-modal" onClick={(e) => e.stopPropagation()}>
            <h3>🎤 Seleccionar Voz</h3>
            <div className="voice-list">
              {availableVoices.map((voice, index) => (
                <button
                  key={index}
                  className={`voice-option ${currentVoice?.name === voice.name ? 'active' : ''}`}
                  onClick={() => {
                    voiceService.setVoice(voice);
                    setCurrentVoice(voice);
                    voiceService.speak('Hola, esta es mi voz');
                  }}
                >
                  <span className="voice-name">{voice.name}</span>
                  <span className="voice-lang">{voice.lang}</span>
                </button>
              ))}
            </div>
            <button className="close-voice-selector" onClick={() => setShowVoiceSelector(false)}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Botón de control (solo para testing) */}
      <div className="test-controls">
        {cardsRemaining > 0 && gameStatus !== 'waiting' && (
          <button 
            className="control-btn cards-btn"
            onClick={() => setShowCardSelection(true)}
            title={`Seleccionar cartones (${cardsRemaining} restantes)`}
          >
            🎫 Elegir Cartones ({cardsRemaining})
          </button>
        )}
        <button 
          className="control-btn voice-btn"
          onClick={() => setShowVoiceSelector(true)}
          title="Cambiar voz del anunciador"
        >
          🎤 Voz
        </button>
        <button 
          className="control-btn audio-btn"
          onClick={() => {
            const newState = audioService.toggleMusic();
            setAudioStatus(audioService.getStatus());
            console.log(`🎵 Música ${newState ? 'activada' : 'desactivada'}`);
          }}
          title="Activar/Desactivar música de fondo"
        >
          {audioStatus.musicEnabled ? '🎵 Música' : '🔇 Música'}
        </button>
        <button 
          className="control-btn audio-btn"
          onClick={() => {
            const newState = audioService.toggleEfectos();
            setAudioStatus(audioService.getStatus());
            console.log(`🔊 Efectos ${newState ? 'activados' : 'desactivados'}`);
          }}
          title="Activar/Desactivar efectos de sonido"
        >
          {audioStatus.efectosEnabled ? '🔊 Efectos' : '🔇 Efectos'}
        </button>
        <button 
          className="control-btn"
          onClick={() => setGameStatus(gameStatus === 'active' ? 'waiting' : 'active')}
        >
          {gameStatus === 'active' ? '⏸️ Pausar' : '▶️ Iniciar'}
        </button>
      </div>
        </>
      )}
    </div>
  );
}
