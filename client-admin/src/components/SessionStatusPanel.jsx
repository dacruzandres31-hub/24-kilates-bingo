import { useState, useEffect } from 'react';
import axios from 'axios';
import { Clock, ShoppingCart, Calendar, Play, Lock, Unlock, StopCircle } from 'lucide-react';
import useSocket from '../hooks/useSocket';

export default function SessionStatusPanel() {
  const [roomsData, setRoomsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const socket = useSocket();
  const [animatingPots, setAnimatingPots] = useState({}); // Para animaciones
  const [toast, setToast] = useState(null); // Para notificaciones
  const [activeGames, setActiveGames] = useState([]);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    fetchSessions();
    fetchActiveGames();
    fetchUserData();
    const sessionsInterval = setInterval(fetchSessions, 30000);
    const gamesInterval = setInterval(fetchActiveGames, 10000);
    return () => {
      clearInterval(sessionsInterval);
      clearInterval(gamesInterval);
    };
  }, []);

  // Escuchar actualizaciones de pozos en tiempo real
  useEffect(() => {
    if (!socket) return;

    const handlePotsUpdated = (data) => {
      console.log('📡 [Admin] Pozos actualizados:', data);

      // Activar animación para esta sala
      setAnimatingPots(prev => ({ ...prev, [data.room]: true }));
      setTimeout(() => {
        setAnimatingPots(prev => ({ ...prev, [data.room]: false }));
      }, 2000);

      // Mostrar toast notification
      const roomNames = { bronce: 'Bronce', plata: 'Plata', oro: 'Oro' };
      const totalIncrement = data.pots.jackpot_linea + data.pots.jackpot_bingo + data.pots.jackpot_pre40;

      setToast({
        room: data.room,
        roomName: roomNames[data.room],
        message: data.message || 'Pozos actualizados',
        pots: data.pots
      });

      // Auto-dismiss toast después de 4 segundos
      setTimeout(() => setToast(null), 4000);

      // Actualizar el estado de roomsData con los nuevos pozos
      setRoomsData(prevRooms => prevRooms.map(roomData => {
        if (roomData.room === data.room && roomData.currentSession) {
          return {
            ...roomData,
            currentSession: {
              ...roomData.currentSession,
              jackpot_linea: data.pots.jackpot_linea,
              jackpot_bingo: data.pots.jackpot_bingo,
              jackpot_pre40: data.pots.jackpot_pre40
            }
          };
        }
        return roomData;
      }));
    };

    socket.on('pots_updated', handlePotsUpdated);

    return () => {
      socket.off('pots_updated', handlePotsUpdated);
    };
  }, [socket]);

  const getToken = () => localStorage.getItem('adminToken');

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/sessions/active', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });

      setRoomsData(response.data.rooms || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError('Error al cargar sesiones');
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveGames = async () => {
    try {
      const response = await axios.get('/api/game-admin/status', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setActiveGames(response.data.activeGames || []);
    } catch (error) {
      console.error('Error fetching active games:', error);
    }
  };

  const fetchUserData = async () => {
    try {
      const response = await axios.get('/api/admin/profile', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setUserData(response.data);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handleStartGame = async (sessionId) => {
    console.log('[SessionStatus] handleStartGame called with sessionId:', sessionId);

    if (!sessionId) {
      alert('No se puede iniciar el sorteo: No hay una sesión activa. Por favor, crea una sesión primero en "Control de Sesiones".');
      return;
    }

    try {
      console.log('[SessionStatus] Sending POST to /api/game-admin/start with sessionId:', sessionId);
      const response = await axios.post('/api/game-admin/start', {
        gameSessionId: sessionId,
        drawInterval: 5000,
        pauseOnWinner: 2000
      }, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });

      console.log('[SessionStatus] Response:', response.data);
      alert('Sorteo iniciado exitosamente');
      fetchActiveGames();
    } catch (error) {
      console.error('[SessionStatus] Error starting game:', error);
      console.error('[SessionStatus] Error response:', error.response?.data);
      alert(error.response?.data?.message || error.message || 'Error al iniciar sorteo');
    }
  };

  const handleStopGame = async (sessionId) => {
    if (!confirm('¿Detener el sorteo automático?')) {
      return;
    }

    try {
      await axios.post('/api/game-admin/stop', {
        gameSessionId: sessionId
      }, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });

      alert('Sorteo detenido');
      fetchActiveGames();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al detener sorteo');
    }
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDateTime = (datetime) => {
    if (!datetime) return '-';
    const date = new Date(datetime);
    const weekday = date.toLocaleDateString('es-ES', { weekday: 'short' });
    const day = date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    const time = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    return `${weekday} ${day} ${time}`;
  };

  const getRoomInfo = (room) => {
    const info = {
      starter: { name: 'Starter', icon: '🎁', color: 'from-green-600/40 to-green-800/20 border-green-500/50' },
      bronce: { name: 'Bronce', icon: '🥉', color: 'from-orange-600/40 to-orange-800/20 border-orange-500/50' },
      plata: { name: 'Plata', icon: '🥈', color: 'from-gray-400/40 to-gray-600/20 border-gray-400/50' },
      oro: { name: 'Oro', icon: '🥇', color: 'from-yellow-600/40 to-yellow-800/20 border-yellow-500/50' }
    };
    return info[room] || { name: room, icon: '🎲', color: 'from-blue-600/40 to-blue-800/20 border-blue-500/50' };
  };

  const isStarterDrawing = (sessionStartTime) => {
    if (!sessionStartTime) return false;
    const now = new Date();
    const startTime = new Date(sessionStartTime);
    const diffMinutes = (startTime - now) / 1000 / 60;

    // Starter sortea si falta menos de 5 minutos para la hora programada
    // o si ya pasó la hora pero no más de 10 minutos
    return diffMinutes <= 5 && diffMinutes >= -10;
  };

  const getSessionStatus = (session, room) => {
    if (!session) return { text: 'Sin sesión', icon: <Lock className="w-4 h-4" />, color: 'bg-gray-600' };

    // Starter: Verificar si está sorteando según horario
    if (room === 'starter') {
      if (isStarterDrawing(session.start_time)) {
        return { text: 'SORTEANDO AHORA', icon: <Play className="w-4 h-4 animate-pulse" />, color: 'bg-red-600 animate-pulse' };
      }
      return { text: 'Habilitada (GRATIS)', icon: <Unlock className="w-4 h-4" />, color: 'bg-green-500' };
    }

    // Otras salas: Verificar estado de sesión
    if (session.status === 'playing') {
      return { text: 'SORTEANDO AHORA', icon: <Play className="w-4 h-4 animate-pulse" />, color: 'bg-red-600 animate-pulse' };
    }

    if (session.status === 'active' || session.status === 'pending') {
      return { text: 'Habilitada para comprar', icon: <Unlock className="w-4 h-4" />, color: 'bg-green-500' };
    }

    return { text: 'Habilitada para comprar', icon: <Unlock className="w-4 h-4" />, color: 'bg-green-500' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Cargando sesiones...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Calendar className="w-8 h-8 text-blue-400" />
          Estado de Sesiones por Sala
        </h2>
        <button
          onClick={fetchSessions}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <Clock className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {roomsData.map(({ room, currentSession, upcomingSessions, prizeConfig }) => {
          const roomInfo = getRoomInfo(room);
          const statusInfo = getSessionStatus(currentSession, room);
          const isStarter = room === 'starter';

          return (
            <div
              key={room}
              className={`bg-gradient-to-br ${roomInfo.color} rounded-xl border-2 p-6 shadow-xl`}
            >
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/20">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{roomInfo.icon}</span>
                  <div>
                    <h3 className="text-2xl font-bold text-white">{roomInfo.name}</h3>
                    <p className="text-sm text-gray-300">Sala {roomInfo.name}</p>
                  </div>
                </div>
                <div className={`${statusInfo.color} text-white px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2`}>
                  {statusInfo.icon}
                  {statusInfo.text}
                </div>
              </div>

              {currentSession ? (
                <div className="bg-black/30 rounded-lg p-4 mb-4">
                  <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                    <Play className="w-5 h-5 text-green-400" />
                    Sesión Actual {currentSession.is_virtual ? '(Próxima programada)' : ''}
                  </h4>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="flex items-center gap-2 text-gray-300">
                      <Calendar className="w-4 h-4 text-blue-400" />
                      <span className="text-sm">{formatDateTime(currentSession.start_time)}</span>
                    </div>
                    {!isStarter && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <ShoppingCart className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-semibold">{currentSession.total_paid_cards || 0} vendidos</span>
                      </div>
                    )}
                    {isStarter && (
                      <div className="text-gray-300 text-sm">
                        <span className="text-yellow-400 font-semibold">GRATIS</span> • Sorteo cada hora
                      </div>
                    )}
                  </div>

                  {isStarter ? (
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/10">
                      <div className="text-center bg-blue-900/30 rounded p-2">
                        <p className="text-xs text-gray-400 mb-1">PREMIO LÍNEA</p>
                        <p className="text-blue-300 font-bold text-sm">{prizeConfig?.prize_linea || '1 Ticket Bronce'}</p>
                      </div>
                      <div className="text-center bg-green-900/30 rounded p-2">
                        <p className="text-xs text-gray-400 mb-1">PREMIO BINGO</p>
                        <p className="text-green-300 font-bold text-sm">{prizeConfig?.prize_bingo || '1 Ticket Oro'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className={`grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/10 transition-all ${animatingPots[room] ? 'animate-pulse-pot' : ''}`}>
                      <div className="text-center">
                        <p className="text-xs text-gray-400 mb-1">LÍNEA</p>
                        <p className="text-blue-300 font-bold text-sm">{formatMoney(currentSession.jackpot_linea || 0)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-400 mb-1">BINGO</p>
                        <p className="text-green-300 font-bold text-sm">{formatMoney(currentSession.jackpot_bingo || 0)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-400 mb-1">PRE-40</p>
                        <p className="text-yellow-300 font-bold text-sm">{formatMoney(currentSession.jackpot_pre40 || 0)}</p>
                      </div>
                    </div>
                  )}

                  {/* Game Control Buttons - Only for Andy */}
                  {userData?.username === 'Andy' && currentSession && (() => {
                    const isGameActive = activeGames.some(g => g.sessionId === currentSession.id);
                    const activeGame = activeGames.find(g => g.sessionId === currentSession.id);

                    if (isGameActive) {
                      return (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                          <div className="flex items-center gap-2 text-green-400 text-xs font-semibold">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            SORTEO EN VIVO - {activeGame?.ballsDrawn || 0} bolas
                          </div>
                          <button
                            onClick={() => handleStopGame(currentSession.id)}
                            className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
                          >
                            <StopCircle className="w-4 h-4" />
                            Detener Sorteo
                          </button>
                        </div>
                      );
                    }

                    if (currentSession.status === 'pending') {
                      return (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <button
                            onClick={() => handleStartGame(currentSession.id)}
                            className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
                          >
                            <Play className="w-4 h-4" />
                            Iniciar Sorteo
                          </button>
                        </div>
                      );
                    }

                    return null;
                  })()}
                </div>
              ) : (
                <div className="bg-black/30 rounded-lg p-4 mb-4 text-center text-gray-400">
                  <Lock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay sesión activa</p>
                </div>
              )}

              <div className="bg-black/20 rounded-lg p-4">
                <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-yellow-400" />
                  Próximas Sesiones ({upcomingSessions.length})
                </h4>

                {upcomingSessions.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-2">No hay sesiones programadas</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {upcomingSessions.map((session, index) => (
                      <div
                        key={session.id || index}
                        className="bg-white/5 hover:bg-white/10 rounded-lg p-2 flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-400 w-6">#{index + 1}</span>
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-sm text-gray-200">{formatDateTime(session.start_time)}</span>
                        </div>
                        {session.id && <span className="text-xs text-gray-400">ID: {session.id}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-slideIn">
          <div className={`bg-gradient-to-r ${toast.room === 'bronce' ? 'from-orange-600 to-orange-700' :
            toast.room === 'plata' ? 'from-gray-500 to-gray-600' :
              'from-yellow-600 to-yellow-700'
            } text-white rounded-lg shadow-2xl p-4 min-w-[320px] border-2 border-white/20`}>
            <div className="flex items-start gap-3">
              <div className="text-3xl">
                {toast.room === 'bronce' ? '🥉' : toast.room === 'plata' ? '🥈' : '🥇'}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-lg mb-1">
                  Sala {toast.roomName}
                </h4>
                <p className="text-sm opacity-90 mb-2">{toast.message}</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-black/20 rounded px-2 py-1">
                    <div className="opacity-70">Línea</div>
                    <div className="font-bold">${toast.pots.jackpot_linea.toLocaleString()}</div>
                  </div>
                  <div className="bg-black/20 rounded px-2 py-1">
                    <div className="opacity-70">Bingo</div>
                    <div className="font-bold">${toast.pots.jackpot_bingo.toLocaleString()}</div>
                  </div>
                  <div className="bg-black/20 rounded px-2 py-1">
                    <div className="opacity-70">Pre-40</div>
                    <div className="font-bold">${toast.pots.jackpot_pre40.toLocaleString()}</div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setToast(null)}
                className="text-white/70 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 5px rgba(59, 130, 246, 0.5);
          }
          50% {
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.8);
          }
        }

        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }

        .animate-pulse-pot {
          animation: pulse 0.5s ease-in-out 3, glow 0.5s ease-in-out 3;
        }
      `}</style>
    </div>
  );
}
