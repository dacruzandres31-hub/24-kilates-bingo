import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/BronzeRoomIndustrial.css?v=2';
import GiftIcon from '../assets/bronze_icon.png';
import selectCardsButton from '../assets/comprar_boton_bronce.png';
import voiceService from '../services/voiceService';
import audioService from '../services/audioService';
import PlayerSidebar from './PlayerSidebar';
import CardSelectionLobby from './CardSelectionLobby';
import BingoCardPreview from './BingoCardPreview';

export default function BronzeRoom({ onLogout }) {
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
  
  // Estados para mejoras visuales
  const [toasts, setToasts] = useState([]); // Notificaciones toast
  const [showConfetti, setShowConfetti] = useState(false); // Confeti digital
  const [luckMeter, setLuckMeter] = useState(0); // Medidor de suerte (0-100)
  const [comboCount, setComboCount] = useState(0); // Contador de combo
  const [lastComboTime, setLastComboTime] = useState(Date.now()); // Último tiempo de combo
  
  // Nuevos estados para mejoras visuales adicionales
  const [cardsDealing, setCardsDealing] = useState(false); // Animación de entrada de cartones
  const [markedNumbers, setMarkedNumbers] = useState([]); // Números marcados con efecto
  const [floatingEmojis, setFloatingEmojis] = useState([]); // Emojis flotantes
  const [celebrationMode, setCelebrationMode] = useState(false); // Modo celebración full
  const [winAmount, setWinAmount] = useState(0); // Monto ganado para animación
  const [stateTransition, setStateTransition] = useState(''); // Transición entre estados
  const [columnCounts, setColumnCounts] = useState([0,0,0,0,0,0,0,0,0]); // Contador por columna
  
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

  // Agregar toast notification
  const addToast = (icon, title, message, duration = 4000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, icon, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  };

  // Calcular medidor de suerte
  const calculateLuck = () => {
    if (playerCards.length === 0) return 0;
    let totalProgress = 0;
    playerCards.forEach(card => {
      const progress = getCardProgress(card);
      totalProgress += (progress / 15) * 100;
    });
    return Math.round(totalProgress / playerCards.length);
  };

  // Actualizar combo count
  const updateCombo = () => {
    const now = Date.now();
    const timeSinceLastBall = now - lastComboTime;
    
    // Si pasó menos de 5 segundos, incrementar combo
    if (timeSinceLastBall < 5000) {
      setComboCount(prev => prev + 1);
      if (comboCount > 0 && comboCount % 5 === 0) {
        addToast('🔥', 'COMBO!', `${comboCount} números consecutivos`);
      }
    } else {
      setComboCount(1);
    }
    setLastComboTime(now);
  };

  // Generar confeti
  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 5000);
  };
  
  // Agregar emoji flotante
  const addFloatingEmoji = (emoji) => {
    const id = Date.now() + Math.random();
    const startX = Math.random() * window.innerWidth;
    setFloatingEmojis(prev => [...prev, { id, emoji, x: startX }]);
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(e => e.id !== id));
    }, 3000);
  };
  
  // Marcar número con efecto
  const markNumberWithEffect = (number) => {
    setMarkedNumbers(prev => [...prev, { number, timestamp: Date.now() }]);
    audioService.playBolaCayendo(); // Sonido de match
    setTimeout(() => {
      setMarkedNumbers(prev => prev.filter(n => n.number !== number));
    }, 1500);
  };
  
  // Activar modo celebración al ganar
  const activateCelebration = (amount) => {
    setCelebrationMode(true);
    setWinAmount(amount);
    triggerConfetti();
    celebrationAudio.play();
    addFloatingEmoji('🎉');
    addFloatingEmoji('🏆');
    addFloatingEmoji('�');
    
    setTimeout(() => {
      setCelebrationMode(false);
    }, 8000);
  };
  
  // Transición de estado con efecto
  const transitionToState = (newState) => {
    setStateTransition('fade-out');
    setTimeout(() => {
      setGameStatus(newState);
      setStateTransition('fade-in');
      setTimeout(() => setStateTransition(''), 500);
    }, 500);
  };
  
  // Actualizar contadores por columna
  const updateColumnCounts = () => {
    const counts = [0,0,0,0,0,0,0,0,0];
    ballsDrawn.forEach(ball => {
      const columnIndex = Math.floor((ball.number - 1) / 10);
      counts[columnIndex]++;
    });
    setColumnCounts(counts);
  };

  // Simular bolillas flotantes en el bolillero e INICIAR MÚSICA
  useEffect(() => {
    const colors = ['#8B4513', '#A0522D', '#CD853F', '#D2691E', '#B8860B', '#DEB887', '#D2B48C', '#BC8F8F', '#A0826D'];
    const balls = Array.from({ length: 15 }, (_, i) => {
      const randomNumber = Math.floor(Math.random() * 90) + 1;
      return {
        id: i,
        number: randomNumber,
        color: getBallColor(randomNumber),
        delay: Math.random() * 3,
        duration: 3 + Math.random() * 2
      };
    });
    setFloatingBalls(balls);

    // ACTIVACIÓN DE AUDIO - Estrategia múltiple
    let musicStarted = false;
    
    const startMusic = async () => {
      if (musicStarted) return;
      
      try {
        console.log('🎵 [BronzeRoom] Intentando iniciar música...');
        await audioService.playForRoom('bronze');
        musicStarted = true;
        console.log('✅ [BronzeRoom] Música iniciada correctamente');
      } catch (err) {
        console.warn('⚠️ [BronzeRoom] No se pudo iniciar música:', err.message);
      }
    };

    // Intento 1: Inmediato (probablemente fallará por política del navegador)
    startMusic();

    // Intento 2: Listeners para CUALQUIER tipo de interacción
    const handleUserInteraction = (event) => {
      console.log(`🎵 [BronzeRoom] Interacción detectada (${event.type}), iniciando música...`);
      startMusic().then(() => {
        // Remover listeners después de éxito
        if (musicStarted) {
          document.removeEventListener('click', handleUserInteraction);
          document.removeEventListener('touchstart', handleUserInteraction);
          document.removeEventListener('keydown', handleUserInteraction);
          document.removeEventListener('mousemove', handleUserInteraction);
          console.log('🎵 [BronzeRoom] Listeners de audio removidos');
        }
      });
    };
    
    // Agregar múltiples listeners
    document.addEventListener('click', handleUserInteraction, { once: false });
    document.addEventListener('touchstart', handleUserInteraction, { once: false });
    document.addEventListener('keydown', handleUserInteraction, { once: false });
    // Mousemove como último recurso
    document.addEventListener('mousemove', handleUserInteraction, { once: true });

    // Cargar voces disponibles
    setTimeout(() => {
      const voices = voiceService.getSpanishVoices();
      setAvailableVoices(voices);
      setCurrentVoice(voiceService.getCurrentVoice());
    }, 500);
    
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('mousemove', handleUserInteraction);
      // Detener efectos de sonido al desmontar
      audioService.stopBolilleroGirando();
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
  
  // Actualizar contadores de columna cuando cambian las bolas
  useEffect(() => {
    updateColumnCounts();
  }, [ballsDrawn]);
  
  // Reproducir sonido cuando la bola CAE (currentBall se establece)
  useEffect(() => {
    if (currentBall) {
      console.log(`🎱 [SONIDO] Bola cayendo AHORA: ${currentBall.number}`);
      audioService.playBolaCayendoConPausa();
    }
  }, [currentBall]);
  
  // Animación de entrada de cartones
  useEffect(() => {
    if (selectedPlayerCards.length > 0 && !cardsDealing) {
      setCardsDealing(true);
      setTimeout(() => setCardsDealing(false), selectedPlayerCards.length * 100 + 500);
    }
  }, [selectedPlayerCards.length]);
  
  // Detectar transiciones de estado
  useEffect(() => {
    if (previousGameStatus !== gameStatus) {
      setPreviousGameStatus(gameStatus);
      
      if (gameStatus === 'active') {
        addToast('🎮', 'JUEGO INICIADO', 'El sorteo ha comenzado');
        audioService.startBolilleroGirando();
      } else if (gameStatus === 'ended') {
        addToast('🏁', 'JUEGO FINALIZADO', 'El sorteo ha terminado');
        audioService.stopBolilleroGirando();
      }
    }
  }, [gameStatus, previousGameStatus]);

  // Función para obtener color según el número (paleta marrón bronce)
  const getBallColor = (number) => {
    // Tonos marrones variados para sala Bronce - paleta completa marrón
    if (number >= 1 && number <= 10) return '#8B4513'; // Marrón silla de montar
    if (number >= 11 && number <= 20) return '#A0522D'; // Siena
    if (number >= 21 && number <= 30) return '#CD853F'; // Marrón Perú
    if (number >= 31 && number <= 40) return '#D2691E'; // Chocolate
    if (number >= 41 && number <= 50) return '#B8860B'; // Dorado oscuro
    if (number >= 51 && number <= 60) return '#DEB887'; // Madera clara
    if (number >= 61 && number <= 70) return '#D2B48C'; // Bronceado
    if (number >= 71 && number <= 80) return '#BC8F8F'; // Rosa marrón
    return '#A0826D'; // Marrón topo (81-90)
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
    // Solo cerrar el overlay de selección, permitir que el usuario vea la sala
    setShowCardSelection(false);
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
    
    // Activar confeti
    triggerConfetti();
    
    // Toast de celebración
    addToast('🎉', '¡LÍNEA!', 'Has completado una línea', 8000);
    
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
}, [ballsDrawn.length, playerCards.length, lineCelebrated, gameStatus, winnerCards.length]);

useEffect(() => {
  return () => {
    if (pauseTimeout) clearTimeout(pauseTimeout);
  };
}, [pauseTimeout]);

  // Detectar cambios en el estado del juego y anunciar
  useEffect(() => {
    if (gameStatus === 'active' && previousGameStatus !== 'active') {
      console.log('🎬 INICIANDO SORTEO - Activando bolillero INMEDIATAMENTE');
      
      // Iniciar bolillero INMEDIATAMENTE sin delay
      audioService.startBolilleroGirando();
      
      audioService.lowerMusicVolume();
      
      if (previousGameStatus === 'waiting') {
        voiceService.announceSorteoIniciado();
        addToast('🎲', '¡Sorteo iniciado!', 'Buena suerte');
      } else if (previousGameStatus === 'paused') {
        voiceService.announceSorteoReiniciado();
      }
      
    } else if (gameStatus === 'waiting' && previousGameStatus === 'active') {
      voiceService.announceSorteoPausado();
      audioService.stopBolilleroGirando();
      audioService.restoreMusicVolume();
      addToast('⏸️', 'Sorteo pausado', 'Esperando...');
    }
    
    setPreviousGameStatus(gameStatus);
  }, [gameStatus]);

  // Anunciar número cantado
  useEffect(() => {
    if (ballsDrawn.length > 0) {
      const lastDrawnBall = ballsDrawn[ballsDrawn.length - 1];
      
      // Anunciar el número con voz (delay mínimo de 200ms para que suene natural)
      setTimeout(() => {
        voiceService.announceNumber(lastDrawnBall.number);
      }, 200);
      
      // Actualizar combo y suerte
      updateCombo();
      const luck = calculateLuck();
      setLuckMeter(luck);
      
      // Detectar si el jugador acertó un número
      const hasMatch = playerCards.some(card => 
        card.numbers.flat().includes(lastDrawnBall.number)
      );
      
      if (hasMatch) {
        addToast('✨', '¡Acierto!', `Número ${lastDrawnBall.number}`);
      }
    }
  }, [ballsDrawn.length]);

  return (
    <div className="bronze-room" style={{
      minHeight: '100vh',
      background: '#1a1310',
      color: '#d4a574',
      fontFamily: "'Roboto Condensed', 'Arial Narrow', sans-serif"
    }}>
      {/* Sistema de toasts */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className="toast-notification">
            <div className="toast-icon">{toast.icon}</div>
            <div className="toast-content">
              <div className="toast-title">{toast.title}</div>
              <div className="toast-message">{toast.message}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Panel de gamificación */}
      {playerCards.length > 0 && (
        <div className="gamification-panel">
          {/* Avatar del jugador */}
          <div className="player-avatar-widget">
            <div className="avatar-icon">👤</div>
          </div>

          {/* Medidor de suerte */}
          <div className="luck-meter">
            <div className="luck-title">SUERTE</div>
            <div className="luck-bar">
              <div className="luck-fill" style={{ '--luck-percent': `${luckMeter}%` }}></div>
              <div className="luck-percentage">{luckMeter}%</div>
            </div>
          </div>

          {/* Combo meter */}
          {comboCount > 1 && (
            <div className="combo-meter">
              <div className="combo-title">COMBO</div>
              <div className="combo-value">{comboCount}x</div>
              <div className="combo-label">consecutivos</div>
            </div>
          )}
        </div>
      )}

      {/* Confeti digital */}
      {showConfetti && (
        <div className="confetti-container">
          {Array.from({ length: 100 }, (_, i) => {
            const colors = ['#FFD700', '#FFA500', '#FF1493', '#00FF00', '#00D4FF'];
            return (
              <div
                key={i}
                className="confetti-piece"
                style={{
                  '--color': colors[Math.floor(Math.random() * colors.length)],
                  '--left': `${Math.random() * 100}%`,
                  '--duration': `${2 + Math.random() * 3}s`,
                  '--rotation': `${Math.random() * 360}deg`,
                  animationDelay: `${Math.random() * 0.5}s`
                }}
              />
            );
          })}
        </div>
      )}

      {/* Contador Pre-40 (Posibilidad de Pozo) */}
      {gameStatus === 'active' && ballsDrawn.length < 40 && (
        <div className={`pre40-counter ${ballsDrawn.length >= 39 ? 'spin-exit' : ''}`}>
          <div className="pre40-title">🎰 Posibilidad de Pozo Pre-40</div>
          <div className="pre40-value">{40 - ballsDrawn.length}</div>
          <div className="pre40-label">Bolas restantes</div>
        </div>
      )}

      {/* Sala de selección de cartones (overlay sobre la sala) */}
      {showCardSelection && (
        <CardSelectionLobby
          sessionId={sessionId || 'starter_default'}
          onCardsSelected={handleCardsSelected}
          onCancel={handleCancelSelection}
          maxCards={cardsRemaining}
          currentCards={selectedPlayerCards.length}
          timeWindow="open"
          roomTheme="bronze"
        />
      )}

      {/* Sala de juego (solo visible después de seleccionar cartones) */}
      {!showCardSelection && (
        <>
          {/* Sidebar con información del jugador */}
          <PlayerSidebar 
            isOpen={sidebarOpen} 
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            themeColor="#b87333"
            accentColor="#d4a574"
            onLogout={onLogout}
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
            <div className="grid-title" style={{
              fontSize: '1rem',
              fontWeight: 900,
              letterSpacing: '2px',
              color: '#b87333',
              textShadow: '0 0 8px rgba(184, 115, 51, 0.5)',
              background: 'linear-gradient(180deg, rgba(62, 39, 35, 0.9), rgba(42, 24, 16, 0.9))',
              borderRadius: '6px',
              border: '2px solid #5a2d0c',
              fontFamily: "'Roboto Condensed', 'Arial Narrow', sans-serif",
              padding: '8px 16px',
              textAlign: 'center',
              textTransform: 'uppercase'
            }}>NÚMEROS CANTADOS</div>
            <div className="grid-glow"></div>
          </div>
          
          {/* FILA 1: 1-10, 11-20, 21-30 */}
          <div className="grid-row">
            {[0, 1, 2].map(columnIndex => {
              const start = columnIndex * 10 + 1;
              const end = (columnIndex + 1) * 10;
              const columnLabel = `${start}-${end}`;
              const columnCount = columnCounts[columnIndex] || 0;
              
              return (
                <div key={columnIndex} className="grid-column">
                  <div 
                    className="column-letter" 
                    style={{ 
                      color: '#b87333',
                      textShadow: '0 0 8px rgba(184, 115, 51, 0.5)',
                      background: 'linear-gradient(180deg, rgba(62, 39, 35, 0.9), rgba(42, 24, 16, 0.9))',
                      borderRadius: '6px',
                      border: '2px solid #5a2d0c',
                      fontFamily: "'Roboto Condensed', 'Arial Narrow', sans-serif",
                      padding: '4px 0',
                      fontWeight: 900,
                      textAlign: 'center',
                      fontSize: '1rem',
                      letterSpacing: '2px'
                    }}
                  >
                    {columnLabel}
                    {columnCount > 0 && (
                      <div className="column-counter">{columnCount}</div>
                    )}
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
                            background: 'linear-gradient(135deg, #b87333, #d4a574)',
                            color: '#1a1310',
                            fontWeight: 900,
                            border: '2px solid #8b4513',
                            boxShadow: '0 0 15px rgba(184, 115, 51, 0.8), inset 0 0 10px rgba(255, 255, 255, 0.2)',
                            fontFamily: "'Roboto Condensed', 'Arial Narrow', sans-serif",
                            borderRadius: '4px',
                            padding: '6px 3px',
                            textAlign: 'center',
                            fontSize: '1.2rem',
                            textShadow: '1px 1px 2px rgba(255, 255, 255, 0.3), -1px -1px 2px rgba(0, 0, 0, 0.5)'
                          } : {
                            background: 'rgba(26, 19, 16, 0.7)',
                            border: '1px solid rgba(90, 45, 12, 0.3)',
                            borderRadius: '4px',
                            color: '#6b4423',
                            fontFamily: "'Roboto Condensed', 'Arial Narrow', sans-serif",
                            padding: '6px 3px',
                            textAlign: 'center',
                            fontSize: '1.2rem',
                            fontWeight: 600,
                            textShadow: '1px 1px 2px rgba(212, 165, 116, 0.2)'
                          }}
                        >
                          {number}
                          {isCalled && (
                            <div className="number-glow-ring" style={{ borderColor: '#b87333' }}></div>
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
              const columnCount = columnCounts[columnIndex] || 0;
              
              return (
                <div key={columnIndex} className="grid-column">
                  <div 
                    className="column-letter" 
                    style={{ 
                      color: '#b87333',
                      textShadow: '0 0 8px rgba(184, 115, 51, 0.5)',
                      background: 'linear-gradient(180deg, rgba(62, 39, 35, 0.9), rgba(42, 24, 16, 0.9))',
                      borderRadius: '6px',
                      border: '2px solid #5a2d0c',
                      fontFamily: "'Roboto Condensed', 'Arial Narrow', sans-serif",
                      padding: '4px 0',
                      fontWeight: 900,
                      textAlign: 'center',
                      fontSize: '1rem',
                      letterSpacing: '2px'
                    }}
                  >
                    {columnLabel}
                    {columnCount > 0 && (
                      <div className="column-counter">{columnCount}</div>
                    )}
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
                            background: 'linear-gradient(135deg, #b87333, #d4a574)',
                            color: '#1a1310',
                            fontWeight: 900,
                            border: '2px solid #8b4513',
                            boxShadow: '0 0 15px rgba(184, 115, 51, 0.8), inset 0 0 10px rgba(255, 255, 255, 0.2)',
                            fontFamily: "'Roboto Condensed', 'Arial Narrow', sans-serif",
                            borderRadius: '4px',
                            padding: '6px 3px',
                            textAlign: 'center',
                            fontSize: '1.2rem',
                            textShadow: '1px 1px 2px rgba(255, 255, 255, 0.3), -1px -1px 2px rgba(0, 0, 0, 0.5)'
                          } : {
                            background: 'rgba(26, 19, 16, 0.7)',
                            border: '1px solid rgba(90, 45, 12, 0.3)',
                            borderRadius: '4px',
                            color: '#6b4423',
                            fontFamily: "'Roboto Condensed', 'Arial Narrow', sans-serif",
                            padding: '6px 3px',
                            textAlign: 'center',
                            fontSize: '1.2rem',
                            fontWeight: 600,
                            textShadow: '1px 1px 2px rgba(212, 165, 116, 0.2)'
                          }}
                        >
                          {number}
                          {isCalled && (
                            <div className="number-glow-ring" style={{ borderColor: '#b87333' }}></div>
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
              const columnCount = columnCounts[columnIndex] || 0;
              
              return (
                <div key={columnIndex} className="grid-column">
                  <div 
                    className="column-letter" 
                    style={{ 
                      color: '#b87333',
                      textShadow: '0 0 8px rgba(184, 115, 51, 0.5)',
                      background: 'linear-gradient(180deg, rgba(62, 39, 35, 0.9), rgba(42, 24, 16, 0.9))',
                      borderRadius: '6px',
                      border: '2px solid #5a2d0c',
                      fontFamily: "'Roboto Condensed', 'Arial Narrow', sans-serif",
                      padding: '4px 0',
                      fontWeight: 900,
                      textAlign: 'center',
                      fontSize: '1rem',
                      letterSpacing: '2px'
                    }}
                  >
                    {columnLabel}
                    {columnCount > 0 && (
                      <div className="column-counter">{columnCount}</div>
                    )}
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
                            background: 'linear-gradient(135deg, #b87333, #d4a574)',
                            color: '#1a1310',
                            fontWeight: 900,
                            border: '2px solid #8b4513',
                            boxShadow: '0 0 15px rgba(184, 115, 51, 0.8), inset 0 0 10px rgba(255, 255, 255, 0.2)',
                            fontFamily: "'Roboto Condensed', 'Arial Narrow', sans-serif",
                            borderRadius: '4px',
                            padding: '6px 3px',
                            textAlign: 'center',
                            fontSize: '1.2rem',
                            textShadow: '1px 1px 2px rgba(255, 255, 255, 0.3), -1px -1px 2px rgba(0, 0, 0, 0.5)'
                          } : {
                            background: 'rgba(26, 19, 16, 0.7)',
                            border: '1px solid rgba(90, 45, 12, 0.3)',
                            borderRadius: '4px',
                            color: '#6b4423',
                            fontFamily: "'Roboto Condensed', 'Arial Narrow', sans-serif",
                            padding: '6px 3px',
                            textAlign: 'center',
                            fontSize: '1.2rem',
                            fontWeight: 600,
                            textShadow: '1px 1px 2px rgba(212, 165, 116, 0.2)'
                          }}
                        >
                          {number}
                          {isCalled && (
                            <div className="number-glow-ring" style={{ borderColor: '#b87333' }}></div>
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
                color: '#b87333',
                textShadow: '0 0 10px rgba(184, 115, 51, 0.6), 0 0 20px rgba(139, 69, 19, 0.4)',
                WebkitTextFillColor: '#b87333'
              }}>SALA BRONCE</span>
              <div className="card-price-tag">
                <span className="price-label">Valor Cartón</span>
                <span className="price-amount">$500</span>
              </div>
              <button 
                className="lobby-btn"
                onClick={() => navigate('/')}
                title="Volver al lobby"
              >
                LOBBY
              </button>
              <div className="ball-counter-display">
                🎱 Bola {ballsDrawn.length} de 90
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
                  >
                    {ball.number}
                  </div>
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
              <div className="counter-number" style={{
                color: '#b87333',
                textShadow: '0 0 15px rgba(184, 115, 51, 0.8), 2px 2px 4px rgba(0, 0, 0, 0.8)'
              }}>{cardsRemaining}</div>
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
          <div className="cards-title" style={{
            fontSize: '1rem',
            fontWeight: 900,
            letterSpacing: '2px',
            color: '#b87333',
            textShadow: '0 0 8px rgba(184, 115, 51, 0.5)',
            background: 'linear-gradient(180deg, rgba(62, 39, 35, 0.9), rgba(42, 24, 16, 0.9))',
            borderRadius: '6px',
            border: '2px solid #5a2d0c',
            fontFamily: "'Roboto Condensed', 'Arial Narrow', sans-serif",
            padding: '8px 16px',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <span className="cards-icon">🎴</span>
            <span>MIS CARTONES</span>
          </div>
          <div className="cards-count">{playerCards.length} cartones</div>
        </div>

        <div className="cards-grid-container">
          {/* Grid compacto 6x5 = 30 cartones */}
          <div className="cards-compact-grid">
            {playerCards.map((card, index) => {
              const cardSerial = card.serial || generateCardSerial(index);
              
              // DEBUG: Log solo la primera vez o cuando cambia
              if (index === 0 && card.serial) {
                console.log(`🔍 RENDER - Cartón ${index}: serial=${card.serial}, usando=${cardSerial}`);
              }
              
              const progress = getCardProgress(card);
              const isExpanded = expandedCard === card.id;
              const isAlmostLine = almostLineCards.some(c => c.cardId === card.id);
              
              return (
                <div 
                  key={card.id} 
                  className={`compact-card ${isExpanded ? 'expanded' : ''} ${isAlmostLine ? 'almost-line' : ''}`}
                  onClick={() => !isExpanded && expandCard(card.id)}
                  style={{
                    cursor: 'pointer',
                    '--progress': Math.round((progress / 15) * 100)
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
            <div className="expanded-card-overlay" onClick={() => setExpandedCard(null)}>
              <div className="expanded-card-container" onClick={(e) => e.stopPropagation()}>
                {playerCards
                  .filter(card => card.id === expandedCard)
                  .map(card => (
                    <BingoCardPreview
                      key={card.id}
                      card={{
                        card_serial: card.serial || generateCardSerial(playerCards.indexOf(card)),
                        numbers: card.numbers
                      }}
                      room="bronze"
                      selected={false}
                      onClick={null}
                      showSerial={true}
                    />
                  ))}
                <button 
                  className="close-expanded-btn"
                  onClick={() => setExpandedCard(null)}
                >
                  ✕
                </button>
              </div>
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
        <button 
          className="control-btn voice-btn"
          onClick={() => setShowVoiceSelector(true)}
          title="Cambiar voz del anunciador"
        >
          🎤 Voz
        </button>
        <button 
          className="control-btn"
          onClick={() => setGameStatus(gameStatus === 'active' ? 'waiting' : 'active')}
        >
          {gameStatus === 'active' ? '⏸️ Pausar' : '▶️ Iniciar'}
        </button>
        <button 
          className="control-btn"
          onClick={() => activateCelebration(50000)}
          title="Probar modo celebración"
          style={{ background: 'linear-gradient(135deg, #ffd700, #ffaa00)' }}
        >
          🏆 Ganar
        </button>
      </div>
      
      {/* Sistema de Reacciones */}
      <div className="reactions-panel" style={{
        boxShadow: '0 0 30px rgba(184, 115, 51, 0.6), inset 0 0 20px rgba(139, 69, 19, 0.2)'
      }}>
        <div className="reactions-title">Reacciones</div>
        <div className="reactions-buttons">
          <button className="reaction-btn" onClick={() => addFloatingEmoji('👍')} title="Me gusta">👍</button>
          <button className="reaction-btn" onClick={() => addFloatingEmoji('😮')} title="Sorprendido">😮</button>
          <button className="reaction-btn" onClick={() => addFloatingEmoji('🎉')} title="Celebrar">🎉</button>
          <button className="reaction-btn" onClick={() => addFloatingEmoji('😢')} title="Triste">😢</button>
          <button className="reaction-btn" onClick={() => addFloatingEmoji('🔥')} title="Fuego">🔥</button>
          <button className="reaction-btn" onClick={() => addFloatingEmoji('💎')} title="Diamante">💎</button>
        </div>
      </div>
      
      {/* Emojis Flotantes */}
      {floatingEmojis.map(emoji => (
        <div 
          key={emoji.id} 
          className="floating-emoji"
          style={{ left: `${emoji.x}px` }}
        >
          {emoji.emoji}
        </div>
      ))}
      
      {/* Modo Celebración Full Screen */}
      {celebrationMode && (
        <div className="celebration-overlay">
          <div className="celebration-content">
            <div className="celebration-trophy">🏆</div>
            <div className="celebration-text">¡FELICITACIONES!</div>
            <div className="celebration-subtitle">Has ganado</div>
            <div className="celebration-amount">${winAmount.toLocaleString()}</div>
            <div className="celebration-stars">
              {'⭐'.repeat(5)}
            </div>
          </div>
          <div className="celebration-confetti">
            {Array.from({ length: 100 }).map((_, i) => (
              <div 
                key={i} 
                className="celebration-confetti-piece"
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
      
      {/* Números Marcados con Efecto */}
      {markedNumbers.map(mark => (
        <div 
          key={`mark-${mark.number}-${mark.timestamp}`} 
          className="marked-number-effect"
        >
          <div className="marked-stamp">✓</div>
          <div className="marked-number">{mark.number}</div>
          <div className="marked-particles">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="marked-particle" />
            ))}
          </div>
        </div>
      ))}
        </>
      )}
    </div>
  );
}
