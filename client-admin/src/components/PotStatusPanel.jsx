import { useState, useEffect } from 'react';
import axios from 'axios';
import { DollarSign, Wifi, WifiOff, Calendar } from 'lucide-react';
import { io } from 'socket.io-client';
import ProximosSorteosModal from './ProximosSorteosModal';

export default function PotStatusPanel() {
  const [pozos, setPozos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);

  useEffect(() => {
    // Fetch inicial
    fetchPozos();

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
      const pozosData = data.pots.map(pot => {
        // Manejo especial para sala Starter
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
          linea: parseFloat(pot.current_pot_linea) || 0,
          bingo: parseFloat(pot.current_pot_bingo) || 0,
          jackpot: parseFloat(pot.jackpot) || 0,
          sessionId: pot.session_id,
          status: pot.status || 'no_session',
          cardsSold: pot.cards_sold || 0,
          cardPrice: parseFloat(pot.card_price) || 0,
          isSpecial: false
        };
      });
      setPozos(pozosData);
    });

    setSocket(socketInstance);

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, []);

  const getToken = () => localStorage.getItem('adminToken');

  const fetchPozos = async () => {
    try {
      const response = await axios.get('/api/admin/room-settings/current-pots', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      
      const pozosData = response.data.pots.map(pot => {
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
          linea: parseFloat(pot.current_pot_linea) || 0,
          bingo: parseFloat(pot.current_pot_bingo) || 0,
          jackpot: parseFloat(pot.jackpot) || 0,
          sessionId: pot.session_id,
          status: pot.status || 'no_session',
          cardsSold: pot.cards_sold || 0,
          cardPrice: parseFloat(pot.card_price) || 0,
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
      currency: 'COP',
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
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            socketConnected 
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
              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                pozo.status === 'playing' 
                  ? 'bg-green-500/20 text-green-400' 
                  : pozo.status === 'active'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-gray-500/20 text-gray-400'
              }`}>
                {pozo.status === 'playing' ? 'EN JUEGO' : pozo.status === 'active' ? 'ACTIVA' : 'SIN SESIÓN'}
              </div>
            </div>

            {/* Pozos */}
            <div className="space-y-3">
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
                <div className="text-xs text-gray-400">Cartones Vendidos</div>
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

            {/* Botón Ver Próximos Sorteos */}
            <div className="mt-4">
              <button
                onClick={() => {
                  setSelectedRoom(pozo.room);
                  setShowScheduleModal(true);
                }}
                className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Calendar className="w-4 h-4" />
                Ver Próximos Sorteos
              </button>
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
    </div>
  );
}
