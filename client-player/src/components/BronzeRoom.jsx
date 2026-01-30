import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/BronzeRoomIndustrial.css?v=2';
import GiftIcon from '../assets/bronze_icon.png';
import selectCardsButton from '../assets/comprar_boton_bronce.png';
import bolilleroVideo from '../assets/bolillero_loop.mp4';
import voiceService from '../services/voiceService';
import audioService from '../services/audioService';
import PlayerSidebar from './PlayerSidebar';
import CardSelectionLobby from './CardSelectionLobby';
import BingoCardPreview from './BingoCardPreview';
import Countdown from './Countdown';
import useLiveDraw from '../hooks/useLiveDraw';
import SessionHistory from './SessionHistory';

export default function BronzeRoom() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  // Hook para sorteo en vivo - reemplaza la simulación local
  const {
    ballsDrawn,
    currentBall,
    gameStatus,
    sessionId: liveSessionId,
    prizes: livePrizes,
    isLoading: liveDrawLoading,
    setBallsDrawn,
    setCurrentBall,
    setGameStatus
  } = useLiveDraw('bronce');

  const [lastBall, setLastBall] = useState(null);
  const [previousGameStatus, setPreviousGameStatus] = useState('waiting'); // Para detectar cambios
  const [floatingBalls, setFloatingBalls] = useState([]);
  const [almostLineCards, setAlmostLineCards] = useState([]); // Cartones a 2 bolillas de línea
  const [expandedCard, setExpandedCard] = useState(null); // Cartón expandido actualmente
  const [canCloseExpandedCard, setCanCloseExpandedCard] = useState(true); // Controla si se puede cerrar el cartón expandido
  const [lastHitCard, setLastHitCard] = useState(null); // Último cartón con acierto
  const [winnerCards, setWinnerCards] = useState([]); // Cartones ganadores con línea completa
  const [celebratedCardIds, setCelebratedCardIds] = useState([]); // IDs de cartones ya festejados (previene loop)
  const [lineCelebrated, setLineCelebrated] = useState(false); // Flag de festejo activo
  const [bingoWinnerCard, setBingoWinnerCard] = useState(null); // Cartón ganador de BINGO
  const [bingoCelebrated, setBingoCelebrated] = useState(false); // Flag de festejo BINGO activo
  // Estado de ventas (T-5 closure)
  const [salesClosed, setSalesClosed] = useState(false);
  const [salesMessage, setSalesMessage] = useState('');
  const [nextSessionTime, setNextSessionTime] = useState(null);
  const [showVoiceSelector, setShowVoiceSelector] = useState(false); // Selector de voz
  const [availableVoices, setAvailableVoices] = useState([]); // Voces disponibles
  const [currentVoice, setCurrentVoice] = useState(null); // Voz actual
  const [audioStatus, setAudioStatus] = useState({ musicEnabled: true, efectosEnabled: true }); // Estado UI audio
  const [pauseTimeout, setPauseTimeout] = useState(null); // Controlar pausa automática
  const [highlightedLine, setHighlightedLine] = useState(null); // Línea a resaltar
  const [cardWinningLines, setCardWinningLines] = useState({}); // {cardId: [0,1,2]} líneas ganadoras por cartón
  const [sidebarOpen, setSidebarOpen] = useState(false); // Estado del sidebar
  const [showCardSelection, setShowCardSelection] = useState(false); // Mostrar lobby de selección de cartones
  const [selectedPlayerCards, setSelectedPlayerCards] = useState([]); // Cartones seleccionados por el jugador
  const [cardsRemaining, setCardsRemaining] = useState(20); // Cartones que faltan por seleccionar
  const [showReadyModal, setShowReadyModal] = useState(false); // Modal "¡¡Todo Listo!!"
  const [showHistoryModal, setShowHistoryModal] = useState(false); // Modal de historial de sorteos

  // Auto-cerrar modal "¡¡Todo Listo!!" después de 5 segundos
  useEffect(() => {
    if (showReadyModal) {
      const timer = setTimeout(() => {
        setShowReadyModal(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showReadyModal]);

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
  const [columnCounts, setColumnCounts] = useState([0, 0, 0, 0, 0, 0, 0, 0, 0]); // Contador por columna

  // Efectos de festejo (fuera del componente o arriba)
  const celebrationAudio = new Audio('/audio/celebration.mp3');
  celebrationAudio.volume = 0.7;

  // Verificar estado de ventas (T-5 closure) cada 5 segundos - Centralizado con schedule_settings
  useEffect(() => {
    const checkSalesStatus = async () => {
      try {
        const response = await fetch('/api/game/sales-status/bronce', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (response.ok) {
          const data = await response.json();
          setSalesClosed(!data.salesOpen);
          setSalesMessage(data.message || '');
          setNextSessionTime(data.nextSession);

          if (!data.salesOpen) {
            console.log(`🔒 Ventas cerradas: ${data.reason} - ${data.message}`);
          }
        }
      } catch (error) {
        console.log('Error verificando estado de ventas:', error);
      }
    };

    // Verificar inmediatamente y luego cada 5 segundos
    checkSalesStatus();
    const interval = setInterval(checkSalesStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  // Verificar cartones existentes del jugador al montar
  // PERSISTENCIA: Los cartones se guardan en localStorage para no perderlos al salir de la sala
  useEffect(() => {
    const STORAGE_KEY = `bingo_cards_bronce_${sessionId}`;

    const checkExistingCards = async () => {
      // 1. Primero intentar cargar desde localStorage (para cuando vuelve a la sala)
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        try {
          const cachedCards = JSON.parse(cached);
          if (cachedCards && cachedCards.length > 0) {
            console.log('📦 Cartones recuperados de localStorage:', cachedCards.length);
            setSelectedPlayerCards(cachedCards);
            setCardsRemaining(20 - cachedCards.length);
          }
        } catch (e) {
          console.log('Error parseando cache, ignorando');
        }
      }

      // 2. Luego verificar con el servidor (fuente de verdad)
      try {
        const response = await fetch(`/api/game/my-cards?roomType=bronce`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (response.ok) {
          const data = await response.json();
          const currentCards = (data.cards || []).map(card => ({
            id: card.id,
            serial: card.serial_number,
            numbers: JSON.parse(card.grid_numbers || '[]'),
            room: card.room
          }));

          console.log('🔍 DEBUG - Cartones cargados desde /my-cards:', currentCards.map(c => ({
            id: c.id,
            serial: c.serial,
            hasSerial: !!c.serial,
            hasNumbers: !!c.numbers
          })));

          setSelectedPlayerCards(currentCards);
          const remaining = 20 - currentCards.length;
          setCardsRemaining(remaining);

          // Guardar en localStorage para persistencia
          if (currentCards.length > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(currentCards));
            console.log('💾 Cartones guardados en localStorage');
          }

          if (remaining > 0) {
            console.log(`📋 Tiene ${currentCards.length} cartones, faltan ${remaining}`);
          } else {
            console.log('✅ Ya tiene 20 cartones completos');
          }
        }
      } catch (error) {
        console.log('Sin cartones previos o error de red');
        // Si hay cache, mantenerlo; sino resetear
        if (!cached) setCardsRemaining(20);
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
    const counts = [0, 0, 0, 0, 0, 0, 0, 0, 0];
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

  // NOTA: El sorteo ahora viene del hook useLiveDraw via Socket.IO
  // La simulación local fue eliminada - las bolas llegan en tiempo real del backend

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
  const handleCardsSelected = (reservedCards, remainingTicketsFromBackend) => {
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

    // Usar el valor que viene del backend (ya descontó solo los comprados, no PLUS)
    const remaining = remainingTicketsFromBackend ?? (20 - allCards.length);
    setCardsRemaining(remaining);
    setShowCardSelection(false);
    console.log(`✅ Total de cartones: ${allCards.length}, faltan: ${remaining}`);

    // Si se completaron los 20 cartones, mostrar modal
    if (allCards.length === 20) {
      setShowReadyModal(true);
    }
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
    // NO expandir si hay celebración de línea activa
    if (winnerCards.length > 0 || lineCelebrated) {
      return;
    }
    setExpandedCard(cardId);
    setCanCloseExpandedCard(false); // Bloquear cierre manual durante tiempo programado
    setTimeout(() => {
      setExpandedCard(null);
      setCanCloseExpandedCard(true); // Restablecer después de cerrar
    }, 3500); // 3.5 segundos expandido
  };

  // Detectar cuando un número coincide con un cartón
  useEffect(() => {
    if (ballsDrawn.length > 0 && !lineCelebrated && winnerCards.length === 0) { // No expandir si hay festejo de línea
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
      setCardWinningLines({});
      return;
    }

    const cardsAlmostThere = [];
    const cardsWithWinningLines = [];
    const newCardWinningLines = {};

    playerCards.forEach(card => {
      const linesStatus = checkLineStatus(card);
      const almostLines = linesStatus.filter(line => line.missing === 1 || line.missing === 2);
      // Una línea está completa solo si missing === 0 Y tiene al menos 5 números marcados
      const completedLines = linesStatus.filter(line => line.missing === 0 && line.markedCount >= 5);

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
        // Guardar qué filas (índices 0, 1, 2) están completas
        const winningRowIndices = completedLines.map(line => line.row);
        newCardWinningLines[card.id] = winningRowIndices;

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
    setCardWinningLines(newCardWinningLines); // Actualizar líneas ganadoras

    // Mostrar celebración si hay NUEVOS ganadores que NO han sido festejados
    // ANTI-LOOP: Verificar que el cartón NO esté en celebratedCardIds Y que no haya celebración activa
    const newWinners = cardsWithWinningLines.filter(card =>
      !celebratedCardIds.includes(card.cardId)
    );

    if (newWinners.length > 0 && !lineCelebrated && winnerCards.length === 0) {
      // Tomar el primer cartón ganador nuevo
      const winnerCard = newWinners[0];

      setWinnerCards([winnerCard]); // Solo el nuevo ganador
      setLineCelebrated(true);
      setCelebratedCardIds([...celebratedCardIds, winnerCard.cardId]); // Marcar como festejado

      // Limpiar alertas de "casi línea" porque ya se ganó
      setAlmostLineCards([]);

      // 1. PRIMERO: Anunciar línea ganadora INMEDIATAMENTE (100ms para dar tiempo a que se active el audio)
      setTimeout(() => {
        console.log('[BronzeRoom] 🎶 Reproduciendo voz: Felicitaciones, Ganaste Línea');
        voiceService.speak('Felicitaciones, Ganaste Línea', { volume: 1.0, rate: 0.9 });
      }, 100);

      // 2. Toast de celebración (sin sonido)
      addToast('🎉', '¡LÍNEA!', 'Has completado una línea', 8000);

      // 3. Activar confeti
      triggerConfetti();

      // 4. DESPUÉS DE LA VOZ: Reproducir aplausos (1.5 segundos después para no interferir)
      setTimeout(() => {
        celebrationAudio.currentTime = 0;
        celebrationAudio.play();
      }, 1500);

      // 5. Pausar sorteo (pero NO anunciar "Sorteo Pausado" - se anunciará al reanudar)
      if (gameStatus === 'active') {
        setGameStatus('waiting');
        const timeout = setTimeout(() => {
          // Anunciar continuación a BINGO antes de reanudar
          voiceService.speak('Continuamos hasta Bingo');
          setTimeout(() => {
            // ORDEN IMPORTANTE: Limpiar ganadores PRIMERO, luego resetear flag
            setWinnerCards([]);
            setHighlightedLine(null);
            setLineCelebrated(false); // RESETEAR después de limpiar ganadores
            setGameStatus('active');
          }, 2000); // Esperar 2 segundos para que termine el anuncio
        }, 18000); // 18 segundos + 2 del anuncio = 20 segundos total
        setPauseTimeout(timeout);
      }

      // 6. Resaltar la línea ganadora (primera del primer cartón)
      if (cardsWithWinningLines[0]?.lines?.length > 0) {
        setHighlightedLine(cardsWithWinningLines[0].lines[0].numbers);
      }
    }

    // DETECTAR BINGO (Cartón completo - 15 números marcados)
    if (!bingoCelebrated && !lineCelebrated && winnerCards.length === 0) {
      playerCards.forEach(card => {
        const allNumbers = card.numbers.flat().filter(n => n !== null && n !== undefined);
        const markedNumbers = allNumbers.filter(num => isNumberCalled(num));

        if (markedNumbers.length === 15) {
          console.log('[BronzeRoom] 🎊 BINGO DETECTADO');
          setBingoWinnerCard({
            cardId: card.id,
            cardSerial: card.serial || generateCardSerial(playerCards.indexOf(card), 'B'),
            card: card
          });
          setBingoCelebrated(true);
          setGameStatus('ended');

          setTimeout(() => voiceService.speak('BINGO', { volume: 1.0, rate: 0.9 }), 100);
          setTimeout(() => voiceService.speak('Felicitaciones, Ganaste Bingo', { volume: 1.0, rate: 0.9 }), 1500);
          addToast('🎊', '¡BINGO!', 'Has completado el cartón', 8000);
          triggerConfetti();
          setTimeout(() => { celebrationAudio.currentTime = 0; celebrationAudio.play(); }, 2000);

          setTimeout(() => {
            voiceService.speak('El Bingo ha finalizado');
            setTimeout(() => {
              setBallsDrawn([]); setSelectedPlayerCards([]); setPlayerCards([]);
              setBingoWinnerCard(null); setBingoCelebrated(false); setGameStatus('waiting');
              setShowCardSelection(false); setCardsRemaining(6); setCelebratedCardIds([]);
              setWinnerCards([]); setLineCelebrated(false); audioService.stopBolilleroGirando();
              addToast('✅', 'Juego Finalizado', 'Puedes comprar nuevos cartones', 5000);
            }, 2000);
          }, 18000);
          return;
        }
      });
    }
  }, [ballsDrawn.length, playerCards.length, lineCelebrated, gameStatus, winnerCards.length, bingoCelebrated]);

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
      // NO anunciar "Sorteo Pausado" si hay línea celebrada (ya se anunció "Felicitaciones")
      if (!lineCelebrated) {
        voiceService.announceSorteoPausado();
      }
      audioService.stopBolilleroGirando();
      audioService.restoreMusicVolume();
      if (!lineCelebrated) {
        addToast('⏸️', 'Sorteo pausado', 'Esperando...');
      }
    }

    setPreviousGameStatus(gameStatus);
  }, [gameStatus]);

  // Anunciar número cantado
  useEffect(() => {
    if (ballsDrawn.length > 0 && !lineCelebrated) { // No anunciar si hay festejo de línea
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
          />

          {/* CELEBRACIÓN DE BINGO GANADOR */}
          {bingoWinnerCard && (
            <div className="winner-celebration-overlay">
              <div className="celebration-content">
                <h1 className="felicitaciones-pulse">¡BINGO!</h1>
                <div className="celebration-subtitle">Felicitaciones Ganaste Bingo con el cartón {bingoWinnerCard.cardSerial}</div>
                <div className="celebration-card-display">
                  <BingoCardPreview
                    card={{ card_serial: bingoWinnerCard.cardSerial, numbers: bingoWinnerCard.card.numbers }}
                    room="bronce" selected={false} onClick={null} showSerial={true}
                    drawnNumbers={ballsDrawn.map(b => b.number)} winningLines={[0, 1, 2]}
                  />
                </div>
              </div>
              <div className="confetti-container">
                {Array.from({ length: 50 }).map((_, i) => (
                  <div key={i} className="confetti" style={{
                    left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 3}s`,
                    backgroundColor: getBallColor(Math.floor(Math.random() * 90) + 1)
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* CELEBRACIÓN DE LÍNEA GANADORA - Usa el cartón de la grilla con números marcados */}
          {winnerCards.length > 0 && !bingoWinnerCard && (
            <div className="winner-celebration-overlay">
              <div className="celebration-content">
                {/* Título pulsante */}
                <h1 className="felicitaciones-pulse">¡Felicitaciones!</h1>
                <div className="celebration-subtitle">Ganaste Línea con el cartón {winnerCards[0].cardSerial}</div>

                {/* Cartón usando BingoCardPreview IGUAL que el expandido */}
                {winnerCards[0] && (
                  <div className="celebration-card-display">
                    <BingoCardPreview
                      card={{
                        card_serial: winnerCards[0].cardSerial,
                        numbers: winnerCards[0].card.numbers
                      }}
                      room="bronce"
                      selected={false}
                      onClick={null}
                      showSerial={true}
                      drawnNumbers={ballsDrawn.map(b => b.number)}
                      winningLines={cardWinningLines[winnerCards[0].cardId] || []}
                    />
                  </div>
                )}
              </div>

              {/* Confetti animado */}
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
                  const columnCount = columnCounts[columnIndex] || 0;

                  return (
                    <div key={columnIndex} className="grid-column">
                      <div className="column-letter">
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
                            >
                              {number}
                              {isCalled && (
                                <div className="number-glow-ring"></div>
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
                      <div className="column-letter">
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
                            >
                              {number}
                              {isCalled && (
                                <div className="number-glow-ring"></div>
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
                      <div className="column-letter">
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
                            >
                              {number}
                              {isCalled && (
                                <div className="number-glow-ring"></div>
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
              </div>

              {/* Bolillero Moderno con Video */}
              <div className="modern-bingo-machine">
                <div className="machine-top-led"></div>

                <div className="acrylic-sphere">
                  {/* Video del bolillero girando - SOLO cuando hay sorteo activo */}
                  {gameStatus === 'active' && (
                    <video
                      className="bolillero-video"
                      src={bolilleroVideo}
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  )}

                  {/* Bola actual en sorteo - superpuesta sobre el video */}
                  {currentBall && (
                    <div className="current-ball-showcase">
                      <div
                        className="showcase-ball bingo-ball-style"
                        style={{
                          backgroundColor: getBallColor(currentBall.number),
                          boxShadow: `0 4px 15px rgba(0,0,0,0.4)`
                        }}
                      >
                        <div className="ball-white-center">
                          <span className="ball-number-large">{currentBall.number}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Estado de espera - Botón de Selección de Cartones */}
                  {gameStatus === 'waiting' && cardsRemaining > 0 && !salesClosed && (
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
                        <span className="available-badge">{cardsRemaining} Disponibles</span>
                      </button>
                    </div>
                  )}

                  {/* VENTAS CERRADAS - Mostrar mensaje T-5 */}
                  {gameStatus === 'waiting' && salesClosed && (
                    <div className="card-selection-sphere sales-closed">
                      <div className="sales-closed-message">
                        <div className="sales-closed-icon">🔒</div>
                        <div className="sales-closed-text">VENTAS CERRADAS</div>
                        <div className="sales-closed-subtext">{salesMessage}</div>
                        {nextSessionTime && (
                          <div className="sales-closed-countdown">
                            Sorteo: {new Date(nextSessionTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Mensaje de espera cuando no hay cartones disponibles */}
                  {gameStatus === 'waiting' && cardsRemaining === 0 && !salesClosed && (
                    <div className="waiting-message">
                      <div className="waiting-icon">⏳</div>
                      <div className="waiting-text">Esperando inicio...</div>
                    </div>
                  )}
                </div>

                {/* Contador de Cartones eliminado - ahora está dentro del botón */}

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
                          className="recent-ball-chip bingo-ball-mini"
                          style={{
                            backgroundColor: getBallColor(ball.number),
                            boxShadow: `0 2px 8px rgba(0,0,0,0.3)`
                          }}
                        >
                          <div className="ball-white-center-mini">
                            <span className="ball-number">{ball.number}</span>
                          </div>
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

              {/* Modal de Alerta de Casi Línea - Al lado del título */}
              {almostLineCards.length > 0 && ballsDrawn.length < 40 && (() => {
                const minMissing = Math.min(...almostLineCards.map(card => card.minMissing));
                return (
                  <div className="almost-line-modal">
                    <div className="almost-line-content">
                      <span className="alert-icon-modal">⚡</span>
                      <span className="alert-text-modal">
                        ¡A {minMissing} NÚMERO{minMissing > 1 ? 'S' : ''} DE LÍNEA!
                      </span>
                    </div>
                  </div>
                );
              })()}

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
                          <div className="compact-card-serial" style={{ fontSize: '1.5rem', letterSpacing: '-0.1px', fontWeight: 700 }}>{cardSerial}</div>
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
                <div className="expanded-card-overlay" onClick={() => canCloseExpandedCard && setExpandedCard(null)}>
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
                          drawnNumbers={ballsDrawn.map(b => b.number)}
                          winningLines={cardWinningLines[card.id] || []}
                        />
                      ))}
                    <button
                      className="close-expanded-btn"
                      onClick={() => canCloseExpandedCard && setExpandedCard(null)}
                      style={{ opacity: canCloseExpandedCard ? 1 : 0.3, cursor: canCloseExpandedCard ? 'pointer' : 'not-allowed' }}
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

          {/* Controles de audio e historial */}
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
              onClick={() => setShowHistoryModal(true)}
              title="Ver historial de sorteos"
              style={{ background: 'linear-gradient(135deg, #b87333, #8b4513)' }}
            >
              📜 Historial
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

          {/* Modal "¡¡Todo Listo!!" cuando se completan 20 cartones */}
          {showReadyModal && (
            <div className="ready-modal-overlay">
              <div className="ready-modal-content bronze-modal">
                <div className="ready-modal-icon">🎉</div>
                <h2 className="ready-modal-title">¡¡Todo Listo!!</h2>
                <p className="ready-modal-subtitle">Tienes {selectedPlayerCards.length} cartones listos para jugar</p>
                <div className="ready-modal-countdown">
                  <p className="ready-modal-countdown-label">Próximo Sorteo en:</p>
                  <Countdown targetDate={(() => {
                    const today = new Date();
                    const drawTime = new Date(today);
                    drawTime.setHours(20, 0, 0, 0);

                    // Si ya pasó las 20:00 hoy, programar para mañana
                    if (today > drawTime) {
                      drawTime.setDate(drawTime.getDate() + 1);
                    }

                    return drawTime;
                  })()} />
                </div>
              </div>
            </div>
          )}

          {/* Modal de Historial de Sesiones */}
          <SessionHistory
            room="bronce"
            isOpen={showHistoryModal}
            onClose={() => setShowHistoryModal(false)}
          />
        </>
      )}
    </div>
  );
}
