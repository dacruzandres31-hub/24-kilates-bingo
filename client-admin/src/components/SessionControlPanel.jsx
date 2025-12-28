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
      setUserData(response.data);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Calendar className="w-8 h-8 text-purple-400" />
          Control de Sesiones
        </h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nueva Sesión
        </button>
      </div>

      {/* Modal Crear Sesión */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Crear Nueva Sesión</h3>
            <SessionForm onSubmit={handleCreate} />
          </div>
        </div>
      )}

      {/* Modal Editar Sesión */}
      {editingSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Editar Sesión #{editingSession.id}</h3>
            <SessionForm onSubmit={handleUpdate} isEdit={true} />
          </div>
        </div>
      )}

      {/* Lista de Sesiones */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : sessions.length === 0 ? (
        <div className="bg-gray-800/50 rounded-xl p-6 text-center text-gray-400">
          No hay sesiones programadas. Crea una nueva sesión para comenzar.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sessions.map(session => (
            <div
              key={session.id}
              className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 border border-gray-700"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-3xl">{getRoomIcon(session.room)}</span>
                  <div>
                    <h4 className="text-white font-bold capitalize">{session.room}</h4>
                    <p className="text-xs text-gray-400">ID: {session.id}</p>
                  </div>
                </div>

                {!['active', 'playing', 'completed'].includes(session.status) && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(session)}
                      className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={() => handleDelete(session.id)}
                      className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-300">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(session.play_date).toLocaleDateString('es-ES')}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Clock className="w-4 h-4" />
                  <span>
                    {session.start_time?.includes('T') || session.start_time?.includes(' ')
                      ? new Date(session.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false })
                      : session.start_time?.slice(0, 5)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <DollarSign className="w-4 h-4" />
                  <span>{formatMoney(session.card_price)}</span>
                </div>

                {session.is_preventa === 1 && (
                  <span className="inline-block bg-purple-500 text-white px-2 py-1 rounded text-xs">
                    Pre-venta Activa
                  </span>
                )}

                <div className="pt-2 text-xs text-gray-400">
                  Cartones vendidos: {session.total_cards_sold || 0}
                </div>

                {/* Game Control Buttons - For SuperAdmin or Andy */}
                {(() => {
                  const isGameInMem = activeGames.some(g => g.sessionId === session.id);
                  const activeGame = activeGames.find(g => g.sessionId === session.id);
                  const isStuck = session.status === 'playing' && !isGameInMem;

                  // Debug helper
                  if (!isGameInMem && !isStuck && !['pending', 'active'].includes(session.status)) {
                    // console.log(`Session ${session.id} (${session.room}) status: ${session.status}`);
                  }

                  if (isGameInMem) {
                    return (
                      <div className="pt-3 space-y-2">
                        <div className="flex items-center gap-2 text-green-400 text-xs font-semibold">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          SORTEO EN VIVO - {activeGame?.ballsDrawn || 0} bolas
                        </div>
                        <button
                          onClick={() => handleStopGame(session.id)}
                          className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
                        >
                          <StopCircle className="w-4 h-4" />
                          Detener Sorteo
                        </button>
                      </div>
                    );
                  }

                  if (isStuck) {
                    return (
                      <div className="pt-3 space-y-2">
                        <div className="flex items-center gap-2 text-yellow-400 text-xs font-semibold">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                          SESIÓN TRABADA (STUCK)
                        </div>
                        <button
                          onClick={() => handleStopGame(session.id, true)}
                          className="w-full px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
                        >
                          <StopCircle className="w-4 h-4" />
                          Forzar Finalización
                        </button>
                      </div>
                    );
                  }

                  if (session.status === 'pending' || session.status === 'active') {
                    return (
                      <div className="pt-3">
                        <button
                          onClick={() => handleStartGame(session.id)}
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
