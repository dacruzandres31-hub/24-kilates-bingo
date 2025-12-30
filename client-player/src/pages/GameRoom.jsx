import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useSocket } from '../hooks/useSocket';
import { useHaptic } from '../hooks/useHaptic';
import BallDraw from '../components/BallDraw';
import BingoCard from '../components/BingoCard';
import StackedBingoCards from '../components/StackedBingoCards';
import WinnerNotifications from '../components/WinnerNotifications';
import PrizeOdometer from '../components/PrizeOdometer';
import WinnerModal from '../components/WinnerModal';
import GlobalTicker from '../components/GlobalTicker';
import CelebrationModal from '../components/CelebrationModal';
import PrizeClaimModal from '../components/PrizeClaimModal';
import LineaPrizeNotification from '../components/LineaPrizeNotification';
import ChatWidget from '../components/ChatWidget';
import EmojiReactions from '../components/EmojiReactions';
import SoundToggle from '../components/SoundToggle';
import AchievementManager, { useAchievements } from '../components/AchievementManager';
import soundManager from '../utils/soundManager';
import hapticManager from '../utils/hapticManager';
import { motion, AnimatePresence } from 'framer-motion';
import QuickPinchZoom, { make3dTransformValue } from 'react-quick-pinch-zoom';
import { LogOut, Home, Grid, Layers, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * GameRoom Page - Sala de Juego Principal
 * Coordina: Bolillero + Cartón Bingo + Pots en tiempo real
 */

export default function GameRoom() {
  const navigate = useNavigate();
  const { roomType } = useParams();
  const socket = useSocket();
<<<<<<< HEAD
  const { trigger: triggerHaptic } = useHaptic();
=======
  const { unlockAchievement } = useAchievements();
>>>>>>> da36289 (feat: implement AI probability prediction, game replay system, and mobile enhancements)

  const [gameState, setGameState] = useState({
    drawnNumbers: [],
    latestNumber: null,
    potBingo: 0,
    potLinea: 0,
    potJackpot: 0,
    sessionId: null,
    status: 'waiting'
  });

  const [myCards, setMyCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [winnerData, setWinnerData] = useState(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [celebrationData, setCelebrationData] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Estados para modales de premios
  const [showLineaNotification, setShowLineaNotification] = useState(false);
  const [showPrizeClaimModal, setShowPrizeClaimModal] = useState(false);
  const [prizeData, setPrizeData] = useState({
    type: null, // 'LINEA', 'BINGO', 'POZO'
    amount: 0,
    sessionId: null
  });
  const [equippedSkin, setEquippedSkin] = useState(null);
  const [viewMode, setViewMode] = useState('stacked'); // 'stacked' | 'single'
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);

  // Sync selected index when card changes externally
  useEffect(() => {
    if (selectedCard && myCards.length > 0) {
      const idx = myCards.findIndex(c => c.id === selectedCard.id);
      if (idx !== -1) setSelectedCardIndex(idx);
    }
  }, [selectedCard, myCards]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    // Obtener usuario actual
    const token = localStorage.getItem('token');
    if (token) {
      const userData = JSON.parse(atob(token.split('.')[1]));
      setCurrentUser(userData);
    }

    // Cargar skins equipados
    loadEquippedSkin();

    // Unirse a la sala
    socket.emit('join_game', { room: roomType });

    // Escuchar número sorteado
    socket.on('number_drawn', (data) => {
      triggerHaptic('light'); // Vibration on ball draw
      setGameState(prev => ({
        ...prev,
        drawnNumbers: [...prev.drawnNumbers, data.number],
        latestNumber: data.number
      }));

      // Marcar número en cartón
      if (selectedCard) {
        selectedCard.markNumber(data.number);
      }
    });

    // Escuchar actualización de pots
    socket.on('pot_update', (data) => {
      setGameState(prev => ({
        ...prev,
        potBingo: data.potBingo,
        potLinea: data.potLinea,
        potJackpot: data.potJackpot
      }));
    });

<<<<<<< HEAD
    // Escuchar ganador de LÍNEA
    socket.on('line_winner', (data) => {
      const isMe = currentUser && data.winner.userId === currentUser.id;

      if (isMe) {
        setPrizeData({
          type: 'LINEA',
          amount: data.prizeAmount,
          sessionId: gameState.sessionId,
          winningCard: data.winningCard
        });
        triggerHaptic('success');
        setShowLineaNotification(true);
      } else {
        // Notification for others
        setWinnerData({
          ...data,
          userId: data.winner.userId,
          username: data.winner.username,
          type: 'linea'
        });
        setShowWinnerModal(true);
      }
    });

    // Escuchar ganador de BINGO
    socket.on('bingo_winner', (data) => {
      const isMe = currentUser && data.winner.userId === currentUser.id;

      // Celebración general (confetti)
      confetti({
        particleCount: isMe ? 200 : 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: isMe ? undefined : ['#bb0000', '#ffffff']
      });

      if (isMe) {
        setPrizeData({
          type: 'BINGO',
          amount: data.prizeAmount,
          sessionId: data.gameSessionId
        });
        triggerHaptic('celebrate');
        setShowPrizeClaimModal(true);
      } else {
        // Modal general para el resto
        setWinnerData({
          ...data,
          userId: data.winner.userId,
          username: data.winner.username,
          type: 'bingo',
          amount: data.prizeAmount
        });
        setShowWinnerModal(true);
      }
=======
    // Escuchar ganador detectado
    socket.on('winner_detected', (data) => {
      // Verificar si soy yo el ganador
      if (currentUser && data.userId === currentUser.id) {
        const prizeType = data.type?.toUpperCase(); // 'LINEA', 'BINGO', 'POZO'

        setPrizeData({
          type: prizeType,
          amount: data.amount || data.prizeAmount || 0,
          sessionId: gameState.sessionId
        });

        // Si es LÍNEA → Modal simple de notificación
        if (prizeType === 'LINEA') {
          setShowLineaNotification(true);
        }
        // Si es BINGO o POZO → Modal con formulario de retiro
        else if (prizeType === 'BINGO' || prizeType === 'POZO') {
          setShowPrizeClaimModal(true);
        }

        // Logro: Primer Triunfo
        unlockAchievement('first_win');
      }

      // Mostrar también el modal general de ganadores (para todos)
      setWinnerData(data);
      setShowWinnerModal(true);

      // Sonido de notificación para ganadores ajenos
      if (!currentUser || data.userId !== currentUser.id) {
        soundManager.playNotificationSound();
      }
>>>>>>> da36289 (feat: implement AI probability prediction, game replay system, and mobile enhancements)
    });

    // Escuchar cascada de jackpot
    socket.on('cascade_transfer', (data) => {
      console.log('Cascada de jackpot:', data);
    });

    // Escuchar celebraciones personales (logros propios)
    socket.on('global_ticker_message', (announcement) => {
      // Si es un logro personal, mostrar modal de celebración
      if (currentUser && announcement.username === currentUser.username) {
        setCelebrationData({
          type: announcement.type,
          title: announcement.text,
          description: `¡Has desbloqueado un nuevo logro!`,
          icon: announcement.icon
        });
        setShowCelebration(true);
      }
    });

    return () => {
      socket.off('number_drawn');
      socket.off('pot_update');
      socket.off('line_winner');
      socket.off('bingo_winner');
      socket.off('cascade_transfer');
      socket.off('global_ticker_message');
    };
  }, [socket, roomType, selectedCard, currentUser]);

  // NUEVO: Efecto para recuperar sesión activa y cartones al cargar
  useEffect(() => {
    const initRoom = async () => {
      if (!roomType) return;

      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };

        // 1. Obtener estado de la sala (ID de sesión activa)
        const roomRes = await fetch(`/api/game/room-status/${roomType}`, { headers });
        const roomData = await roomRes.json();

        if (roomData.success && roomData.sessionId) {
          const sessionId = roomData.sessionId;

          // 2. Obtener estado completo de la sesión (bolillas, pots)
          const sessionRes = await fetch(`/api/game/sessions/${sessionId}`, { headers });
          const sessionData = await sessionRes.json();

          if (sessionData.session) {
            const s = sessionData.session;
            setGameState(prev => ({
              ...prev,
              sessionId: s.id,
              status: s.status,
              potBingo: parseFloat(s.current_pot_bingo || 0),
              potLinea: parseFloat(s.current_pot_linea || 0),
              potJackpot: parseFloat(s.current_pot_jackpot || 0),
              drawnNumbers: s.drawnNumbers || [],
              latestNumber: s.drawnNumbers?.length > 0 ? s.drawnNumbers[s.drawnNumbers.length - 1] : null
            }));
          }

          // 3. Obtener cartones validados del usuario para esta sesión
          const cardsRes = await fetch(`/api/game/my-validated-cards/${sessionId}`, { headers });
          const cardsData = await cardsRes.json();

          if (cardsData.success && cardsData.cards) {
            setMyCards(cardsData.cards);
            // Seleccionar el primer cartón por defecto si no hay uno seleccionado
            if (cardsData.cards.length > 0 && !selectedCard) {
              setSelectedCard(cardsData.cards[0]);
            }
          }
        }
      } catch (error) {
        console.error('Error recuperando sesión:', error);
      }
    };

    initRoom();
  }, [roomType]);

  // Manejar reclamación de premio
  const handleClaimPrize = async (formData) => {
    try {
      const response = await fetch('/api/finance/withdrawal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          amount: winnerData.amount,
          ...formData
        })
      });

      if (!response.ok) throw new Error('Error en reclamación');

      const data = await response.json();
      console.log('Premio reclamado:', data);
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  };

  // Cargar skin equipado del usuario
  const loadEquippedSkin = async () => {
    try {
      const response = await fetch('/api/inventory/equipped', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) return;

      const data = await response.json();
      if (data.equipped && data.equipped.card_skin) {
        setEquippedSkin(data.equipped.card_skin);
      }
    } catch (error) {
      console.error('Error loading equipped skin:', error);
    }
  };

  // Aplicar estilos dinámicos del skin al cartón
  const getSkinStyles = () => {
    if (!equippedSkin) return {};

    const styles = {};
    if (equippedSkin.color_hex) {
      styles['--card-primary-color'] = equippedSkin.color_hex;
    }
    if (equippedSkin.animation_class) {
      styles['--card-animation'] = equippedSkin.animation_class;
    }
    return styles;
  };

  // Navegación de cartones (Mobile Gestures)
  const navigateCard = (direction) => {
    if (myCards.length <= 1) return;

    let nextIndex = selectedCardIndex + direction;
    if (nextIndex < 0) nextIndex = myCards.length - 1;
    if (nextIndex >= myCards.length) nextIndex = 0;

    setSelectedCardIndex(nextIndex);
    setSelectedCard(myCards[nextIndex]);
    hapticManager.vibrateMark(); // Feedback suave al cambiar
  };

  const onPinchUpdate = useCallback(({ x, y, scale }) => {
    const cardEl = document.getElementById('zoomable-card');
    if (cardEl) {
      cardEl.style.transform = make3dTransformValue({ x, y, scale });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 p-4">
      {/* Winner Notifications (Floating) */}
      <WinnerNotifications socket={socket} currentUser={currentUser} />

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg p-4">
          <div>
            <h1 className="text-3xl font-black text-white">🎰 SALA {roomType?.toUpperCase()}</h1>
            <p className="text-cyan-100 text-sm mt-1">Sesión activa - {gameState.drawnNumbers.length} bolillas sorteadas</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/lobby')}
              className="flex items-center gap-2 px-4 py-2 bg-white text-slate-900 font-bold rounded-lg hover:bg-cyan-100 transition-colors"
            >
              <Home size={20} />
              Lobby
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                navigate('/login');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
            >
              <LogOut size={20} />
              Salir
            </button>
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Prize Odometer */}
        <PrizeOdometer
          potBingo={gameState.potBingo}
          potLinea={gameState.potLinea}
          potJackpot={gameState.potJackpot}
          roomType={roomType}
        />

        {/* Game Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Bolillero - 2 columnas en desktop */}
          <div className="lg:col-span-2">
            <BallDraw
              drawnNumbers={gameState.drawnNumbers}
              latestNumber={gameState.latestNumber}
              totalDrawn={gameState.drawnNumbers.length}
            />
          </div>

          {/* Mis Cartones - 1 columna */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">🎟️ Mis Cartones</h2>

              {/* Toggle View Mode */}
              {myCards.length > 1 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode('stacked')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'stacked'
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                      }`}
                    title="Vista Apilada"
                  >
                    <Layers size={20} />
                  </button>
                  <button
                    onClick={() => setViewMode('single')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'single'
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                      }`}
                    title="Vista Lista"
                  >
                    <Grid size={20} />
                  </button>
                </div>
              )}
            </div>

            {myCards.length > 0 ? (
              viewMode === 'stacked' && myCards.length > 1 ? (
                // Vista Apilada Inteligente
                <StackedBingoCards
                  gameSessionId={gameState.sessionId}
                  socket={socket}
                  onCardSelect={(analyzedCard) => {
                    if (analyzedCard) {
                      const fullCard = myCards.find(c => c.id === analyzedCard.cardId);
                      // Merge analysis data (alerts, missing numbers) into the selected card
                      setSelectedCard({ ...fullCard, ...analyzedCard });
                    } else {
                      setSelectedCard(null);
                    }
                  }}
                />
              ) : (
                // Vista Lista Simple
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {myCards.map((card, idx) => (
                    <div
                      key={card.id}
                      onClick={() => setSelectedCard(card)}
                      className={`
                        p-3 rounded-lg border-2 cursor-pointer transition-all
                        ${selectedCard?.id === card.id
                          ? 'bg-cyan-600 border-cyan-400 scale-105'
                          : 'bg-slate-800 border-slate-700 hover:border-cyan-400'
                        }
                      `}
                    >
                      <p className="text-white font-bold">Cartón #{card.serialNumber}</p>
                      <p className="text-slate-300 text-sm">Serie {card.id}</p>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="bg-slate-800 rounded-lg p-6 text-center">
                <p className="text-slate-400">No tienes cartones en esta sala</p>
                <button
                  onClick={() => navigate('/lobby')}
                  className="mt-3 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
                >
                  Comprar Cartón
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Cartón Grande Seleccionado (Con Gestos Mobile) */}
        {selectedCard && (
<<<<<<< HEAD
          <div className="bg-slate-800 rounded-xl p-6 border-2 border-cyan-500">
            <h2 className="text-2xl font-bold text-white mb-4">
              🎯 Cartón #{selectedCard.serialNumber}
            </h2>
            <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
              <BingoCard
                gridNumbers={selectedCard.gridNumbers}
                markedNumbers={new Set(gameState.drawnNumbers)}
                showNumbers={true}
                missingNumbers={
                  selectedCard.lineAnalysis
                    ? selectedCard.lineAnalysis
                      .filter(l => l.missing === 1 && !l.isComplete)
                      .flatMap(l => l.missingNumbers)
                    : []
                }
              />
=======
          <div className="bg-slate-800 rounded-xl p-4 md:p-6 border-2 border-cyan-500 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl md:text-2xl font-bold text-white">
                🎯 Cartón #{selectedCard.serialNumber}
              </h2>
              {myCards.length > 1 && (
                <div className="flex gap-2">
                  <button onClick={() => navigateCard(-1)} className="p-2 bg-slate-700 rounded-full hover:bg-slate-600 text-white">
                    <ChevronLeft size={20} />
                  </button>
                  <span className="text-slate-400 font-medium py-1">
                    {selectedCardIndex + 1} / {myCards.length}
                  </span>
                  <button onClick={() => navigateCard(1)} className="p-2 bg-slate-700 rounded-full hover:bg-slate-600 text-white">
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}
>>>>>>> da36289 (feat: implement AI probability prediction, game replay system, and mobile enhancements)
            </div>

            <div className="relative h-[220px] md:h-auto overflow-hidden rounded-lg bg-slate-900 shadow-inner">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedCard.id}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={(e, { offset, velocity }) => {
                    const swipe = Math.abs(offset.x) > 50;
                    if (swipe && offset.x > 0) navigateCard(-1);
                    else if (swipe && offset.x < 0) navigateCard(1);
                  }}
                  className="w-full h-full p-2 md:p-4 cursor-grab active:cursor-grabbing"
                >
                  <QuickPinchZoom onUpdate={onPinchUpdate} wheelScaleFactor={0.1}>
                    <div id="zoomable-card" className="origin-top-left transition-transform duration-75">
                      <BingoCard
                        gridNumbers={selectedCard.gridNumbers}
                        cardNumber={selectedCard.serialNumber}
                        markedNumbers={new Set(gameState.drawnNumbers)}
                        showNumbers={true}
                        equippedSkin={equippedSkin}
                      />
                    </div>
                  </QuickPinchZoom>
                </motion.div>
              </AnimatePresence>

              {/* Hint para mobile */}
              <div className="absolute bottom-2 right-2 text-[10px] text-slate-500 pointer-events-none italic">
                Pinch para zoom • Desliza para cambiar
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 md:gap-4">
              <div className="text-center bg-slate-900/50 p-2 rounded-lg">
                <p className="text-slate-400 text-[10px] md:text-sm uppercase tracking-wider">Marcados</p>
                <p className="text-xl md:text-2xl font-bold text-cyan-400">
                  {Array.from(selectedCard.gridNumbers.flat().filter(n => n !== null))
                    .filter(n => gameState.drawnNumbers.includes(n)).length}/15
                </p>
              </div>
              <div className="text-center bg-slate-900/50 p-2 rounded-lg">
                <p className="text-slate-400 text-[10px] md:text-sm uppercase tracking-wider">Progreso</p>
                <p className="text-xl md:text-2xl font-bold text-green-400">
                  {((Array.from(selectedCard.gridNumbers.flat().filter(n => n !== null))
                    .filter(n => gameState.drawnNumbers.includes(n)).length / 15) * 100).toFixed(0)}%
                </p>
              </div>
              <div className="text-center bg-slate-900/50 p-2 rounded-lg">
                <p className="text-slate-400 text-[10px] md:text-sm uppercase tracking-wider">Sorteados</p>
                <p className="text-xl md:text-2xl font-bold text-yellow-400">
                  {gameState.drawnNumbers.length}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Winner Modal */}
      <WinnerModal
        isOpen={showWinnerModal}
        onClose={() => {
          setShowWinnerModal(false);
          setWinnerData(null);
        }}
        winnerData={winnerData}
        onClaim={handleClaimPrize}
      />

      {/* Global Ticker - Muro de la Fama */}
      <GlobalTicker />

      {/* Celebration Modal - Celebración personal */}
      <CelebrationModal
        isOpen={showCelebration}
        achievement={celebrationData}
        onClose={() => {
          setShowCelebration(false);
          setCelebrationData(null);
        }}
      />

      {/* Línea Prize Notification - Solo notificación */}
      <LineaPrizeNotification
        isOpen={showLineaNotification}
        onClose={() => setShowLineaNotification(false)}
        prizeAmount={prizeData.amount}
        winningCard={prizeData.winningCard}
      />

      {/* Prize Claim Modal - Formulario de retiro para BINGO y POZO */}
      <PrizeClaimModal
        isOpen={showPrizeClaimModal}
        onClose={() => setShowPrizeClaimModal(false)}
        prizeType={prizeData.type}
        prizeAmount={prizeData.amount}
        sessionId={prizeData.sessionId}
        userBalance={currentUser?.balance || 0}
      />

      {/* Footer Info */}
      <div className="max-w-7xl mx-auto mt-12 bg-slate-800 rounded-lg border-2 border-slate-700 p-4 text-center text-slate-400">
        <p>
          💡 Tip: Los números se marcan automáticamente. Mantén atención al bolillero para no perder ningún número.
        </p>
      </div>

      {/* Chat Widget */}
      {currentUser && gameState.sessionId && (
        <ChatWidget
          socket={socket}
          gameSessionId={gameState.sessionId}
          username={currentUser.username || currentUser.name}
          onMessageSent={() => unlockAchievement('first_message')}
        />
      )}

      {/* Emoji Reactions */}
      {gameState.sessionId && (
        <EmojiReactions
          socket={socket}
          gameSessionId={gameState.sessionId}
          onEmojiSent={() => unlockAchievement('first_reaction')}
        />
      )}

      {/* Sound Control */}
      <SoundToggle />

      {/* Achievement Manager (Handles notifications and logic) */}
      <AchievementManager
        socket={socket}
        gameData={{
          cards: myCards,
          sessionId: gameState.sessionId
        }}
      />
    </div>
  );
}
