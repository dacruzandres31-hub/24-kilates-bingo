import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Package, 
  Users, 
  History, 
  Search, 
  ArrowRight, 
  Gift, 
  CreditCard,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Eye,
  TrendingUp
} from 'lucide-react';

export default function CardInventoryPanel() {
  // Estados principales
  const [activeTab, setActiveTab] = useState('credit'); // credit, inventories, movements
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Estados para acreditar
  const [creditForm, setCreditForm] = useState({
    username: '',
    room: 'bronce',
    quantity: 1,
    isGift: false,
    reason: ''
  });

  // Estados para inventarios
  const [allInventories, setAllInventories] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para movimientos
  const [movements, setMovements] = useState([]);
  const [movementsUserId, setMovementsUserId] = useState('');

  // Estados para transferencias
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({
    fromUsername: '',
    toUsername: '',
    room: 'bronce',
    quantity: 1,
    reason: ''
  });

  useEffect(() => {
    if (activeTab === 'inventories') {
      fetchAllInventories();
    }
  }, [activeTab]);

  const getToken = () => localStorage.getItem('adminToken');

  // ==================== ACREDITACIÓN ====================
  const handleCreditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await axios.post(
        '/api/superadmin/cards/credit',
        {
          username: creditForm.username,
          room: creditForm.room,
          quantity: parseInt(creditForm.quantity),
          isGift: creditForm.isGift,
          reason: creditForm.reason || `Acreditación ${creditForm.isGift ? 'regalo' : 'normal'} - SuperAdmin`
        },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      setMessage({
        type: 'success',
        text: `✅ ${response.data.quantity} cartones ${response.data.isGift ? 'regalo' : 'normales'} acreditados. Nuevo total: ${response.data.newTotal}`
      });

      // Limpiar formulario
      setCreditForm({
        username: '',
        room: 'bronce',
        quantity: 1,
        isGift: false,
        reason: ''
      });

      // Actualizar inventarios si estamos en esa pestaña
      if (activeTab === 'inventories') {
        fetchAllInventories();
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: `❌ Error: ${error.response?.data?.error || error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  // ==================== INVENTARIOS ====================
  const fetchAllInventories = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/superadmin/cards/all-inventories', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setAllInventories(response.data.inventories || []);
    } catch (error) {
      console.error('Error fetching inventories:', error);
      setMessage({
        type: 'error',
        text: `Error al cargar inventarios: ${error.response?.data?.error || error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetail = async (userId) => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/superadmin/cards/inventory/${userId}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setUserDetail(response.data);
      setSelectedUser(userId);
    } catch (error) {
      console.error('Error fetching user detail:', error);
      setMessage({
        type: 'error',
        text: `Error al cargar detalle: ${error.response?.data?.error || error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  // ==================== MOVIMIENTOS ====================
  const fetchMovements = async (userId) => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`/api/superadmin/cards/movements/${userId}`, {
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

  // ==================== TRANSFERENCIAS ====================
  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await axios.post(
        '/api/superadmin/cards/transfer',
        {
          from_username: transferForm.fromUsername,
          to_username: transferForm.toUsername,
          room: transferForm.room,
          quantity: parseInt(transferForm.quantity),
          reason: transferForm.reason || 'Transferencia SuperAdmin'
        },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      setMessage({
        type: 'success',
        text: `✅ ${response.data.transferred.normal} normales + ${response.data.transferred.gift} regalo transferidos`
      });

      setShowTransferModal(false);
      setTransferForm({
        fromUsername: '',
        toUsername: '',
        room: 'bronce',
        quantity: 1,
        reason: ''
      });

      fetchAllInventories();
    } catch (error) {
      setMessage({
        type: 'error',
        text: `❌ Error: ${error.response?.data?.error || error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  // ==================== UTILIDADES ====================
  const filteredInventories = allInventories.filter(inv =>
    inv.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.user_id.toString().includes(searchTerm)
  );

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

  // ==================== RENDER ====================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 rounded-xl p-6 border border-purple-500/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Package className="w-8 h-8 text-purple-400" />
              Gestión de Inventario de Cartones
            </h2>
            <p className="text-gray-300 mt-1">
              Sistema v1.4.0 - Panel SuperAdmin
            </p>
          </div>
          <button
            onClick={fetchAllInventories}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
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
          onClick={() => setActiveTab('credit')}
          className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'credit'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <CreditCard className="w-5 h-5" />
          Acreditar Cartones
        </button>
        <button
          onClick={() => setActiveTab('inventories')}
          className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'inventories'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <Users className="w-5 h-5" />
          Ver Inventarios
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'movements'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <History className="w-5 h-5" />
          Historial
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {/* TAB: ACREDITAR */}
        {activeTab === 'credit' && (
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Gift className="w-6 h-6 text-purple-400" />
              Acreditar Cartones por Nombre de Usuario
            </h3>
            
            <form onSubmit={handleCreditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nombre de Usuario *
                  </label>
                  <input
                    type="text"
                    required
                    value={creditForm.username}
                    onChange={(e) => setCreditForm({ ...creditForm, username: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Ej: jugador123"
                  />
                </div>

                {/* Room */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Sala *
                  </label>
                  <select
                    value={creditForm.room}
                    onChange={(e) => setCreditForm({ ...creditForm, room: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                    max="1000"
                    value={creditForm.quantity}
                    onChange={(e) => setCreditForm({ ...creditForm, quantity: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Ej: 10"
                  />
                </div>

                {/* Tipo */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tipo de Cartón
                  </label>
                  <div className="flex items-center gap-4 h-10">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={!creditForm.isGift}
                        onChange={() => setCreditForm({ ...creditForm, isGift: false })}
                        className="w-4 h-4 text-purple-600"
                      />
                      <span className="text-white">💰 Normal</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={creditForm.isGift}
                        onChange={() => setCreditForm({ ...creditForm, isGift: true })}
                        className="w-4 h-4 text-purple-600"
                      />
                      <span className="text-white">🎁 Regalo</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Razón */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Razón (opcional)
                </label>
                <textarea
                  value={creditForm.reason}
                  onChange={(e) => setCreditForm({ ...creditForm, reason: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows="2"
                  placeholder="Ej: Promoción especial, compensación, etc."
                />
              </div>

              {/* Submit */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Acreditar Cartones
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB: INVENTARIOS */}
        {activeTab === 'inventories' && (
          <div className="space-y-4">
            {/* Búsqueda y controles */}
            <div className="flex gap-4 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por usuario o ID..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setShowTransferModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                Transferir
              </button>
            </div>

            {/* Tabla de inventarios */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Usuario
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Sala
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        💰 Normales
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        🎁 Regalo
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        📦 Total
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                          Cargando inventarios...
                        </td>
                      </tr>
                    ) : filteredInventories.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                          No hay inventarios para mostrar
                        </td>
                      </tr>
                    ) : (
                      filteredInventories.map((inv) => (
                        <tr key={`${inv.user_id}-${inv.room}`} className="hover:bg-gray-700/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div>
                                <div className="text-sm font-medium text-white">
                                  {inv.username}
                                </div>
                                <div className="text-xs text-gray-400">
                                  ID: {inv.user_id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              inv.room === 'bronce' ? 'bg-orange-900/50 text-orange-300' :
                              inv.room === 'plata' ? 'bg-gray-600/50 text-gray-300' :
                              'bg-yellow-900/50 text-yellow-300'
                            }`}>
                              {inv.room === 'bronce' ? '🥉' : inv.room === 'plata' ? '🥈' : '🥇'} {inv.room.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-white font-mono">
                            {inv.normal_cards || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-purple-400 font-mono">
                            {inv.gift_cards || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-400 font-mono font-semibold">
                            {inv.total_cards}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => fetchUserDetail(inv.user_id)}
                              className="text-purple-400 hover:text-purple-300 transition-colors"
                              title="Ver detalle"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detalle de usuario seleccionado */}
            {userDetail && selectedUser && (
              <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 rounded-xl p-6 border border-indigo-500/30">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-400" />
                  Detalle de {userDetail.username} (ID: {selectedUser})
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {userDetail.inventories.map((inv) => (
                    <div key={inv.room} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <div className="text-sm text-gray-400 mb-2">
                        {inv.room === 'bronce' ? '🥉' : inv.room === 'plata' ? '🥈' : '🥇'} Sala {inv.room.toUpperCase()}
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-300">Normales:</span>
                          <span className="text-white font-mono">{inv.normal_cards || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-300">Regalo:</span>
                          <span className="text-purple-400 font-mono">{inv.gift_cards || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm font-semibold pt-2 border-t border-gray-600">
                          <span className="text-gray-300">Total:</span>
                          <span className="text-green-400 font-mono">{inv.total_cards}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setSelectedUser(null);
                    setUserDetail(null);
                  }}
                  className="mt-4 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cerrar detalle
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB: MOVIMIENTOS */}
        {activeTab === 'movements' && (
          <div className="space-y-4">
            {/* Selector de usuario */}
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre de Usuario
                </label>
                <input
                  type="text"
                  value={movementsUserId}
                  onChange={(e) => setMovementsUserId(e.target.value)}
                  placeholder="Ingrese nombre de usuario"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => fetchMovements(movementsUserId)}
                disabled={!movementsUserId || loading}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                Buscar
              </button>
            </div>

            {/* Tabla de movimientos */}
            {movements.length > 0 && (
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
                          Tipo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Razón
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Ejecutado por
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {movements.map((mov, idx) => (
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
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              mov.is_gift 
                                ? 'bg-purple-900/50 text-purple-300'
                                : 'bg-blue-900/50 text-blue-300'
                            }`}>
                              {mov.is_gift ? '🎁 Regalo' : '💰 Normal'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-300 max-w-xs truncate">
                            {mov.reason || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {mov.executed_by_username || `ID: ${mov.executed_by}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {movements.length === 0 && movementsUserId && !loading && (
              <div className="bg-gray-800/50 rounded-xl p-8 text-center border border-gray-700">
                <History className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400">No hay movimientos para este usuario</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Transferencia */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <ArrowRight className="w-6 h-6 text-indigo-400" />
              Transferir Cartones
            </h3>

            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre de Usuario Origen *
                </label>
                <input
                  type="text"
                  required
                  value={transferForm.fromUsername}
                  onChange={(e) => setTransferForm({ ...transferForm, fromUsername: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Ej: usuario1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre de Usuario Destino *
                </label>
                <input
                  type="text"
                  required
                  value={transferForm.toUsername}
                  onChange={(e) => setTransferForm({ ...transferForm, toUsername: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Ej: usuario2"
                />
              </div>

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

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Cantidad *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={transferForm.quantity}
                  onChange={(e) => setTransferForm({ ...transferForm, quantity: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Razón (opcional)
                </label>
                <input
                  type="text"
                  value={transferForm.reason}
                  onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Motivo de la transferencia"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Procesando...' : 'Transferir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
