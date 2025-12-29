import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/StarterRoom.css';
import GiftIcon from '../assets/Gift_icon.png';
import selectCardsButton from '../assets/select_cards_button.png';
import voiceService from '../services/voiceService';
import audioService from '../services/audioService';
import PlayerSidebar from './PlayerSidebar';
import CardSelectionLobby from './CardSelectionLobby';
import BingoCardPreview from './BingoCardPreview';
import Countdown from './Countdown';
import ModernBallMachine from './ModernBallMachine';
import RecentBallsPanel from './RecentBallsPanel';
import useSocket from '../hooks/useSocket';
import useBingoTerminal from '../hooks/useBingoTerminal';
import PendingPrizesModal from './PendingPrizesModal';
import { checkPendingPrizes } from '../helpers/pendingPrizesHelper';

export default function StarterRoom({ onLogout }) {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const [ballsDrawn, setBallsDrawn] = useState([]);
  const [lastBall, setLastBall] = useState(null);
  const [gameStatus, setGameStatus] = useState('waiting'); // waiting, active, ended
  const [previousGameStatus, setPreviousGameStatus] = useState('waiting'); // Para detectar cambios
  const [currentBall, setCurrentBall] = useState(null);
  const [floatingBalls, setFloatingBalls] = useState([]);
  const [almostLineCards, setAlmostLineCards] = useState([]); // Cartones a 2 bolillas de línea
  const [almostBingoCards, setAlmostBingoCards] = useState([]); // Cartones a 1-2 números de Bingo
  const [expandedCard, setExpandedCard] = useState(null); // Cartón expandido actualmente
  const [canCloseExpandedCard, setCanCloseExpandedCard] = useState(true); // Controla si se puede cerrar el cartón expandido
  const [lastHitCard, setLastHitCard] = useState(null); // Último cartón con acierto
  const [winnerCards, setWinnerCards] = useState([]); // Cartones ganadores con línea completa
  const [celebratedCardIds, setCelebratedCardIds] = useState([]); // IDs de cartones ya festejados (previene loop)
  const [lineCelebrated, setLineCelebrated] = useState(false); // Flag de festejo activo
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
  const [pendingPrizes, setPendingPrizes] = useState(null); // Premios pendientes
  const [showPrizesModal, setShowPrizesModal] = useState(false); // Modal de premios

  // --- TERMINAL AUTOMÁTICA ---
  const { alreadyClaimedLine, alreadyClaimedBingo } = useBingoTerminal(
    selectedPlayerCards,
    ballsDrawn,
    sessionId,
    socket,
    'starter'
  );
  const [cardsRemaining, setCardsRemaining] = useState(20); // Cartones que faltan por seleccionar
  const [showReadyModal, setShowReadyModal] = useState(false); // Modal "¡¡Todo Listo!!"
  const [isModalClosing, setIsModalClosing] = useState(false); // Estado de animación fade-out
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [nextDrawTime, setNextDrawTime] = useState(null);

  // Auto-cerrar modal "¡¡Todo Listo!!" después de 5 segundos con fade-out
  useEffect(() => {
    if (showReadyModal) {
      // Después de 4.5 segundos, iniciar fade-out
      const fadeTimer = setTimeout(() => {
        setIsModalClosing(true);
      }, 4500);

      // Después de 5 segundos, cerrar completamente
      const closeTimer = setTimeout(() => {
        setShowReadyModal(false);
        setIsModalClosing(false);
      }, 5000);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(closeTimer);
      };
    }
  }, [showReadyModal]);

  // Mostrar modal "¡¡Todo Listo!!" solo cuando tenga 20 cartones (máximo permitido)
  useEffect(() => {
    console.log('🔍 DEBUG - cardsRemaining:', cardsRemaining, 'selectedPlayerCards:', selectedPlayerCards.length);
    if (selectedPlayerCards.length >= 20) {
      console.log('✅ Mostrando modal Todo Listo - tiene 20 cartones');
      setShowReadyModal(true);
    }
  }, [selectedPlayerCards.length]);

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

  // Verificar cartones existentes del jugador al montar
  useEffect(() => {
    // Helper para letra (Starter)
    const getBallLetter = (num) => {
      if (num <= 18) return 'B';
      if (num <= 36) return 'I';
      if (num <= 54) return 'N';
      if (num <= 72) return 'G';
      return 'O';
    };

    const restoreGameState = async () => {
      try {
        console.log('🔄 [StarterRoom] Restaurando estado del juego...');
        const token = localStorage.getItem('playerToken') || localStorage.getItem('token');
        const response = await fetch(`/api/game/sessions/${sessionId || 'starter_default'}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          const session = data.session;

          if (session.status === 'active') {
            setGameStatus('active');
          }

          if (session.drawnNumbers && session.drawnNumbers.length > 0) {
            const restoredBalls = session.drawnNumbers.map((num, index) => ({
              number: num,
              color: getBallColor(num), // Usa la funcion definida fuera del useEffect
              letter: getBallLetter(num),
              id: index
            }));

            setBallsDrawn(restoredBalls);

            if (restoredBalls.length > 0) {
              const last = restoredBalls[restoredBalls.length - 1];
              setLastBall(last);
              setCurrentBall(last);
            }
          }
        }
      } catch (error) {
        console.error('❌ [StarterRoom] Error restaurando estado:', error);
      }
    };

    const checkExistingCards = async () => {
      try {
        const token = localStorage.getItem('playerToken') || localStorage.getItem('token');
        const response = await fetch(`/api/game/starter/my-cards/${sessionId || 'starter_default'}`, {
          headers: { 'Authorization': `Bearer ${token}` }
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
          // Calcular restantes excluyendo cartones de regalo (isGift=true)
          const nonGiftCards = currentCards.filter(c => !c.isGift);
          const remaining = 20 - nonGiftCards.length;
          setCardsRemaining(remaining);

          // Si tiene menos de 20 (pagos), mostrar botón
          if (remaining > 0) {
            console.log(`📋 Tiene ${nonGiftCards.length} cartones pagos y ${currentCards.length - nonGiftCards.length} de regalo. Faltan ${remaining} para el límite.`);
          }
        }
      } catch (error) {
        console.error('❌ Error cargando cartones:', error);
      }
    };

    checkExistingCards();
    loadRoomStatus();
    restoreGameState();
  }, [sessionId]);

  // Verificar premios pendientes al conectarse
  useEffect(() => {
    const verifyPendingPrizes = async () => {
      const result = await checkPendingPrizes();
      if (result && result.prizes.length > 0) {
        console.log(`🎁 [StarterRoom] Encontrados ${result.prizes.length} premios pendientes`);
        setPendingPrizes(result.prizes);
        setShowPrizesModal(true);
      }
    };

    verifyPendingPrizes();
  }, []); // Solo se ejecuta al montar el componente

  // Handler para cerrar modal de premios
  const handleClosePrizesModal = () => {
    setShowPrizesModal(false);
    setPendingPrizes(null);
  };

  // Cargar estado de la sala (siguiente sorteo)
  const loadRoomStatus = async () => {
    try {
      const token = localStorage.getItem('playerToken') || localStorage.getItem('token');
      const response = await fetch(`/api/game/room-status/starter`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.nextDraw) {
          const drawDate = new Date(data.nextDraw);
          setNextDrawTime(drawDate);
          const seconds = Math.max(0, Math.floor((drawDate - new Date()) / 1000));
          setTimeRemaining(seconds);
        }
      }
    } catch (error) {
      console.error('Error loading room status:', error);
    }
  };

  // Efecto para actualizar el contador cada segundo
  useEffect(() => {
    let interval = null;
    if (nextDrawTime) {
      interval = setInterval(() => {
        const seconds = Math.max(0, Math.floor((nextDrawTime - new Date()) / 1000));
        setTimeRemaining(seconds);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [nextDrawTime]);

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
    addFloatingEmoji('💰');

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

  // Simular bolillas flotantes en el bolillero
  useEffect(() => {
    const colors = ['#ff00ff', '#00ff00', '#00ffff', '#ffff00', '#ff0099'];
    const balls = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      number: Math.floor(Math.random() * 90) + 1,
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
      // Detener efectos de sonido al desmontar
      audioService.stopBolilleroGirando();
    };
  }, []);

  // Ref para mantener referencia actualizada de ballsDrawn sin reiniciar el intervalo
  const ballsDrawnRef = React.useRef(ballsDrawn);

  useEffect(() => {
    ballsDrawnRef.current = ballsDrawn;
  }, [ballsDrawn]);


  // Escuchar eventos del servidor (Sincronización v2.0 - Basada en SessionId)
  useEffect(() => {
    if (!socket || !sessionId) return;

    // Unirse a la sesión específica (Sincronización v2.0)
    socket.emit('join_session', { sessionId });
    console.log(`[SOCKET] 🟢 Uniendo a sesión: session_${sessionId}`);

    const handleBallDrawn = (data) => {
      console.log('🎱 [SOCKET] Bola recibida:', data);
      // Ignorar si el sessionId no coincide (doble seguridad)
      if (data.gameSessionId && String(data.gameSessionId) !== String(sessionId)) {
        console.warn(`[SOCKET] ⚠️ Bola ignorada: pertenece a sesión ${data.gameSessionId}, estamos en ${sessionId}`);
        return;
      }

      // data = { number, ballLetter, drawOrder, ... }
      const newBall = {
        number: data.number,
        color: getBallColor(data.number),
        letter: data.ballLetter || getBallLetter(data.number),
        id: data.drawOrder,
        timestamp: Date.now()
      };

      setCurrentBall(newBall);

      // Reproducir sonido cuando llega el evento
      audioService.playBolaCayendoConPausa();

      // Agregar a la lista con un pequeño delay para sincro visual
      setTimeout(() => {
        setBallsDrawn(prev => {
          if (prev.some(b => b.number === newBall.number)) return prev;
          return [...prev, newBall];
        });
        setCurrentBall(null);
      }, 3000);
    };

    const handleGameStarted = (data) => {
      console.log('🎮 [SOCKET] Juego iniciado:', data);
      setGameStatus('active');
      setBallsDrawn([]);
      setWinnerCards([]);
      setLineCelebrated(false);
      addToast('🎮', 'JUEGO INICIADO', 'El sorteo ha comenzado');
    };

    const handleGameEnded = (data) => {
      console.log('🏁 [SOCKET] Juego terminado:', data);
      setGameStatus('ended');
      addToast('🏁', 'JUEGO FINALIZADO', 'El sorteo ha terminado');
    };

    const handlePotUpdate = (data) => {
      console.log('💰 [SOCKET] Pot update (session specific):', data);
      setPots({
        bingo: data.potBingo || 'Ticket Oro',
        linea: data.potLinea || 'Ticket Bronce',
        pre40: data.potJackpot || 0
      });
    };

    const handleCurrentGameState = (data) => {
      console.log('🔄 [SOCKET] Sincronización de estado recibida:', data);

      if (data.isPaused) {
        setGameStatus('waiting');
      } else if (data.ballsDrawn && data.ballsDrawn.length > 0) {
        setGameStatus('active');
      }

      const restoredBalls = (data.ballsDrawn || []).map((num, index) => ({
        number: num,
        color: getBallColor(num),
        letter: getBallLetter(num),
        id: index + 1
      }));

      setBallsDrawn(restoredBalls);

      if (data.lastBall) {
        const last = {
          number: data.lastBall.number,
          color: getBallColor(data.lastBall.number),
          letter: data.lastBall.letter,
          id: data.drawOrder || restoredBalls.length,
          timestamp: Date.now()
        };
        setLastBall(last);
        setCurrentBall(null); // Evitar animaciones de caída para bolas ya sorteadas
      }

      if (data.lineWinnersPaid) {
        setLineCelebrated(true); // Ya se cobró la línea en esta sesión
      }
    };

    socket.on('number_drawn', handleBallDrawn);
    socket.on('game_started', handleGameStarted);
    socket.on('game_ended', handleGameEnded);
    socket.on('pot_update', handlePotUpdate);
    socket.on('current_game_state', handleCurrentGameState);

    return () => {
      socket.off('number_drawn', handleBallDrawn);
      socket.off('game_started', handleGameStarted);
      socket.off('game_ended', handleGameEnded);
      socket.off('pot_update', handlePotUpdate);
      socket.off('current_game_state', handleCurrentGameState);
    };
  }, [socket, sessionId]);

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
        setShowReadyModal(false); // Close Ready Modal immediately
        addToast('🎮', 'JUEGO INICIADO', 'El sorteo ha comenzado');
        audioService.startBolilleroGirando();
      } else if (gameStatus === 'ended') {
        addToast('🏁', 'JUEGO FINALIZADO', 'El sorteo ha terminado');
        audioService.stopBolilleroGirando();
      }
    }
  }, [gameStatus, previousGameStatus]);

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

  const getNumberRange = (number) => {
    if (number >= 1 && number <= 10) return '1-10';
    if (number >= 11 && number <= 20) return '11-20';
    if (number >= 21 && number <= 30) return '21-30';
    if (number >= 31 && number <= 40) return '31-40';
    if (number >= 41 && number <= 50) return '41-50';
    if (number >= 51 && number <= 60) return '51-60';
    if (number >= 61 && number <= 70) return '61-70';
    if (number >= 71 && number <= 80) return '71-80';
    return '81-90';
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
  const handleCardsSelected = async (reservedCards, remainingTicketsFromBackend) => {
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

    // Calcular cuántos cartones faltan basado en el total que tiene (máx 20)
    const remaining = Math.max(0, 20 - allCards.length);
    setCardsRemaining(remaining);
    setShowCardSelection(false);
    console.log(`✅ Total de cartones: ${allCards.length}, faltan: ${remaining}, tickets backend: ${remainingTicketsFromBackend}`);

    // Si se completaron los 20 cartones, mostrar modal "¡¡Todo Listo!!"
    if (allCards.length >= 20) {
      // FIX: Esperar a que se actualice la hora del sorteo antes de mostrar
      await loadRoomStatus();
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
    // BLOQUEO: No expandir si hay celebración activa o modal de ganador
    if (celebrationMode || winnerCards.length > 0) return;

    setExpandedCard(cardId);
    setCanCloseExpandedCard(false); // Bloquear cierre manual durante tiempo programado
    setTimeout(() => {
      setExpandedCard(null);
      setCanCloseExpandedCard(true); // Restablecer después de cerrar
    }, 3500); // 3.5 segundos expandido
  };

  // Detectar cuando un número coincide con un cartón
  useEffect(() => {
    if (ballsDrawn.length > 0 && !lineCelebrated) { // No expandir si hay festejo de línea
      const latestBall = ballsDrawn[ballsDrawn.length - 1];

      // Buscar cartones que tienen este número
      playerCards.forEach(card => {
        const hasNumber = card.numbers.flat().includes(latestBall.number);
        if (hasNumber && expandedCard !== card.id && !lineCelebrated) {
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

    // Check Bingo Status
    const cardsAlmostBingo = [];
    playerCards.forEach(card => {
      const markedCount = getCardProgress(card);
      const missingForBingo = 15 - markedCount;
      if (missingForBingo <= 2) {
        cardsAlmostBingo.push({
          cardId: card.id,
          minMissing: missingForBingo
        });
      }
    });
    setAlmostBingoCards(cardsAlmostBingo);

    // Only update Almost Line if Line hasn't been won yet
    const hasLineBeenWonGlobal = celebratedCardIds.length > 0 || lineCelebrated;
    if (!hasLineBeenWonGlobal) {
      setAlmostLineCards(cardsAlmostThere);
    } else {
      setAlmostLineCards([]); // Clear Line alerts once Line is won
    }

    setCardWinningLines(newCardWinningLines); // Actualizar líneas ganadoras

    // removed redundant setAlmostLineCards call

    // Mostrar celebración si hay NUEVOS ganadores que NO han sido festejados
    // ANTI-LOOP: Verificar que el cartón NO esté en celebratedCardIds
    const newWinners = cardsWithWinningLines.filter(card =>
      !celebratedCardIds.includes(card.cardId)
    );

    // FIX: Line can only be won ONCE per game session.
    // If celebratedCardIds has any entries, it means Line was already won by someone.
    const hasLineBeenWon = celebratedCardIds.length > 0;

    if (newWinners.length > 0 && !lineCelebrated && !hasLineBeenWon) {
      // Tomar el primer cartón ganador nuevo
      const winnerCard = newWinners[0];

      setWinnerCards([winnerCard]); // Solo el nuevo ganador
      setLineCelebrated(true);
      setCelebratedCardIds([...celebratedCardIds, winnerCard.cardId]); // Marcar como festejado

      // Limpiar alertas de "casi línea" porque ya se ganó
      setAlmostLineCards([]);

      // 1. PRIMERO: Anunciar línea ganadora INMEDIATAMENTE (100ms para dar tiempo a que se active el audio)
      setTimeout(() => {
        console.log('[StarterRoom] 🎶 Reproduciendo voz: Felicitaciones, Ganaste Línea');
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
          // Desaparecer festejo de línea e información relacionada JUSTO antes del anuncio
          setWinnerCards([]);
          setHighlightedLine(null);
          setLineCelebrated(false);

          // Anunciar continuación a BINGO
          voiceService.speak('Continuamos hasta Bingo');

          setTimeout(() => {
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
  }, [ballsDrawn.length, playerCards.length, lineCelebrated, gameStatus, winnerCards.length]);

  useEffect(() => {
    return () => {
      if (pauseTimeout) clearTimeout(pauseTimeout);
    };
  }, [pauseTimeout]);

  // Detectar cambios en el estado del juego y anunciar
  useEffect(() => {
    console.log(`🎮 [StarterRoom] gameStatus cambió: ${previousGameStatus} → ${gameStatus}`);

    if (gameStatus === 'active' && previousGameStatus !== 'active') {
      console.log('🎬 SORTEO ACTIVO - Iniciando bolillero');

      // Iniciar bolillero cuando arranca el sorteo
      audioService.startBolilleroGirando();

      // Bajar volumen de música de fondo al 70%
      audioService.lowerMusicVolume();

      // Anuncios según el estado previo
      if (previousGameStatus === 'waiting') {
        voiceService.announceSorteoIniciado();
        addToast('🎲', '¡Sorteo iniciado!', 'Buena suerte');
      } else if (previousGameStatus === 'paused') {
        voiceService.announceSorteoReiniciado();
      }

    } else if (gameStatus === 'waiting' && previousGameStatus === 'active') {
      console.log('⏸️ PAUSANDO SORTEO - Deteniendo bolillero');
      // NO anunciar "Sorteo Pausado" si hay línea celebrada (ya se anunció "Felicitaciones")
      if (!lineCelebrated) {
        voiceService.announceSorteoPausado();
      }
      // Detener sonido de bolillero
      audioService.stopBolilleroGirando();
      // Restaurar volumen de música al 100%
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
      console.log(`📢 [StarterRoom] Anunciando número: ${lastDrawnBall.number}`);

      // NO reproducir sonido aquí - ya se reprodujo cuando cayó (currentBall)
      // Solo anunciar con voz
      setTimeout(() => {
        voiceService.announceNumber(lastDrawnBall.number);
      }, 500);

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
    <div className="starter-room">
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



      {/* Sala de selección de cartones (overlay sobre la sala) */}
      {showCardSelection && (
        <CardSelectionLobby
          sessionId={sessionId || 'starter_default'}
          onCardsSelected={handleCardsSelected}
          onCancel={handleCancelSelection}
          maxCards={cardsRemaining}
          currentCards={selectedPlayerCards.length}
          timeWindow="open"
          roomTheme="starter"
        />
      )}

      {/* Sala de juego (solo visible después de seleccionar cartones) */}
      {!showCardSelection && (
        <>
          {/* Sidebar con información del jugador */}
          <PlayerSidebar
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            onLogout={onLogout}
          />

          {/* CELEBRACIÓN DE LÍNEA GANADORA - Usa el cartón de la grilla con números marcados */}
          {winnerCards.length > 0 && (
            <div className="winner-celebration-overlay">
              <div className="celebration-content">
                {/* Título pulsante */}
                <h1 className="felicitaciones-pulse">¡Felicitaciones!</h1>
                <div className="celebration-subtitle">Ganaste Línea con el cartón {winnerCards[0].cardSerial}</div>

                {/* Cartón usando BingoCardPreview IGUAL que el expandido */}
                {winnerCards[0] && (
                  <div className="celebration-card-display" style={{ transform: 'scale(1.5)', marginTop: '40px' }}>
                    <BingoCardPreview
                      card={{
                        card_serial: winnerCards[0].cardSerial,
                        numbers: winnerCards[0].card.numbers
                      }}
                      room="starter"
                      selected={false}
                      onClick={null}
                      showSerial={true}
                      drawnNumbers={ballsDrawn.map(b => b.number)}
                      winningLines={
                        cardWinningLines[winnerCards[0].cardId] && cardWinningLines[winnerCards[0].cardId].length > 0
                          ? [cardWinningLines[winnerCards[0].cardId][0]] // FIX: SÓLO mostrar la PRIMERA línea ganadora como dorada
                          : []
                      }
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
                      <div
                        className="column-letter"
                        style={{
                          color: '#00fbff',
                          textShadow: '0 0 8px rgba(0, 251, 255, 0.7)',
                          background: 'linear-gradient(180deg, rgba(0, 251, 255, 0.3), rgba(0, 139, 139, 0.3))',
                          borderRadius: '6px',
                          border: '2px solid #008b8b',
                          fontFamily: "Georgia, 'Times New Roman', serif",
                          padding: '4px 0',
                          fontWeight: 700,
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
                                background: 'linear-gradient(135deg, #00fbff, #00ced1)',
                                color: '#001a1a',
                                fontWeight: 900,
                                border: '2px solid #00fbff',
                                boxShadow: '0 0 15px rgba(0, 251, 255, 0.9), inset 0 0 10px rgba(255, 255, 255, 0.3)',
                                fontFamily: "Georgia, 'Times New Roman', serif",
                                borderRadius: '4px',
                                padding: '6px 3px',
                                textAlign: 'center',
                                fontSize: '1.2rem',
                                textShadow: '1px 1px 2px rgba(255, 255, 255, 0.5), -1px -1px 2px rgba(0, 0, 0, 0.3)'
                              } : {
                                background: 'rgba(0, 40, 40, 0.7)',
                                border: '1px solid rgba(0, 251, 255, 0.3)',
                                borderRadius: '4px',
                                color: '#008b8b',
                                fontFamily: "Georgia, 'Times New Roman', serif",
                                padding: '6px 3px',
                                textAlign: 'center',
                                fontSize: '1.2rem',
                                fontWeight: 600
                              }}
                            >
                              {number}
                              {isCalled && (
                                <div className="number-glow-ring" style={{ borderColor: '#00fbff' }}></div>
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
                          color: '#00fbff',
                          textShadow: '0 0 8px rgba(0, 251, 255, 0.7)',
                          background: 'linear-gradient(180deg, rgba(0, 251, 255, 0.3), rgba(0, 139, 139, 0.3))',
                          borderRadius: '6px',
                          border: '2px solid #008b8b',
                          fontFamily: "Georgia, 'Times New Roman', serif",
                          padding: '4px 0',
                          fontWeight: 700,
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
                                background: 'linear-gradient(135deg, #00fbff, #00ced1)',
                                color: '#001a1a',
                                fontWeight: 900,
                                border: '2px solid #00fbff',
                                boxShadow: '0 0 15px rgba(0, 251, 255, 0.9), inset 0 0 10px rgba(255, 255, 255, 0.3)',
                                fontFamily: "Georgia, 'Times New Roman', serif",
                                borderRadius: '4px',
                                padding: '6px 3px',
                                textAlign: 'center',
                                fontSize: '1.2rem',
                                textShadow: '1px 1px 2px rgba(255, 255, 255, 0.5), -1px -1px 2px rgba(0, 0, 0, 0.3)'
                              } : {
                                background: 'rgba(0, 40, 40, 0.7)',
                                border: '1px solid rgba(0, 251, 255, 0.3)',
                                borderRadius: '4px',
                                color: '#008b8b',
                                fontFamily: "Georgia, 'Times New Roman', serif",
                                padding: '6px 3px',
                                textAlign: 'center',
                                fontSize: '1.2rem',
                                fontWeight: 600
                              }}
                            >
                              {number}
                              {isCalled && (
                                <div className="number-glow-ring" style={{ borderColor: '#00fbff' }}></div>
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
                          color: '#00fbff',
                          textShadow: '0 0 8px rgba(0, 251, 255, 0.7)',
                          background: 'linear-gradient(180deg, rgba(0, 251, 255, 0.3), rgba(0, 139, 139, 0.3))',
                          borderRadius: '6px',
                          border: '2px solid #008b8b',
                          fontFamily: "Georgia, 'Times New Roman', serif",
                          padding: '4px 0',
                          fontWeight: 700,
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
                                background: 'linear-gradient(135deg, #00fbff, #00ced1)',
                                color: '#001a1a',
                                fontWeight: 900,
                                border: '2px solid #00fbff',
                                boxShadow: '0 0 15px rgba(0, 251, 255, 0.9), inset 0 0 10px rgba(255, 255, 255, 0.3)',
                                fontFamily: "Georgia, 'Times New Roman', serif",
                                borderRadius: '4px',
                                padding: '6px 3px',
                                textAlign: 'center',
                                fontSize: '1.2rem',
                                textShadow: '1px 1px 2px rgba(255, 255, 255, 0.5), -1px -1px 2px rgba(0, 0, 0, 0.3)'
                              } : {
                                background: 'rgba(0, 40, 40, 0.7)',
                                border: '1px solid rgba(0, 251, 255, 0.3)',
                                borderRadius: '4px',
                                color: '#008b8b',
                                fontFamily: "Georgia, 'Times New Roman', serif",
                                padding: '6px 3px',
                                textAlign: 'center',
                                fontSize: '1.2rem',
                                fontWeight: 600
                              }}
                            >
                              {number}
                              {isCalled && (
                                <div className="number-glow-ring" style={{ borderColor: '#00fbff' }}></div>
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

              {/* Bolillero Moderno */}
              {/* Bolillero Moderno */}
              <ModernBallMachine
                theme="starter"
                currentBall={currentBall}
                isActive={gameStatus === 'active'}
                cardsRemaining={cardsRemaining}
                onSelectCards={() => setShowCardSelection(true)}
                waitingButtonImage={selectCardsButton}
              />

              {/* Últimas 5 bolas - COMPONENTE NUEVO (60px) */}
              <RecentBallsPanel balls={ballsDrawn} getBallColor={getBallColor} />
            </div>

          </div>

          {/* MITAD INFERIOR - LOS CARTONES */}
          <div className="player-cards-section">
            <div className="cards-header">
              <div className="cards-title">
                <span className="cards-icon">🎴</span>
                <span>MIS CARTONES</span>
              </div>

              {/* Notificaciones de Estado (Casi Línea / Casi Bingo) */}
              {(() => {
                const hasLineBeenWon = celebratedCardIds.length > 0 || lineCelebrated;

                // PRIORIDAD 1: ALERTA DE BINGO (Solo si ya se ganó la línea)
                if (hasLineBeenWon && almostBingoCards.length > 0 && ballsDrawn.length < 90) {
                  const minMissing = Math.min(...almostBingoCards.map(c => c.minMissing));
                  return (
                    <div className="almost-line-modal almost-bingo-modal">
                      <div className="almost-line-content">
                        <span className="alert-icon-modal">💎</span>
                        <span className="alert-text-modal">
                          ¡A {minMissing} NÚMERO{minMissing > 1 ? 'S' : ''} DE BINGO!
                        </span>
                      </div>
                    </div>
                  );
                }

                // PRIORIDAD 2: ALERTA DE LÍNEA (Restaurada y Mejorada)
                // Solo si NO se ha ganado línea aún. Y SE QUEDA hasta que se gane.
                if (!hasLineBeenWon && !lineCelebrated && almostLineCards.length > 0) {
                  const minMissing = Math.min(...almostLineCards.map(card => card.minMissing));
                  const count = almostLineCards.length;
                  return (
                    <div className="almost-line-modal">
                      <div className="almost-line-content">
                        <span className="alert-icon-modal">⚡</span>
                        <span className="alert-text-modal">
                          {count > 1 ? `¡${count} CARTONES A ` : '¡A '}
                          {minMissing} NÚMERO{minMissing > 1 ? 'S' : ''} DE LÍNEA!
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="cards-count">{playerCards.length} cartones</div>
            </div>

            <div className="cards-grid-container">
              {/* Grid compacto 6x5 = 30 cartones */}
              <div className="cards-compact-grid">
                {/* SAFEGUARD: Mensaje si no hay cartones (aunque no debería pasar si hay length > 0) */}
                {playerCards.length === 0 && (
                  <div style={{ color: '#fff', textAlign: 'center', padding: '20px' }}>
                    No hay cartones visibles.
                  </div>
                )}
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
                          room="starter"
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
              {/* Últimas 5 bolas - COMPONENTE NUEVO (75px) */}

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
          {/* Botón de control (solo para testing - VOZ MANTENIDO) */}
          <div className="test-controls" style={{ justifyContent: 'center' }}>
            <button
              className="control-btn voice-btn"
              onClick={() => setShowVoiceSelector(true)}
              title="Cambiar voz del anunciador"
            >
              🎤 Voz
            </button>
          </div>

          {/* Sistema de Reacciones */}
          <div className="reactions-panel">
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

          {/* Modal "¡¡Todo Listo!!" cuando se completan 20 cartones */}
          {showReadyModal && (
            <div className={`ready-modal-overlay ${isModalClosing ? 'fade-out' : ''}`}>
              <div className={`ready-modal-content starter-modal ${isModalClosing ? 'fade-out' : ''}`}>
                <div className="ready-modal-icon">🎉</div>
                <h2 className="ready-modal-title">¡¡Todo Listo!!</h2>
                <p className="ready-modal-subtitle">Tienes {selectedPlayerCards.length} cartones listos para jugar</p>
                <div className="ready-modal-countdown">
                  <p className="ready-modal-countdown-label">Próximo Sorteo en:</p>
                  {nextDrawTime ? (
                    <Countdown targetDate={nextDrawTime} />
                  ) : (
                    <p className="loading-countdown">Calculando...</p>
                  )}
                </div>
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

      {/* Modal de premios pendientes */}
      {showPrizesModal && pendingPrizes && (
        <PendingPrizesModal
          prizes={pendingPrizes}
          onClose={handleClosePrizesModal}
        />
      )}
    </div>
  );
}
