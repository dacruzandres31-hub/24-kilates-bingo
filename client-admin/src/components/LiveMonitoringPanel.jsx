import { useState, useEffect } from 'react';
import axios from 'axios';
import { Play, Pause, Users, Trophy, Clock, Circle, CheckCircle } from 'lucide-react';

export default function LiveMonitoringPanel({ userRole }) {
  const [activeSessions, setActiveSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [liveData, setLiveData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    fetchActiveSessions();
    const interval = setInterval(fetchActiveSessions, 10000); // Actualizar cada 10s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedSession) {
      fetchLiveData();
      const interval = setInterval(fetchLiveData, 3000); // Actualizar cada 3s
      return () => clearInterval(interval);
    }
  }, [selectedSession]);

  const getToken = () => localStorage.getItem('adminToken');
  const isSuperAdmin = userRole === 'superadmin';

  const fetchActiveSessions = async () => {
    try {
      const response = await axios.get('/api/admin/sessions/active', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const playing = response.data.active.filter(s => s.status === 'playing' || s.status === 'active');
      setActiveSessions(playing);

      // Si no hay sesión seleccionada, seleccionar la primera
      if (!selectedSession && playing.length > 0) {
        setSelectedSession(playing[0].id);
      }
    } catch (error) {
      console.error('Error fetching active sessions:', error);
    }
  };

  const fetchLiveData = async () => {
    if (!selectedSession) return;

    try {
      const response = await axios.get(`/api/admin/sessions/${selectedSession}/live`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setLiveData(response.data);
      setIsPaused(response.data.session.status === 'paused');
    } catch (error) {
      console.error('Error fetching live data:', error);
    }
  };

  const handlePause = async () => {
    if (!isSuperAdmin) {
      alert('Solo SuperAdmin puede pausar el sorteo');
      return;
    }

    try {
      await axios.post(`/api/superadmin/sessions/${selectedSession}/pause`, {}, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setIsPaused(true);
      fetchLiveData();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al pausar sesión');
    }
  };

  const handleResume = async () => {
    if (!isSuperAdmin) {
      alert('Solo SuperAdmin puede reanudar el sorteo');
      return;
    }

    try {
      await axios.post(`/api/superadmin/sessions/${selectedSession}/resume`, {}, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setIsPaused(false);
      fetchLiveData();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al reanudar sesión');
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
    const icons = { bronce: '🥉', plata: '🥈', oro: '🥇', free_starter: '🎁' };
    return icons[room] || '🎲';
  };

  const BallNumber = ({ number, recent = false }) => (
    <div className={`
      w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg
      ${recent ? 'bg-gradient-to-br from-yellow-500 to-orange-500 text-white animate-pulse' : 'bg-gray-700 text-gray-300'}
    `}>
      {number}
    </div>
  );

  if (activeSessions.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Play className="w-8 h-8 text-blue-400" />
          Monitoreo en Vivo
        </h2>
        <div className="bg-gray-800/50 rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">🎲</div>
          <p className="text-gray-400 text-lg">No hay sesiones en juego en este momento</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Play className="w-8 h-8 text-blue-400" />
          Monitoreo en Vivo
        </h2>
        
        {/* Selector de Sesión */}
        <div className="flex items-center gap-3">
          <select
            value={selectedSession || ''}
            onChange={(e) => setSelectedSession(parseInt(e.target.value))}
            className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            {activeSessions.map(session => (
              <option key={session.id} value={session.id}>
                {getRoomIcon(session.room)} {session.room.toUpperCase()} - ID: {session.id}
              </option>
            ))}
          </select>

          {/* Controles SuperAdmin */}
          {isSuperAdmin && liveData && (
            <div className="flex gap-2">
              <button
                onClick={handlePause}
                disabled={isPaused}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Pause className="w-4 h-4" />
                Pausar
              </button>
              <button
                onClick={handleResume}
                disabled={!isPaused}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Reanudar
              </button>
            </div>
          )}
        </div>
      </div>

      {liveData && (
        <>
          {/* Estado de la Sesión */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 rounded-xl p-5 border border-blue-500/30">
              <div className="text-sm text-blue-300 font-medium">Bolas Cantadas</div>
              <div className="text-3xl font-bold text-white mt-2">{liveData.stats.total_balls}/75</div>
              <div className="text-xs text-blue-400 mt-1">
                {Math.round((liveData.stats.total_balls / 75) * 100)}% completado
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 rounded-xl p-5 border border-green-500/30">
              <div className="text-sm text-green-300 font-medium">Jugadores Activos</div>
              <div className="text-3xl font-bold text-white mt-2 flex items-center gap-2">
                <Users className="w-8 h-8" />
                {liveData.stats.unique_players}
              </div>
              <div className="text-xs text-green-400 mt-1">
                {liveData.stats.total_players} cartones en juego
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 rounded-xl p-5 border border-purple-500/30">
              <div className="text-sm text-purple-300 font-medium">Ganadores</div>
              <div className="text-3xl font-bold text-white mt-2 flex items-center gap-2">
                <Trophy className="w-8 h-8" />
                {liveData.stats.total_winners}
              </div>
              <div className="text-xs text-purple-400 mt-1">premios entregados</div>
            </div>

            <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 rounded-xl p-5 border border-yellow-500/30">
              <div className="text-sm text-yellow-300 font-medium">Estado</div>
              <div className="text-2xl font-bold text-white mt-2 flex items-center gap-2">
                {isPaused ? (
                  <>
                    <Pause className="w-6 h-6 text-yellow-400" />
                    <span className="text-yellow-400">PAUSADO</span>
                  </>
                ) : (
                  <>
                    <Circle className="w-6 h-6 text-green-400 animate-pulse" />
                    <span className="text-green-400">EN VIVO</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Pozos Actuales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 rounded-xl p-5 border border-blue-500/30">
              <div className="text-sm text-blue-300 font-medium">Pozo LÍNEA</div>
              <div className="text-2xl font-bold text-white mt-2">
                {formatMoney(liveData.session.current_pot_linea || 0)}
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 rounded-xl p-5 border border-green-500/30">
              <div className="text-sm text-green-300 font-medium">Pozo BINGO</div>
              <div className="text-2xl font-bold text-white mt-2">
                {formatMoney(liveData.session.current_pot_bingo || 0)}
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 rounded-xl p-5 border border-yellow-500/30">
              <div className="text-sm text-yellow-300 font-medium">JACKPOT</div>
              <div className="text-2xl font-bold text-white mt-2">
                {formatMoney(liveData.session.current_pot_jackpot || 0)}
              </div>
            </div>
          </div>

          {/* Bolas Cantadas */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4">Bolas Cantadas</h3>
            <div className="flex flex-wrap gap-2">
              {liveData.balls.map((ball, index) => (
                <BallNumber 
                  key={index} 
                  number={ball} 
                  recent={index >= liveData.balls.length - 3}
                />
              ))}
            </div>
            
            {liveData.balls.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                El sorteo aún no ha comenzado
              </div>
            )}
          </div>

          {/* Ganadores Recientes */}
          {liveData.winners.length > 0 && (
            <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 rounded-xl p-6 border border-purple-500/30">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-400" />
                Ganadores
              </h3>
              <div className="space-y-2">
                {liveData.winners.slice(0, 10).map(winner => (
                  <div 
                    key={winner.id}
                    className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">
                        {winner.prize_type === 'linea' ? '📏' : '🎯'}
                      </div>
                      <div>
                        <div className="text-white font-semibold">{winner.username}</div>
                        <div className="text-xs text-gray-400">
                          {winner.prize_type.toUpperCase()} - Bola #{winner.ball_number}
                        </div>
                      </div>
                    </div>
                    <div className="text-green-400 font-bold">
                      {formatMoney(winner.prize_amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
