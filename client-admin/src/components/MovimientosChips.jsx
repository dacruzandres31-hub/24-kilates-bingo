// ============================================
// COMPONENTE: MOVIMIENTOS DE CHIPS
// ============================================
// Historial completo de movimientos de fichas con filtros

import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function MovimientosChips() {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filtros
  const [filtros, setFiltros] = useState({
    userId: '',
    movementType: '',
    startDate: '',
    endDate: '',
    limit: 100
  });

  const movementTypes = {
    deposit: { label: 'Depósito', color: 'text-green-400', icon: '⬆️' },
    withdrawal: { label: 'Retiro', color: 'text-red-400', icon: '⬇️' },
    bet: { label: 'Apuesta', color: 'text-orange-400', icon: '🎲' },
    win: { label: 'Premio', color: 'text-yellow-400', icon: '🏆' },
    refund: { label: 'Reembolso', color: 'text-blue-400', icon: '↩️' },
    transfer_in: { label: 'Transferencia Recibida', color: 'text-green-400', icon: '📥' },
    transfer_out: { label: 'Transferencia Enviada', color: 'text-red-400', icon: '📤' },
    adjustment: { label: 'Ajuste', color: 'text-purple-400', icon: '⚙️' },
    bonus: { label: 'Bonificación', color: 'text-emerald-400', icon: '🎁' },
    penalty: { label: 'Penalización', color: 'text-red-500', icon: '⛔' }
  };

  useEffect(() => {
    fetchMovimientos();
  }, [filtros]);

  const fetchMovimientos = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Construir query params
      const params = new URLSearchParams();
      if (filtros.movementType) params.append('movementType', filtros.movementType);
      if (filtros.startDate) params.append('startDate', filtros.startDate);
      if (filtros.endDate) params.append('endDate', filtros.endDate);
      params.append('limit', filtros.limit);

      const endpoint = filtros.userId 
        ? `/api/chips/history/${filtros.userId}?${params}`
        : `/api/chips/history?${params}`;

      const { data } = await axios.get(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMovimientos(data.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching movimientos:', err);
      setError(err.response?.data?.message || 'Error cargando movimientos');
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">🔍 Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Usuario ID</label>
            <input
              type="number"
              placeholder="Ej: 15"
              value={filtros.userId}
              onChange={(e) => setFiltros({ ...filtros, userId: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Tipo de Movimiento</label>
            <select
              value={filtros.movementType}
              onChange={(e) => setFiltros({ ...filtros, movementType: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">Todos</option>
              {Object.entries(movementTypes).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Fecha Inicio</label>
            <input
              type="date"
              value={filtros.startDate}
              onChange={(e) => setFiltros({ ...filtros, startDate: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Fecha Fin</label>
            <input
              type="date"
              value={filtros.endDate}
              onChange={(e) => setFiltros({ ...filtros, endDate: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Límite</label>
            <select
              value={filtros.limit}
              onChange={(e) => setFiltros({ ...filtros, limit: parseInt(e.target.value) })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
              <option value="500">500</option>
            </select>
          </div>
        </div>

        <button
          onClick={fetchMovimientos}
          className="mt-4 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
        >
          🔄 Refrescar
        </button>
      </div>

      {/* Tabla de Movimientos */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Cargando movimientos...</p>
        </div>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-center">
          <p className="text-red-400">❌ {error}</p>
        </div>
      ) : movimientos.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          📭 No se encontraron movimientos con los filtros seleccionados
        </div>
      ) : (
        <>
          <div className="bg-gray-900/30 rounded-lg p-4 mb-4">
            <p className="text-gray-400">
              📊 Total de movimientos: <span className="text-white font-semibold">{movimientos.length}</span>
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">ID</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Fecha</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Usuario</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Tipo</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Monto</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Balance Anterior</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Balance Posterior</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((mov) => {
                  const typeInfo = movementTypes[mov.movement_type] || { 
                    label: mov.movement_type, 
                    color: 'text-gray-400',
                    icon: '📝'
                  };

                  return (
                    <tr key={mov.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                      <td className="py-3 px-4 text-gray-300">#{mov.id}</td>
                      <td className="py-3 px-4 text-gray-300 text-sm">{formatDate(mov.created_at)}</td>
                      <td className="py-3 px-4">
                        <span className="text-white font-medium">{mov.username || `User #${mov.user_id}`}</span>
                        <span className="text-gray-500 text-xs ml-2">#{mov.user_id}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`${typeInfo.color} font-medium`}>
                          {typeInfo.icon} {typeInfo.label}
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-right font-semibold ${
                        mov.amount >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {mov.amount >= 0 ? '+' : ''}{formatMoney(mov.amount)}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-400">
                        {formatMoney(mov.balance_before)}
                      </td>
                      <td className="py-3 px-4 text-right text-white font-medium">
                        {formatMoney(mov.balance_after)}
                      </td>
                      <td className="py-3 px-4 text-gray-300 text-sm max-w-xs truncate" title={mov.reason}>
                        {mov.reason}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
