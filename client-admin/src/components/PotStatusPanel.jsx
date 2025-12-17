import { useState, useEffect } from 'react';
import axios from 'axios';
import { DollarSign, TrendingUp, Calendar } from 'lucide-react';

export default function PotStatusPanel() {
  const [pozos, setPozos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPozos();
    const interval = setInterval(fetchPozos, 15000); // Actualizar cada 15s
    return () => clearInterval(interval);
  }, []);

  const getToken = () => localStorage.getItem('adminToken');

  const fetchPozos = async () => {
    try {
      const response = await axios.get('/api/admin/sessions/active', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      
      // Agrupar pozos por sala
      const pozosData = response.data.active.map(session => ({
        room: session.room,
        linea: session.current_pot_linea,
        bingo: session.current_pot_bingo,
        jackpot: session.current_pot_jackpot,
        sessionId: session.id,
        status: session.status
      }));
      
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
      bronce: '🥉',
      plata: '🥈',
      oro: '🥇',
      free_starter: '🎁'
    };
    return icons[room] || '🎲';
  };

  const getRoomColor = (room) => {
    const colors = {
      bronce: 'from-orange-900/40 to-orange-800/20 border-orange-500/30',
      plata: 'from-gray-600/40 to-gray-700/20 border-gray-400/30',
      oro: 'from-yellow-600/40 to-yellow-700/20 border-yellow-400/30',
      free_starter: 'from-purple-900/40 to-purple-800/20 border-purple-500/30'
    };
    return colors[room] || 'from-gray-800 to-gray-900 border-gray-700';
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

  if (pozos.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-green-400" />
          Estado de Pozos
        </h2>
        <div className="bg-gray-800/50 rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">💰</div>
          <p className="text-gray-400 text-lg">No hay sesiones activas con pozos</p>
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
        <div className="text-sm text-gray-400">
          {pozos.length} {pozos.length === 1 ? 'sala activa' : 'salas activas'}
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
                    Sala {pozo.room}
                  </h3>
                  <div className="text-xs text-gray-400">
                    Sesión #{pozo.sessionId}
                  </div>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                pozo.status === 'playing' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-blue-500/20 text-blue-400'
              }`}>
                {pozo.status === 'playing' ? 'EN JUEGO' : 'ACTIVA'}
              </div>
            </div>

            {/* Pozos */}
            <div className="space-y-3">
              <div className="bg-black/20 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Pozo LÍNEA</div>
                <div className="text-2xl font-bold text-blue-400">
                  {formatMoney(pozo.linea)}
                </div>
              </div>

              <div className="bg-black/20 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Pozo BINGO</div>
                <div className="text-2xl font-bold text-green-400">
                  {formatMoney(pozo.bingo)}
                </div>
              </div>

              <div className="bg-black/20 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">JACKPOT</div>
                <div className="text-3xl font-bold text-yellow-400">
                  {formatMoney(pozo.jackpot)}
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="mt-4 pt-4 border-t border-gray-700/50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Total en juego</span>
                <span className="text-xl font-bold text-white">
                  {formatMoney(pozo.linea + pozo.bingo + pozo.jackpot)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
