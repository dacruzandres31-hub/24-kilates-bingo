import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Clock, Power, PowerOff, Trash2, Plus, RefreshCw } from 'lucide-react';

export default function ScheduleGridPanel() {
  const [schedules, setSchedules] = useState({});
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    room: 'bronce',
    dayOfWeek: 1,
    hour: '20:00'
  });

  useEffect(() => {
    fetchSchedules();
    fetchSummary();
  }, []);

  const getToken = () => localStorage.getItem('adminToken');

  const fetchSchedules = async () => {
    try {
      const response = await axios.get('/api/admin/schedules', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setSchedules(response.data.schedules);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await axios.get('/api/admin/schedules/summary', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const toggleSchedule = async (id) => {
    try {
      await axios.put(`/api/superadmin/schedules/${id}/toggle`, {}, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      fetchSchedules();
      fetchSummary();
    } catch (error) {
      console.error('Error toggling schedule:', error);
      alert('Error al cambiar estado del horario');
    }
  };

  const deleteSchedule = async (id) => {
    if (!confirm('¿Eliminar este horario de sorteo?')) return;

    try {
      await axios.delete(`/api/superadmin/schedules/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      fetchSchedules();
      fetchSummary();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Error al eliminar horario');
    }
  };

  const addSchedule = async (e) => {
    e.preventDefault();

    try {
      await axios.post('/api/superadmin/schedules', newSchedule, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      
      setShowAddModal(false);
      setNewSchedule({ room: 'bronce', dayOfWeek: 1, hour: '20:00' });
      fetchSchedules();
      fetchSummary();
      alert('Horario agregado correctamente');
    } catch (error) {
      console.error('Error adding schedule:', error);
      alert(error.response?.data?.message || 'Error al agregar horario');
    }
  };

  const getDayName = (dayNum) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[dayNum] || dayNum;
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

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Calendar className="w-8 h-8 text-blue-400" />
          Configuración de Horarios
        </h2>
        <div className="text-center py-12">
          <div className="text-gray-400">Cargando horarios...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Calendar className="w-8 h-8 text-blue-400" />
          Configuración de Horarios de Sorteos
        </h2>
        <div className="flex gap-3">
          <button
            onClick={() => { fetchSchedules(); fetchSummary(); }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agregar Horario
          </button>
        </div>
      </div>

      {/* Resumen por Sala */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {summary.map((s) => (
          <div key={s.room} className={`bg-gradient-to-br ${getRoomColor(s.room)} rounded-xl p-4 border`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{getRoomIcon(s.room)}</span>
              <h3 className="text-lg font-bold text-white capitalize">{s.room}</h3>
            </div>
            <div className="space-y-1 text-sm">
              <div className="text-gray-400">
                <span className="text-white font-semibold">{s.activeDraws}</span> sorteos activos
              </div>
              <div className="text-gray-400">
                <span className="text-white font-semibold">{s.totalDraws}</span> total configurados
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Horarios por Sala */}
      <div className="space-y-6">
        {Object.entries(schedules).map(([room, roomSchedules]) => (
          <div key={room} className={`bg-gradient-to-br ${getRoomColor(room)} rounded-xl p-6 border`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{getRoomIcon(room)}</span>
                <h3 className="text-xl font-bold text-white capitalize">Sala {room}</h3>
              </div>
              <div className="text-sm text-gray-400">
                {roomSchedules.length} horarios
              </div>
            </div>

            {/* Vista Semanal */}
            <div className="grid grid-cols-7 gap-2">
              {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                const daySchedules = roomSchedules.filter(s => s.dayOfWeek === day);
                return (
                  <div key={day} className="bg-black/20 rounded-lg p-3">
                    <div className="text-xs font-semibold text-gray-300 mb-2 text-center">
                      {getDayName(day).substring(0, 3)}
                    </div>
                    <div className="space-y-1">
                      {daySchedules.length === 0 ? (
                        <div className="text-xs text-gray-500 text-center">-</div>
                      ) : (
                        daySchedules.map((schedule) => (
                          <div
                            key={schedule.id}
                            className={`text-xs px-2 py-1 rounded flex items-center justify-between gap-1 ${
                              schedule.isActive 
                                ? 'bg-green-500/20 text-green-300' 
                                : 'bg-gray-500/20 text-gray-400 line-through'
                            }`}
                          >
                            <span className="font-mono">
                              {schedule.hour.substring(0, 5)}
                            </span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => toggleSchedule(schedule.id)}
                                className="hover:opacity-70"
                                title={schedule.isActive ? 'Desactivar' : 'Activar'}
                              >
                                {schedule.isActive ? (
                                  <Power className="w-3 h-3" />
                                ) : (
                                  <PowerOff className="w-3 h-3" />
                                )}
                              </button>
                              <button
                                onClick={() => deleteSchedule(schedule.id)}
                                className="hover:text-red-400"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Agregar Horario */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Agregar Nuevo Horario</h3>
            
            <form onSubmit={addSchedule} className="space-y-4">
              {/* Sala */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Sala</label>
                <select
                  value={newSchedule.room}
                  onChange={(e) => setNewSchedule({ ...newSchedule, room: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600"
                  required
                >
                  <option value="starter">Starter</option>
                  <option value="bronce">Bronce</option>
                  <option value="plata">Plata</option>
                  <option value="oro">Oro</option>
                </select>
              </div>

              {/* Día */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Día de la Semana</label>
                <select
                  value={newSchedule.dayOfWeek}
                  onChange={(e) => setNewSchedule({ ...newSchedule, dayOfWeek: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600"
                  required
                >
                  {[0, 1, 2, 3, 4, 5, 6].map(day => (
                    <option key={day} value={day}>{getDayName(day)}</option>
                  ))}
                </select>
              </div>

              {/* Hora */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Hora (24hrs)</label>
                <input
                  type="time"
                  value={newSchedule.hour}
                  onChange={(e) => setNewSchedule({ ...newSchedule, hour: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600"
                  required
                />
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  Agregar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
