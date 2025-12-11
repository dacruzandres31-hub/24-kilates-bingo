import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Package, 
  ArrowRight, 
  History, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Send,
  User
} from 'lucide-react';

export default function AdminCardInventory() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('inventory'); // inventory, transfer, movements

  // Estados para inventario
  const [myInventory, setMyInventory] = useState([]);

  // Estados para transferencia
  const [transferForm, setTransferForm] = useState({
    toUserId: '',
    room: 'bronce',
    quantity: 1,
    reason: ''
  });

  // Estados para movimientos
  const [movements, setMovements] = useState([]);

  useEffect(() => {
    if (activeTab === 'inventory') {
      fetchMyInventory();
    } else if (activeTab === 'movements') {
      fetchMyMovements();
    }
  }, [activeTab]);

  const getToken = () => localStorage.getItem('adminToken');

  // ==================== INVENTARIO ====================
  const fetchMyInventory = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admin/cards/inventory', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setMyInventory(response.data.inventories || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setMessage({
        type: 'error',
        text: `Error al cargar inventario: ${error.response?.data?.error || error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  // ==================== TRANSFERENCIA ====================
  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await axios.post(
        '/api/admin/cards/transfer',
        {
          toUserId: parseInt(transferForm.toUserId),
          room: transferForm.room,
          quantity: parseInt(transferForm.quantity),
          reason: transferForm.reason || 'Transferencia de Admin'
        },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      setMessage({
        type: 'success',
        text: `✅ ${response.data.quantity} cartones transferidos exitosamente`
      });

      // Limpiar formulario
      setTransferForm({
        toUserId: '',
        room: 'bronce',
        quantity: 1,
        reason: ''
      });

      // Actualizar inventario
      fetchMyInventory();
    } catch (error) {
      setMessage({
        type: 'error',
        text: `❌ Error: ${error.response?.data?.error || error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  // ==================== MOVIMIENTOS ====================
  const fetchMyMovements = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admin/cards/movements', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setMovements(response.data.movements || []);
    } catch (error) {
      console.error('Error fetching movements:', error);
      setMessage({
        type: 'error',
        text: `Error al cargar movimientos: ${error.response?.data?.error || error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  // ==================== UTILIDADES ====================
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMovementIcon = (type) => {
    switch (type) {
      case 'credit': return '➕';
      case 'debit': return '➖';
      case 'transfer_in': return '⬇️';
      case 'transfer_out': return '⬆️';
      case 'validated': return '✅';
      default: return '📝';
    }
  };

  const getMovementColor = (type) => {
    switch (type) {
      case 'credit':
      case 'transfer_in': return 'text-green-400';
      case 'debit':
      case 'transfer_out': return 'text-red-400';
      case 'validated': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getTotalCards = () => {
    return myInventory.reduce((sum, inv) => sum + inv.total_cards, 0);
  };

  // ==================== RENDER ====================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-900/50 to-blue-900/50 rounded-xl p-6 border border-indigo-500/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Package className="w-8 h-8 text-indigo-400" />
              Mi Inventario de Cartones
            </h2>
            <p className="text-gray-300 mt-1">
              Gestiona tus cartones y transfiere a tus jugadores
            </p>
          </div>
          <button
            onClick={() => {
              if (activeTab === 'inventory') fetchMyInventory();
              else if (activeTab === 'movements') fetchMyMovements();
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
        </div>
      </div>

      {/* Mensajes */}
      {message.text && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-900/20 border-green-500/50 text-green-300'
            : 'bg-red-900/20 border-red-500/50 text-red-300'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <p>{message.text}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'inventory'
              ? 'text-indigo-400 border-b-2 border-indigo-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <Package className="w-5 h-5" />
          Mi Inventario
        </button>
        <button
          onClick={() => setActiveTab('transfer')}
          className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'transfer'
              ? 'text-indigo-400 border-b-2 border-indigo-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <Send className="w-5 h-5" />
          Transferir
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'movements'
              ? 'text-indigo-400 border-b-2 border-indigo-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <History className="w-5 h-5" />
          Historial
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {/* TAB: MI INVENTARIO */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            {/* Resumen */}
            <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-xl p-6 border border-green-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-300">Total de Cartones Disponibles</h3>
                  <p className="text-4xl font-bold text-green-400 mt-2">{getTotalCards()}</p>
                </div>
                <div className="text-6xl opacity-20">📦</div>
              </div>
            </div>

            {/* Tabla de inventario por sala */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Sala
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        📦 Cartones Disponibles
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {loading ? (
                      <tr>
                        <td colSpan="3" className="px-6 py-8 text-center text-gray-400">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                          Cargando inventario...
                        </td>
                      </tr>
                    ) : myInventory.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="px-6 py-8 text-center text-gray-400">
                          No tienes cartones en inventario
                        </td>
                      </tr>
                    ) : (
                      myInventory.map((inv) => (
                        <tr key={inv.room} className="hover:bg-gray-700/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              inv.room === 'bronce' ? 'bg-orange-900/50 text-orange-300' :
                              inv.room === 'plata' ? 'bg-gray-600/50 text-gray-300' :
                              'bg-yellow-900/50 text-yellow-300'
                            }`}>
                              {inv.room === 'bronce' ? '🥉' : inv.room === 'plata' ? '🥈' : '🥇'} {inv.room.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-2xl text-white font-mono font-bold">
                            {inv.total_cards}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {inv.total_cards > 0 ? (
                              <span className="px-3 py-1 bg-green-900/50 text-green-300 text-xs rounded-full">
                                ✅ Disponible
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-red-900/50 text-red-300 text-xs rounded-full">
                                ⚠️ Sin stock
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Ayuda */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-blue-400 text-xl">💡</div>
                <div className="flex-1">
                  <h4 className="text-blue-300 font-semibold mb-1">Acerca de tu inventario</h4>
                  <p className="text-blue-200 text-sm">
                    Los cartones que ves aquí están disponibles para transferir a tus jugadores. 
                    Usa la pestaña "Transferir" para enviar cartones a los usuarios de tu red.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: TRANSFERIR */}
        {activeTab === 'transfer' && (
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <ArrowRight className="w-6 h-6 text-indigo-400" />
              Transferir Cartones a Jugador
            </h3>
            
            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* User ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    ID del Jugador *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={transferForm.toUserId}
                    onChange={(e) => setTransferForm({ ...transferForm, toUserId: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Ej: 123"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    <User className="w-3 h-3 inline mr-1" />
                    Ingresa el ID del jugador de tu red
                  </p>
                </div>

                {/* Room */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Sala *
                  </label>
                  <select
                    value={transferForm.room}
                    onChange={(e) => setTransferForm({ ...transferForm, room: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="bronce">🥉 Bronce</option>
                    <option value="plata">🥈 Plata</option>
                    <option value="oro">🥇 Oro</option>
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Cantidad *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="100"
                    value={transferForm.quantity}
                    onChange={(e) => setTransferForm({ ...transferForm, quantity: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Ej: 10"
                  />
                </div>

                {/* Razón */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Razón (opcional)
                  </label>
                  <input
                    type="text"
                    value={transferForm.reason}
                    onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Ej: Venta a jugador"
                  />
                </div>
              </div>

              {/* Stock disponible */}
              <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-4">
                <h4 className="text-indigo-300 font-semibold mb-2">Stock Disponible</h4>
                <div className="grid grid-cols-3 gap-4">
                  {['bronce', 'plata', 'oro'].map((room) => {
                    const inv = myInventory.find(i => i.room === room);
                    return (
                      <div key={room} className="text-center">
                        <div className="text-xs text-gray-400 mb-1">
                          {room === 'bronce' ? '🥉' : room === 'plata' ? '🥈' : '🥇'} {room.toUpperCase()}
                        </div>
                        <div className="text-2xl font-bold text-white">
                          {inv?.total_cards || 0}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Transferir Cartones
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB: MOVIMIENTOS */}
        {activeTab === 'movements' && (
          <div className="space-y-4">
            {/* Tabla de movimientos */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Sala
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Cantidad
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Razón
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Relacionado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                          Cargando movimientos...
                        </td>
                      </tr>
                    ) : movements.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                          No hay movimientos registrados
                        </td>
                      </tr>
                    ) : (
                      movements.map((mov, idx) => (
                        <tr key={idx} className="hover:bg-gray-700/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {formatDate(mov.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`flex items-center gap-2 text-sm ${getMovementColor(mov.movement_type)}`}>
                              {getMovementIcon(mov.movement_type)}
                              {mov.movement_type.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                            {mov.room.toUpperCase()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-mono text-white">
                            {mov.quantity}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-300 max-w-xs truncate">
                            {mov.reason || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {mov.from_user_username && `De: ${mov.from_user_username}`}
                            {mov.to_user_username && `Para: ${mov.to_user_username}`}
                            {!mov.from_user_username && !mov.to_user_username && '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
