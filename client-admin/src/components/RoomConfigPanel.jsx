import { useState, useEffect } from 'react';
import axios from 'axios';
import { DollarSign, TrendingUp, Settings, RefreshCw, Percent } from 'lucide-react';
import StarterConfigCard from './StarterConfigCard';

export default function RoomConfigPanel() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRoom, setEditingRoom] = useState(null);
  const [editForm, setEditForm] = useState({
    card_price: '',
    percentage_linea: '',
    percentage_bingo: '',
    percentage_acumulado: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const getToken = () => localStorage.getItem('adminToken');

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/api/superadmin/room-settings', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setSettings(response.data.settings);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching settings:', error);
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
    const icons = { bronce: '🥉', plata: '🥈', oro: '🥇' };
    return icons[room] || '💰';
  };

  const getRoomColor = (room) => {
    const colors = {
      bronce: 'from-orange-900/40 to-orange-800/20 border-orange-500/30',
      plata: 'from-gray-600/40 to-gray-700/20 border-gray-400/30',
      oro: 'from-yellow-600/40 to-yellow-700/20 border-yellow-400/30'
    };
    return colors[room] || 'from-gray-800 to-gray-900 border-gray-700';
  };

  const handleEdit = (room) => {
    const setting = settings.find(s => s.room === room);
    setEditingRoom(room);
    setEditForm({
      card_price: setting.card_price,
      percentage_linea: setting.percentage_linea,
      percentage_bingo: setting.percentage_bingo,
      percentage_acumulado: setting.percentage_acumulado
    });
  };

  const handleSave = async () => {
    if (!editingRoom) return;

    try {
      // Validar que los porcentajes no superen 100%
      const totalPercentage = 
        parseFloat(editForm.percentage_linea) + 
        parseFloat(editForm.percentage_bingo) + 
        parseFloat(editForm.percentage_acumulado);

      if (totalPercentage > 100) {
        alert(`Los porcentajes suman ${totalPercentage}%, no pueden superar 100%`);
        return;
      }

      // Actualizar precio
      await axios.put(`/api/superadmin/room-settings/${editingRoom}`, {
        card_price: editForm.card_price
      }, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });

      // Actualizar porcentajes
      await axios.put(`/api/superadmin/room-settings/${editingRoom}/percentages`, {
        percentage_linea: editForm.percentage_linea,
        percentage_bingo: editForm.percentage_bingo,
        percentage_acumulado: editForm.percentage_acumulado
      }, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });

      alert(`Configuración de sala ${editingRoom} actualizada correctamente`);
      setEditingRoom(null);
      fetchSettings();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al actualizar configuración');
    }
  };

  const handleResetAccumulated = async (room) => {
    if (!confirm(`¿Estás seguro de resetear el pozo acumulado de ${room} a $0?`)) {
      return;
    }

    try {
      await axios.post(`/api/superadmin/room-settings/${room}/reset-accumulated`, {}, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      alert(`Pozo acumulado de ${room} reseteado correctamente`);
      fetchSettings();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al resetear pozo');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Settings className="w-8 h-8 text-blue-400" />
          Configuración de Salas
        </h2>
        <div className="text-center py-12">
          <div className="text-gray-400">Cargando configuración...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Settings className="w-8 h-8 text-blue-400" />
          Configuración de Salas y Pozos
        </h2>
        <button
          onClick={fetchSettings}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tarjeta de Sala Starter */}
        <StarterConfigCard />

        {/* Salas con dinero (Bronce, Plata, Oro) */}
        {settings.map(setting => (
          <div
            key={setting.room}
            className={`bg-gradient-to-br ${getRoomColor(setting.room)} rounded-xl p-6 border transition-all`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{getRoomIcon(setting.room)}</span>
                <div>
                  <h3 className="text-xl font-bold text-white capitalize">
                    Sala {setting.room}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => editingRoom === setting.room ? setEditingRoom(null) : handleEdit(setting.room)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
              >
                {editingRoom === setting.room ? 'Cancelar' : 'Editar'}
              </button>
            </div>

            {/* Formulario de edición */}
            {editingRoom === setting.room ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Precio del Cartón</label>
                  <input
                    type="number"
                    value={editForm.card_price}
                    onChange={(e) => setEditForm({ ...editForm, card_price: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                    placeholder="5000"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm text-gray-300 mb-1">Distribución de Pozos (%)</label>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.percentage_linea}
                      onChange={(e) => setEditForm({ ...editForm, percentage_linea: e.target.value })}
                      className="flex-1 px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                      placeholder="15"
                    />
                    <span className="text-xs text-gray-400">% LÍNEA</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.percentage_bingo}
                      onChange={(e) => setEditForm({ ...editForm, percentage_bingo: e.target.value })}
                      className="flex-1 px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                      placeholder="50"
                    />
                    <span className="text-xs text-gray-400">% BINGO</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.percentage_acumulado}
                      onChange={(e) => setEditForm({ ...editForm, percentage_acumulado: e.target.value })}
                      className="flex-1 px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                      placeholder="5"
                    />
                    <span className="text-xs text-gray-400">% Pre-40</span>
                  </div>

                  <div className="text-xs text-gray-400 mt-2">
                    Total: {(parseFloat(editForm.percentage_linea || 0) + parseFloat(editForm.percentage_bingo || 0) + parseFloat(editForm.percentage_acumulado || 0)).toFixed(2)}%
                    {' '}(Casa: {(100 - (parseFloat(editForm.percentage_linea || 0) + parseFloat(editForm.percentage_bingo || 0) + parseFloat(editForm.percentage_acumulado || 0))).toFixed(2)}%)
                  </div>
                </div>

                <button
                  onClick={handleSave}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-semibold"
                >
                  💾 Guardar Cambios
                </button>
              </div>
            ) : (
              <>
                {/* Vista de solo lectura */}
                <div className="space-y-3">
                  <div className="bg-black/20 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">Precio del Cartón</div>
                    <div className="text-3xl font-bold text-green-400">
                      {formatMoney(setting.card_price)}
                    </div>
                  </div>

                  <div className="bg-black/20 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-2">Distribución de Pozos</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-300">LÍNEA:</span>
                        <span className="text-blue-400 font-semibold">{setting.percentage_linea}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">BINGO:</span>
                        <span className="text-green-400 font-semibold">{setting.percentage_bingo}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Pre-40:</span>
                        <span className="text-yellow-400 font-semibold">{setting.percentage_acumulado}%</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-gray-700">
                        <span className="text-gray-400">Casa:</span>
                        <span className="text-gray-400">{(100 - setting.percentage_linea - setting.percentage_bingo - setting.percentage_acumulado).toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-black/20 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">Pozo Acumulado Pre-40</div>
                    <div className="text-2xl font-bold text-yellow-400">
                      {formatMoney(setting.accumulated_pot_pre40)}
                    </div>
                    <button
                      onClick={() => handleResetAccumulated(setting.room)}
                      className="mt-2 w-full px-3 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded text-xs transition-colors"
                    >
                      🔄 Resetear a $0
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Última actualización */}
            <div className="mt-4 pt-4 border-t border-gray-700/50">
              <div className="text-xs text-gray-500">
                Última actualización: {new Date(setting.updated_at).toLocaleString('es-CO')}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Información adicional */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-300 mb-2">ℹ️ Cómo funciona el sistema de pozos</h4>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• <strong>LÍNEA</strong> y <strong>BINGO</strong>: Se calculan al inicio del sorteo y se entregan a los ganadores. Después del sorteo vuelven a $0.</li>
          <li>• <strong>Pozo Acumulado Pre-40</strong>: Se incrementa de sorteo a sorteo. Solo se entrega si hay BINGO antes de la bola 40.</li>
          <li>• Los pozos se calculan automáticamente: <code>Total Ingresos × Porcentaje</code></li>
          <li>• <strong>Total Ingresos</strong> = Cartones Vendidos × Precio del Cartón</li>
        </ul>
      </div>
    </div>
  );
}
