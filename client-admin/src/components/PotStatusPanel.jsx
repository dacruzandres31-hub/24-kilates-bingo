import { useState, useEffect } from 'react';
import axios from 'axios';
import { DollarSign, Wifi, WifiOff, Calendar, TrendingUp } from 'lucide-react';
import { io } from 'socket.io-client';
import ProximosSorteosModal from './ProximosSorteosModal';
import PotHistoryModal from './PotHistoryModal';
import { X } from 'lucide-react';

export default function PotStatusPanel() {
  const [pozos, setPozos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);

  // History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyRoom, setHistoryRoom] = useState(null);

  // Toast State
  const [toast, setToast] = useState(null);

  useEffect(() => {
    // Fetch inicial
    fetchPozos();

    // Auto-refresh cada 30 segundos (mismo intervalo que SessionStatusPanel)
    const refreshInterval = setInterval(() => {
      fetchPozos();
    }, 30000);

    // Conectar WebSocket
    const socketInstance = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socketInstance.on('connect', () => {
      console.log('✅ Socket.IO conectado para pozos en vivo');
      setSocketConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('❌ Socket.IO desconectado');
      setSocketConnected(false);
    });

    // Escuchar actualizaciones de pozos en tiempo real
    socketInstance.on('pots_updated', (data) => {
      console.log('📡 Pozos actualizados via WebSocket:', data);

      // Si el evento incluye estructura de rooms (nueva estructura)
      if (data.rooms) {
        const pozosData = data.rooms.map(roomData => {
          const { room, currentSession, prizeConfig } = roomData;
          const isStarter = room === 'starter';

          if (isStarter) {
            return {
              room: room,
              linea: prizeConfig.prize_linea || '1 Ticket para Bronce',
              bingo: prizeConfig.prize_bingo || '1 Ticket para Oro',
              jackpot: 0,
              sessionId: currentSession?.id || null,
              status: currentSession?.status || 'no_session',
              cardsSold: currentSession?.cards_sold || 0,
              cardPrice: 0,
              startTime: currentSession?.start_time || null,
              isSpecial: true
            };
          }

          return {
            room: room,
            linea: parseFloat(currentSession?.jackpot_linea) || 0,
            bingo: parseFloat(currentSession?.jackpot_bingo) || 0,
            jackpot: parseFloat(currentSession?.jackpot_pre40) || 0,
            sessionId: currentSession?.id || null,
            status: currentSession?.status || 'no_session',
            cardsSold: currentSession?.cards_sold || 0,
            cardPrice: parseFloat(currentSession?.card_price) || 0,
            startTime: currentSession?.start_time || null,
            isSpecial: false
          };
        });
        setPozos(pozosData);

        // Show Toast Notification
        setToast({
          message: '¡Pozos actualizados en tiempo real!',
          type: 'success',
          visible: true
        });

        // Auto-dismiss
        setTimeout(() => {
          setToast(prev => prev ? { ...prev, visible: false } : null);
        }, 3000);

      } else {
        // Fallback: estructura antigua con array de pots
        const pozosData = data.pots.map(pot => {
          if (pot.is_special) {
            return {
              room: pot.room,
              linea: pot.current_pot_linea,
              bingo: pot.current_pot_bingo,
              jackpot: 0,
              sessionId: pot.session_id,
              status: pot.status || 'no_session',
              cardsSold: pot.cards_sold || 0,
              cardPrice: 0,
              isSpecial: true
            };
          }

          return {
            room: pot.room,
            linea: parseFloat(pot.jackpot_linea) || parseFloat(pot.current_pot_linea) || 0,
            bingo: parseFloat(pot.jackpot_bingo) || parseFloat(pot.current_pot_bingo) || 0,
            jackpot: parseFloat(pot.jackpot_pre40) || parseFloat(pot.jackpot) || 0,
            sessionId: pot.session_id,
            status: pot.status || 'no_session',
            cardsSold: pot.cards_sold || 0,
            cardPrice: parseFloat(pot.card_price) || 0,
            isSpecial: false
          };
        });
        setPozos(pozosData);

        // Show Toast Notification (Fallback)
        setToast({
          message: '¡Pozos actualizados en tiempo real!',
          type: 'success',
          visible: true
        });

        // Auto-dismiss
        setTimeout(() => {
          setToast(prev => prev ? { ...prev, visible: false } : null);
        }, 3000);
      }
    });

    setSocket(socketInstance);

    return () => {
      clearInterval(refreshInterval);
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, []);

  const getToken = () => localStorage.getItem('adminToken');

  const fetchPozos = async () => {
    try {
      const response = await axios.get('/api/admin/sessions/active', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });

      // Extraer datos de pozos desde el endpoint de sesiones activas
      const pozosData = response.data.rooms.map(roomData => {
        const { room, currentSession, prizeConfig } = roomData;
        const isStarter = room === 'starter';

        if (isStarter) {
          // Sala Starter: Premios en tickets
          return {
            room: room,
            linea: prizeConfig.prize_linea || '1 Ticket para Bronce',
            bingo: prizeConfig.prize_bingo || '1 Ticket para Oro',
            jackpot: 0,
            sessionId: currentSession?.id || null,
            status: currentSession?.status || 'no_session',
            cardsSold: currentSession?.total_cards_validated || 0,
            cardPrice: 0,
            startTime: currentSession?.start_time || null,
            isSpecial: true
          };
        }

        // Salas con dinero: Bronce, Plata, Oro
        return {
          room: room,
          linea: parseFloat(currentSession?.jackpot_linea) || 0,
          bingo: parseFloat(currentSession?.jackpot_bingo) || 0,
          jackpot: parseFloat(currentSession?.jackpot_pre40) || 0,
          sessionId: currentSession?.id || null,
          status: currentSession?.status || 'no_session',
          cardsSold: currentSession?.total_cards_validated || 0,
          cardPrice: parseFloat(currentSession?.card_price) || 0,
          startTime: currentSession?.start_time || null,
          isSpecial: false
        };
      });

      setPozos(pozosData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching pozos:', error);
      setLoading(false);
    }
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getRoomIcon = (room) => {
    const icons = {
      starter: '🎁',
      bronce: '🥉',
      plata: '🥈',
      oro: '🥇'
    };
    return icons[room] || '🎲';
  };

  const getRoomColor = (room) => {
    const colors = {
      starter: 'from-purple-900/40 to-purple-800/20 border-purple-500/30',
      bronce: 'from-orange-900/40 to-orange-800/20 border-orange-500/30',
      plata: 'from-gray-600/40 to-gray-700/20 border-gray-400/30',
      oro: 'from-yellow-600/40 to-yellow-700/20 border-yellow-400/30'
    };
    return colors[room] || 'from-gray-800 to-gray-900 border-gray-700';
  };

  const getRoomName = (room) => {
    const names = {
      starter: 'Starter',
      bronce: 'Bronce',
      plata: 'Plata',
      oro: 'Oro'
    };
    return names[room] || room;
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

  const getSessionStatusText = (pozo) => {
    // Starter: Verificar si está sorteando según horario
    if (pozo.room === 'starter') {
      if (pozo.startTime && isStarterDrawing(pozo.startTime)) {
        return 'SORTEANDO AHORA';
      }
      return 'HABILITADA (GRATIS)';
    }

    // Otras salas: Estado de la sesión
    if (pozo.status === 'playing') {
      return 'SORTEANDO AHORA';
    }

    // Siempre habilitadas para comprar (incluso sin sesión creada)
    return 'HABILITADA';
  };

  const getStatusColor = (pozo) => {
    const statusText = getSessionStatusText(pozo);

    if (statusText === 'SORTEANDO AHORA') {
      return 'bg-red-500/20 text-red-400 animate-pulse';
    }

    if (statusText.includes('HABILITADA')) {
      return 'bg-green-500/20 text-green-400';
    }

    return 'bg-gray-500/20 text-gray-400';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-green-400" />
          Estado de Pozos
        </h2>
        <div className="text-center py-12">
          <div className="text-gray-400">Cargando pozos...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-green-400" />
          Estado de Pozos
        </h2>

        {/* Toast Notification */}
        {toast && toast.visible && (
          <div className="fixed top-24 right-8 bg-gray-800 border border-green-500/50 text-white px-6 py-4 rounded-xl shadow-2xl z-50 animate-slide-in flex items-center gap-4">
            <div className="bg-green-500/20 p-2 rounded-full">
              <DollarSign className="text-green-400 w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h4 className="font-bold text-green-400">Actualización</h4>
              <p className="text-sm text-gray-300">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${socketConnected
            ? 'bg-green-500/20 text-green-400'
            : 'bg-red-500/20 text-red-400'
            }`}>
            {socketConnected ? (
              <>
                <Wifi className="w-4 h-4" />
                En Vivo
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4" />
                Desconectado
              </>
            )}
          </div>
          <div className="text-sm text-gray-400">
            4 salas
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {pozos.map((pozo, index) => (
          <div
            key={index}
            className={`bg-gradient-to-br ${getRoomColor(pozo.room)} rounded-xl p-6 border transition-all hover:shadow-lg`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{getRoomIcon(pozo.room)}</span>
                <div>
                  <h3 className="text-xl font-bold text-white capitalize">
                    Sala {getRoomName(pozo.room)}
                  </h3>
                  {pozo.sessionId && (
                    <div className="text-xs text-gray-400">
                      Sesión #{pozo.sessionId}
                    </div>
                  )}
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(pozo)}`}>
                {getSessionStatusText(pozo)}
              </div>
            </div>

            {/* Pozos */}
            <div className="space-y-3">
              {/* BINGO */}
              <div className="bg-black/20 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Pozo BINGO</div>
                <div className="text-2xl font-bold text-green-400">
                  {pozo.isSpecial ? (
                    <span className="flex items-center gap-2">
                      🎫 {pozo.bingo}
                    </span>
                  ) : (
                    formatMoney(pozo.bingo)
                  )}
                </div>
              </div>

              {/* LÍNEA */}
              <div className="bg-black/20 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Pozo LÍNEA</div>
                <div className="text-2xl font-bold text-blue-400">
                  {pozo.isSpecial ? (
                    <span className="flex items-center gap-2">
                      🎫 {pozo.linea}
                    </span>
                  ) : (
                    formatMoney(pozo.linea)
                  )}
                </div>
              </div>

              {/* Pozo Acumulado Pre-40 (solo salas con dinero) */}
              {!pozo.isSpecial && (
                <div className="bg-black/20 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Pozo Acumulado Pre-40</div>
                  <div className="text-3xl font-bold text-yellow-400">
                    {formatMoney(pozo.jackpot)}
                  </div>
                </div>
              )}
            </div>

            {/* Info adicional */}
            <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-400">Cartones Jugados</div>
                <div className="text-sm font-semibold text-white">
                  {pozo.cardsSold}
                </div>
              </div>
              {!pozo.isSpecial && (
                <div>
                  <div className="text-xs text-gray-400">Precio Cartón</div>
                  <div className="text-sm font-semibold text-white">
                    {formatMoney(pozo.cardPrice)}
                  </div>
                </div>
              )}
            </div>

            {/* Botones de Acción */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setSelectedRoom(pozo.room);
                  setShowScheduleModal(true);
                }}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
              >
                <Calendar className="w-4 h-4" />
                Sorteos
              </button>

              {!pozo.isSpecial && (
                <button
                  onClick={() => {
                    setHistoryRoom(pozo.room);
                    setShowHistoryModal(true);
                  }}
                  className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
                >
                  <TrendingUp className="w-4 h-4" />
                  Historial
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {pozos.length === 0 && (
        <div className="bg-gray-800/50 rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">💰</div>
          <p className="text-gray-400 text-lg">No hay datos de pozos disponibles</p>
        </div>
      )}

      {/* Modal Próximos Sorteos */}
      {showScheduleModal && selectedRoom && (
        <ProximosSorteosModal
          room={selectedRoom}
          onClose={() => {
            setShowScheduleModal(false);
            setSelectedRoom(null);
          }}
        />
      )}

      {/* Modal Historial */}
      {showHistoryModal && historyRoom && (
        <PotHistoryModal
          room={historyRoom}
          onClose={() => {
            setShowHistoryModal(false);
            setHistoryRoom(null);
          }}
        />
      )}
    </div>
  );
}
