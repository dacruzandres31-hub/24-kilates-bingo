import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, Calendar, Clock, DollarSign, Save, X, Play, StopCircle } from 'lucide-react';

export default function SessionControlPanel() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [activeGames, setActiveGames] = useState([]);
  const [userData, setUserData] = useState(null);
  const [formData, setFormData] = useState({
    room: 'bronce',
    play_date: '',
    start_time: '',
    card_price: '',
    initial_pot_linea: 0,
    initial_pot_bingo: 0,
    initial_pot_jackpot: 0,
    is_preventa: false
  });

  useEffect(() => {
    fetchSessions();
    fetchActiveGames();
    fetchUserData();
    // Poll active games every 10 seconds
    const interval = setInterval(fetchActiveGames, 10000);
    return () => clearInterval(interval);
  }, []);

  const getToken = () => localStorage.getItem('adminToken');

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/sessions/active', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });

      const allSessions = [];
      if (response.data.rooms) {
        response.data.rooms.forEach(roomData => {
          if (roomData.currentSession) {
            allSessions.push(roomData.currentSession);
          }
          if (roomData.upcomingSessions) {
            // Filter out duplicates (if current session is also in upcoming)
            // Use date matching for virtual sessions vs real ones
            const upcomingNotCurrent = roomData.upcomingSessions.filter(u => {
              if (!roomData.currentSession) return true;

              // If it's a real session vs virtual, they might have the same start_time
              const virtualTime = u.start_time?.slice(0, 5);
              const currentTime = roomData.currentSession.start_time?.includes('T') || roomData.currentSession.start_time?.includes(' ')
                ? new Date(roomData.currentSession.start_time).toLocaleTimeString('es-ES', { hour12: false }).slice(0, 5)
                : roomData.currentSession.start_time?.slice(0, 5);

              return virtualTime !== currentTime;
            });
            allSessions.push(...upcomingNotCurrent);
          }
        });
      }

      setSessions(allSessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
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
      // Correctly extract the user object from the responseHelper format
      const user = response.data.data || response.data;
      setUserData(user);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handleStartGame = async (sessionId) => {
    if (!confirm('¿Iniciar el sorteo automático para esta sesión?')) {
      return;
    }

    try {
      await axios.post('/api/game-admin/start', {
        gameSessionId: sessionId,
        drawInterval: 5000,
        pauseOnWinner: 2000
      }, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });

      alert('Sorteo iniciado exitosamente');
      fetchActiveGames();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al iniciar sorteo');
    }
  };

  const handleStopGame = async (sessionId, force = false) => {
    const message = force
      ? '¿FORZAR la finalización de esta sesión? Esto la marcará como completada en la base de datos.'
      : '¿Detener el sorteo automático?';

    if (!confirm(message)) {
      return;
    }

    try {
      await axios.post('/api/game-admin/stop', {
        gameSessionId: sessionId,
        force
      }, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });

      alert(force ? 'Sesión finalizada forzosamente' : 'Sorteo detenido');
      fetchActiveGames();
      fetchSessions();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al detener sorteo');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/superadmin/sessions/create', formData, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });

      alert('Sesión creada exitosamente');
      setShowCreateModal(false);
      resetForm();
      fetchSessions();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al crear sesión');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/superadmin/sessions/${editingSession.id}`, {
        play_date: formData.play_date,
        start_time: formData.start_time,
        card_price: formData.card_price,
        is_preventa: formData.is_preventa
      }, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });

      alert('Sesión actualizada exitosamente');
      setEditingSession(null);
      resetForm();
      fetchSessions();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al actualizar sesión');
    }
  };

  const handleDelete = async (sessionId) => {
    if (!confirm('¿Estás seguro de eliminar esta sesión? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await axios.delete(`/api/superadmin/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });

      alert('Sesión eliminada exitosamente');
      fetchSessions();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al eliminar sesión');
    }
  };

  const resetForm = () => {
    setFormData({
      room: 'bronce',
      play_date: '',
      start_time: '',
      card_price: '',
      initial_pot_linea: 0,
      initial_pot_bingo: 0,
      initial_pot_jackpot: 0,
      is_preventa: false
    });
  };

  const startEdit = (session) => {
    setEditingSession(session);
    setFormData({
      room: session.room,
      play_date: session.play_date,
      start_time: session.start_time,
      card_price: session.card_price,
      is_preventa: session.is_preventa === 1
    });
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getRoomIcon = (room) => {
    const icons = { bronce: '🥉', plata: '🥈', oro: '🥇', starter: '🎁', free_starter: '🎁' };
    return icons[room] || '🎲';
  };

  const SessionForm = ({ onSubmit, isEdit = false }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Sala</label>
          <select
            value={formData.room}
            onChange={(e) => setFormData({ ...formData, room: e.target.value })}
            disabled={isEdit}
            className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none disabled:opacity-50"
          >
            <option value="bronce">🥉 Bronce</option>
            <option value="plata">🥈 Plata</option>
            <option value="oro">🥇 Oro</option>
            <option value="starter">🎁 Free Starter</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Fecha</label>
          <input
            type="date"
            value={formData.play_date}
            onChange={(e) => setFormData({ ...formData, play_date: e.target.value })}
            required
            className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Hora de Inicio</label>
          <input
            type="time"
            value={formData.start_time}
            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            required
            className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Precio Cartón</label>
          <input
            type="number"
            value={formData.card_price}
            onChange={(e) => setFormData({ ...formData, card_price: e.target.value })}
            required
            min="0"
            step="1000"
            placeholder="10000"
            className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
          />
        </div>

        {!isEdit && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Pozo Inicial LÍNEA</label>
              <input
                type="number"
                value={formData.initial_pot_linea}
                onChange={(e) => setFormData({ ...formData, initial_pot_linea: e.target.value })}
                min="0"
                step="1000"
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Pozo Inicial BINGO</label>
              <input
                type="number"
                value={formData.initial_pot_bingo}
                onChange={(e) => setFormData({ ...formData, initial_pot_bingo: e.target.value })}
                min="0"
                step="1000"
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Jackpot Inicial</label>
              <input
                type="number"
                value={formData.initial_pot_jackpot}
                onChange={(e) => setFormData({ ...formData, initial_pot_jackpot: e.target.value })}
                min="0"
                step="1000"
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
              />
            </div>
          </>
        )}

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_preventa"
            checked={formData.is_preventa}
            onChange={(e) => setFormData({ ...formData, is_preventa: e.target.checked })}
            className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
          />
          <label htmlFor="is_preventa" className="text-sm font-medium text-gray-300">
            Habilitar Pre-venta
          </label>
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-4">
        <button
          type="button"
          onClick={() => {
            setShowCreateModal(false);
            setEditingSession(null);
            resetForm();
          }}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {isEdit ? 'Actualizar' : 'Crear Sesión'}
        </button>
      </div>
    </form>
  );

  if (userData && userData.username?.toLowerCase() !== 'andy') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-gray-900/50 rounded-2xl border border-red-500/20">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-white mb-2">Acceso Restringido</h2>
        <p className="text-gray-400 max-w-md">
          Este panel de control es exclusivo para el administrador del sistema.
          Si crees que esto es un error, contacta al desarrollador.
        </p>
      </div>
    );
  }

  // Filter to only show the main 4 rooms and only their current/closest session
  const displaySessions = ['starter', 'bronce', 'plata', 'oro'].map(roomName => {
    return sessions.find(s => s.room === roomName);
  }).filter(Boolean);

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Calendar className="w-8 h-8 text-purple-400" />
          Control Maestro de Sesiones
        </h2>
        <div className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 rounded-lg border border-purple-500/30">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-purple-300 font-semibold uppercase tracking-wider">Modo Directo - Andy</span>
        </div>
      </div>

      {/* Lista de Sesiones - Dividida en 4 (Cuadrantes) */}
      {loading ? (
        <div className="flex items-center justify-center flex-1 py-12 text-gray-400">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      ) : displaySessions.length === 0 ? (
        <div className="bg-gray-800/50 rounded-xl p-12 text-center text-gray-400 border border-dashed border-gray-700">
          No se encontraron sesiones activas en los 4 cuadrantes principales.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
          {displaySessions.map(session => (
            <div
              key={session.id || session.room}
              className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700 shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <span className="text-5xl">{getRoomIcon(session.room)}</span>
                    <div>
                      <h4 className="text-2xl font-black text-white capitalize tracking-tight">Sala {session.room}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="bg-white/10 text-gray-400 px-2 py-0.5 rounded text-xs font-mono">
                          ID: {session.id || 'VIRTUAL'}
                        </span>
                        {session.status === 'playing' && (
                          <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs font-bold animate-pulse uppercase">
                            En Juego
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">Precio</p>
                    <p className="text-xl font-bold text-green-400">{formatMoney(session.card_price)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-tighter">Día</span>
                    </div>
                    <p className="text-lg font-semibold text-white">
                      {new Date(session.play_date || new Date()).toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                  <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-tighter">Hora</span>
                    </div>
                    <p className="text-lg font-semibold text-white">
                      {session.start_time?.includes('T') || session.start_time?.includes(' ')
                        ? new Date(session.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false })
                        : session.start_time?.slice(0, 5)}
                    </p>
                  </div>
                </div>

                <div className="bg-purple-900/10 rounded-xl p-4 border border-purple-500/20 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-purple-300 uppercase font-bold tracking-widest mb-1">Cartones Jugados</p>
                      <p className="text-3xl font-black text-white">{session.total_cards_validated || 0}</p>
                    </div>
                    <div className="opacity-20">
                      <Plus className="w-10 h-10 text-purple-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Game Control Buttons */}
              <div className="pt-4 border-t border-white/5">
                {(() => {
                  const isGameInMem = activeGames.some(g => g.sessionId === session.id);
                  const activeGame = activeGames.find(g => g.sessionId === session.id);
                  const isStuck = session.status === 'playing' && !isGameInMem;

                  if (isGameInMem) {
                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-center gap-3 bg-green-500/10 py-2 rounded-lg border border-green-500/20">
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-green-400 text-sm font-bold uppercase tracking-widest">
                            SORTEO EN VIVO: {activeGame?.ballsDrawn || 0} BOLAS
                          </span>
                        </div>
                        <button
                          onClick={() => handleStopGame(session.id)}
                          className="w-full h-14 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all flex items-center justify-center gap-3 text-lg font-black shadow-lg shadow-red-900/20"
                        >
                          <StopCircle className="w-6 h-6" />
                          DETENER SORTEO
                        </button>
                      </div>
                    );
                  }

                  if (isStuck) {
                    return (
                      <button
                        onClick={() => handleStopGame(session.id, true)}
                        className="w-full h-14 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-all flex items-center justify-center gap-3 text-lg font-black shadow-lg shadow-orange-900/20"
                      >
                        <X className="w-6 h-6" />
                        FORZAR CIERRE
                      </button>
                    );
                  }

                  if (session.id && (session.status === 'pending' || session.status === 'active')) {
                    return (
                      <button
                        onClick={() => handleStartGame(session.id)}
                        className="w-full h-14 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all flex items-center justify-center gap-3 text-lg font-black shadow-lg shadow-green-900/20 active:scale-[0.98]"
                      >
                        <Play className="w-6 h-6" />
                        INICIAR SORTEO
                      </button>
                    );
                  }

                  return (
                    <div className="h-14 flex items-center justify-center text-gray-600 font-bold uppercase tracking-widest bg-white/5 rounded-xl border border-white/5 italic">
                      No hay sesión activa
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
