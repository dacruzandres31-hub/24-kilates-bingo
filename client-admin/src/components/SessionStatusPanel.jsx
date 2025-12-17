import { useState, useEffect } from 'react';
import axios from 'axios';
import { Clock, Users, TrendingUp, Calendar, DollarSign, Play, Pause, CheckCircle } from 'lucide-react';

export default function SessionStatusPanel() {
  const [activeSessions, setActiveSessions] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 30000); // Actualizar cada 30s
    return () => clearInterval(interval);
  }, []);

  const getToken = () => localStorage.getItem('adminToken');

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const [activeRes, recentRes] = await Promise.all([
        axios.get('/api/admin/sessions/active', {
          headers: { Authorization: `Bearer ${getToken()}` }
        }),
        axios.get('/api/admin/sessions/recent?limit=5', {
          headers: { Authorization: `Bearer ${getToken()}` }
        })
      ]);

      setActiveSessions(activeRes.data.active || []);
      setUpcomingSessions(activeRes.data.upcoming || []);
      setRecentSessions(recentRes.data.sessions || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError('Error al cargar sesiones');
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (time) => {
    if (!time) return '-';
    return time.slice(0, 5); // HH:MM
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
      plata: 'from-gray-400/40 to-gray-600/20 border-gray-400/30',
      oro: 'from-yellow-600/40 to-yellow-800/20 border-yellow-500/30',
      free_starter: 'from-green-900/40 to-green-800/20 border-green-500/30'
    };
    return colors[room] || 'from-blue-900/40 to-blue-800/20 border-blue-500/30';
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { text: 'Activa', color: 'bg-green-500', icon: <Play className="w-3 h-3" /> },
      playing: { text: 'En Juego', color: 'bg-blue-500', icon: <Play className="w-3 h-3" /> },
      pending: { text: 'Programada', color: 'bg-yellow-500', icon: <Clock className="w-3 h-3" /> },
      preventa: { text: 'Pre-venta', color: 'bg-purple-500', icon: <TrendingUp className="w-3 h-3" /> },
      completed: { text: 'Completada', color: 'bg-gray-500', icon: <CheckCircle className="w-3 h-3" /> }
    };
    const badge = badges[status] || badges.pending;

    return (
      <span className={`${badge.color} text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1`}>
        {badge.icon}
        {badge.text}
      </span>
    );
  };

  const SessionCard = ({ session, type }) => (
    <div className={`bg-gradient-to-br ${getRoomColor(session.room)} rounded-xl p-4 border`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-3xl">{getRoomIcon(session.room)}</span>
          <div>
            <h4 className="text-white font-bold capitalize">{session.room}</h4>
            <p className="text-xs text-gray-400">ID: {session.id}</p>
          </div>
        </div>
        {getStatusBadge(session.status)}
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-1 text-gray-300">
          <Calendar className="w-4 h-4" />
          <span>{formatDate(session.play_date)}</span>
        </div>
        <div className="flex items-center gap-1 text-gray-300">
          <Clock className="w-4 h-4" />
          <span>{formatTime(session.start_time)}</span>
        </div>
        <div className="flex items-center gap-1 text-gray-300">
          <DollarSign className="w-4 h-4" />
          <span>{formatMoney(session.card_price)}</span>
        </div>
        <div className="flex items-center gap-1 text-gray-300">
          <Users className="w-4 h-4" />
          <span>{session.total_cards_sold || 0} vendidos</span>
        </div>
      </div>

      {type === 'active' && (
        <div className="mt-3 pt-3 border-t border-gray-600">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <p className="text-gray-400">LÍNEA</p>
              <p className="text-blue-400 font-bold">{formatMoney(session.current_pot_linea || 0)}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400">BINGO</p>
              <p className="text-green-400 font-bold">{formatMoney(session.current_pot_bingo || 0)}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400">JACKPOT</p>
              <p className="text-yellow-400 font-bold">{formatMoney(session.current_pot_jackpot || 0)}</p>
            </div>
          </div>
        </div>
      )}

      {type === 'completed' && session.end_time && (
        <div className="mt-2 text-xs text-gray-400">
          Finalizada: {formatTime(session.end_time)}
        </div>
      )}
    </div>
  );

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Play className="w-8 h-8 text-green-400" />
          Estado de Sesiones
        </h2>
        <button
          onClick={fetchSessions}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          Actualizar
        </button>
      </div>

      {/* Sesiones Activas */}
      <div>
        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <Play className="w-5 h-5 text-green-400" />
          Sesiones Activas ({activeSessions.length})
        </h3>
        
        {activeSessions.length === 0 ? (
          <div className="bg-gray-800/50 rounded-xl p-6 text-center text-gray-400">
            No hay sesiones activas en este momento
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeSessions.map(session => (
              <SessionCard key={session.id} session={session} type="active" />
            ))}
          </div>
        )}
      </div>

      {/* Próximas Sesiones */}
      <div>
        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <Clock className="w-5 h-5 text-yellow-400" />
          Próximas Sesiones ({upcomingSessions.length})
        </h3>
        
        {upcomingSessions.length === 0 ? (
          <div className="bg-gray-800/50 rounded-xl p-6 text-center text-gray-400">
            No hay sesiones programadas
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingSessions.map(session => (
              <SessionCard key={session.id} session={session} type="upcoming" />
            ))}
          </div>
        )}
      </div>

      {/* Sesiones Recientes Completadas */}
      <div>
        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-gray-400" />
          Últimas Completadas ({recentSessions.length})
        </h3>
        
        {recentSessions.length === 0 ? (
          <div className="bg-gray-800/50 rounded-xl p-6 text-center text-gray-400">
            No hay sesiones completadas recientes
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentSessions.map(session => (
              <SessionCard key={session.id} session={session} type="completed" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
