import { useState, useEffect } from 'react';
import axios from 'axios';
import { Gift, Settings, RefreshCw } from 'lucide-react';

export default function StarterConfigCard() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    prizes_linea: 0,
    ticket_room_linea: 'bronce',
    prizes_bingo: 0,
    ticket_room_bingo: 'oro'
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const getToken = () => localStorage.getItem('adminToken');

  const fetchConfig = async () => {
    try {
      const response = await axios.get('/api/superadmin/starter-config', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setConfig(response.data.config);
      setEditForm({
        prizes_linea: response.data.config.prizes_linea,
        ticket_room_linea: response.data.config.ticket_room_linea || 'bronce',
        prizes_bingo: response.data.config.prizes_bingo,
        ticket_room_bingo: response.data.config.ticket_room_bingo || 'oro'
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching starter config:', error);
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const handleSave = async () => {
    try {
      await axios.put('/api/superadmin/starter-config', {
        prizes_linea: editForm.prizes_linea,
        ticket_room_linea: editForm.ticket_room_linea,
        prizes_bingo: editForm.prizes_bingo,
        ticket_room_bingo: editForm.ticket_room_bingo
      }, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });

      alert('Premios de Sala Starter actualizados correctamente');
      setEditing(false);
      fetchConfig();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al actualizar premios');
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-green-900/40 to-emerald-800/20 rounded-xl p-6 border border-green-500/30">
        <div className="text-center text-gray-400">Cargando configuración...</div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-green-900/40 to-emerald-800/20 rounded-xl p-6 border border-green-500/30 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🎁</span>
          <div>
            <h3 className="text-xl font-bold text-white">
              Sala Starter
            </h3>
            <p className="text-xs text-gray-400">Premios en Tickets</p>
          </div>
        </div>
        <button
          onClick={() => editing ? setEditing(false) : handleEdit()}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
        >
          {editing ? 'Cancelar' : 'Editar'}
        </button>
      </div>

      {/* Formulario de edición */}
      {editing ? (
        <div className="space-y-4">
          {/* Premio de Línea */}
          <div className="border border-blue-500/30 rounded-lg p-4 bg-blue-900/10">
            <h4 className="text-sm font-semibold text-blue-300 mb-3">🏆 Premio de Línea</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Cantidad de Tickets</label>
                <input
                  type="number"
                  min="0"
                  value={editForm.prizes_linea}
                  onChange={(e) => setEditForm({ ...editForm, prizes_linea: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                  placeholder="2"
                />
              </div>
              
              <div>
                <label className="block text-xs text-gray-400 mb-1">Tipo de Ticket</label>
                <select
                  value={editForm.ticket_room_linea}
                  onChange={(e) => setEditForm({ ...editForm, ticket_room_linea: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="bronce">🥉 Bronce</option>
                  <option value="plata">🥈 Plata</option>
                  <option value="oro">🥇 Oro</option>
                </select>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-2">Tickets que recibe el ganador de Línea</p>
          </div>

          {/* Premio de Bingo */}
          <div className="border border-yellow-500/30 rounded-lg p-4 bg-yellow-900/10">
            <h4 className="text-sm font-semibold text-yellow-300 mb-3">🎯 Premio de Bingo</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Cantidad de Tickets</label>
                <input
                  type="number"
                  min="0"
                  value={editForm.prizes_bingo}
                  onChange={(e) => setEditForm({ ...editForm, prizes_bingo: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-yellow-500 focus:outline-none"
                  placeholder="5"
                />
              </div>
              
              <div>
                <label className="block text-xs text-gray-400 mb-1">Tipo de Ticket</label>
                <select
                  value={editForm.ticket_room_bingo}
                  onChange={(e) => setEditForm({ ...editForm, ticket_room_bingo: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-yellow-500 focus:outline-none"
                >
                  <option value="bronce">🥉 Bronce</option>
                  <option value="plata">🥈 Plata</option>
                  <option value="oro">🥇 Oro</option>
                </select>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-2">Tickets que recibe el ganador de Bingo</p>
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
              <div className="text-sm text-gray-400 mb-1">Premio de Línea</div>
              <div className="text-3xl font-bold text-blue-400 flex items-center gap-2">
                🎫 {config.prizes_linea}
                <span className="text-sm text-gray-400">
                  {config.ticket_room_linea === 'bronce' && '🥉 Bronce'}
                  {config.ticket_room_linea === 'plata' && '🥈 Plata'}
                  {config.ticket_room_linea === 'oro' && '🥇 Oro'}
                </span>
              </div>
            </div>

            <div className="bg-black/20 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Premio de Bingo</div>
              <div className="text-3xl font-bold text-yellow-400 flex items-center gap-2">
                🎫 {config.prizes_bingo}
                <span className="text-sm text-gray-400">
                  {config.ticket_room_bingo === 'bronce' && '🥉 Bronce'}
                  {config.ticket_room_bingo === 'plata' && '🥈 Plata'}
                  {config.ticket_room_bingo === 'oro' && '🥇 Oro'}
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Última actualización */}
      <div className="mt-4 pt-4 border-t border-gray-700/50">
        <div className="text-xs text-gray-500">
          {config.updated_at && `Última actualización: ${new Date(config.updated_at).toLocaleString('es-CO')}`}
          {config.updated_by_name && ` por ${config.updated_by_name}`}
        </div>
      </div>

      {/* Info adicional */}
      <div className="mt-4 bg-green-900/20 border border-green-500/20 rounded-lg p-3">
        <h5 className="text-xs font-semibold text-green-300 mb-1">ℹ️ Sobre Sala Starter</h5>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• Acceso gratuito para todos los jugadores</li>
          <li>• Premios pagados en tickets (no dinero)</li>
          <li>• Los tickets pueden usarse en salas Bronce, Plata u Oro</li>
          <li>• Cambios se reflejan en tiempo real en el lobby</li>
        </ul>
      </div>
    </div>
  );
}
