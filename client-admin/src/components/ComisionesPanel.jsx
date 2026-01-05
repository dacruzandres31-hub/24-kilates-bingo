// ============================================
// COMPONENTE: PANEL DE COMISIONES
// ============================================
// Panel de comisiones de cajeros con ranking y estadísticas
// Muestra comisiones del 15% por ventas de cartones

import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : 'http://localhost:3001';

export default function ComisionesPanel() {
  const [topCajeros, setTopCajeros] = useState([]);
  const [comisionesDetalle, setComisionesDetalle] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [periodo, setPeriodo] = useState('30d');
  const [cajeroSeleccionado, setCajeroSeleccionado] = useState(null);

  useEffect(() => {
    fetchTopCajeros();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo]);

  useEffect(() => {
    if (cajeroSeleccionado) {
      fetchComisionesDetalle(cajeroSeleccionado);
    }
  }, [cajeroSeleccionado]);

  const fetchTopCajeros = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');

      const { data } = await axios.get(
        `${API_URL}/api/commissions/top-cashiers?period=${periodo}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const cashiers = Array.isArray(data) ? data : (data.data || []);
      setTopCajeros(cashiers);
      setError(null);
    } catch (err) {
      console.error('Error fetching top cajeros:', err);
      setTopCajeros([]);
      setError(err.response?.data?.message || err.response?.data?.error || 'Error cargando ranking');
    } finally {
      setLoading(false);
    }
  };

  const fetchComisionesDetalle = async (cajeroId) => {
    try {
      const token = localStorage.getItem('adminToken');

      const { data } = await axios.get(
        `${API_URL}/api/commissions/cashier/${cajeroId}?limit=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const details = data.data?.commissions || data.commissions || data || [];
      setComisionesDetalle(Array.isArray(details) ? details : []);
    } catch (err) {
      console.error('Error fetching comisiones detalle:', err);
      setComisionesDetalle([]);
      alert('Error cargando detalle de comisiones');
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

  const getMedalIcon = (index) => {
    const medals = ['🥇', '🥈', '🥉'];
    return medals[index] || '🏅';
  };

  const getPeriodoLabel = (period) => {
    const labels = {
      '7d': 'Últimos 7 días',
      '30d': 'Últimos 30 días',
      '90d': 'Últimos 90 días'
    };
    return labels[period] || period;
  };

  return (
    <div className="space-y-6">
      {/* Filtro de Período */}
      <div className="flex items-center gap-4">
        <span className="text-gray-400 font-medium">📅 Período:</span>
        <button
          onClick={() => setPeriodo('7d')}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            periodo === '7d'
              ? 'bg-emerald-600 text-white shadow-lg'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          7 días
        </button>
        <button
          onClick={() => setPeriodo('30d')}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            periodo === '30d'
              ? 'bg-emerald-600 text-white shadow-lg'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          30 días
        </button>
        <button
          onClick={() => setPeriodo('90d')}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            periodo === '90d'
              ? 'bg-emerald-600 text-white shadow-lg'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          90 días
        </button>

        <button
          onClick={fetchTopCajeros}
          className="ml-auto px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
        >
          🔄 Refrescar
        </button>
      </div>

      {/* Ranking de Cajeros */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Cargando ranking...</p>
        </div>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-center">
          <p className="text-red-400">❌ {error}</p>
        </div>
      ) : topCajeros.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          📭 No hay comisiones registradas en el período seleccionado
        </div>
      ) : (
        <>
          <div className="bg-gradient-to-r from-yellow-600 to-amber-600 rounded-lg p-6 mb-4">
            <h3 className="text-2xl font-bold text-white mb-2">🏆 Top Cajeros - {getPeriodoLabel(periodo)}</h3>
            <p className="text-yellow-100">Comisión del 15% por ventas de cartones</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.isArray(topCajeros) && topCajeros.map((cajero, index) => (
              <div
                key={cajero.cashier_id}
                onClick={() => setCajeroSeleccionado(cajero.cashier_id)}
                className={`bg-gray-900/50 rounded-lg border p-6 cursor-pointer transition-all hover:scale-105 ${
                  index < 3 
                    ? 'border-yellow-500 shadow-lg shadow-yellow-500/20' 
                    : 'border-gray-700 hover:border-emerald-600/50'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-xl font-bold text-white mb-1">
                      {cajero.username}
                    </h4>
                    <p className="text-gray-400 text-sm">
                      ID: #{cajero.cashier_id} • {cajero.role}
                    </p>
                  </div>
                  <span className="text-4xl">{getMedalIcon(index)}</span>
                </div>

                <div className="space-y-3">
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-gray-400 text-sm mb-1">💰 Total Comisiones</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      {formatMoney(cajero.total_earned)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <p className="text-gray-400 text-xs mb-1">📊 Transacciones</p>
                      <p className="text-white font-semibold">{cajero.total_commissions}</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <p className="text-gray-400 text-xs mb-1">📈 Promedio</p>
                      <p className="text-white font-semibold">{formatMoney(cajero.avg_commission)}</p>
                    </div>
                  </div>

                  {cajero.last_commission && (
                    <p className="text-gray-500 text-xs text-center mt-2">
                      Última comisión: {formatDate(cajero.last_commission)}
                    </p>
                  )}
                </div>

                <button className="w-full mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors">
                  Ver Detalle
                </button>
              </div>
            ))}
          </div>

          {/* Estadísticas Globales */}
          <div className="bg-gray-900/50 rounded-lg border border-gray-700 p-6 mt-6">
            <h4 className="text-lg font-bold text-white mb-4">📊 Estadísticas Globales</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-2">Total Cajeros Activos</p>
                <p className="text-2xl font-bold text-white">{topCajeros.length}</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-2">Total Comisiones Pagadas</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {formatMoney(
                    topCajeros.reduce((acc, c) => acc + parseFloat(c.total_earned), 0)
                  )}
                </p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-2">Total Transacciones</p>
                <p className="text-2xl font-bold text-white">
                  {topCajeros.reduce((acc, c) => acc + c.total_commissions, 0)}
                </p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-2">Comisión Promedio</p>
                <p className="text-2xl font-bold text-white">
                  {formatMoney(
                    topCajeros.reduce((acc, c) => acc + parseFloat(c.avg_commission), 0) / topCajeros.length
                  )}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal de Detalle */}
      {cajeroSeleccionado && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-4xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">
                📋 Detalle de Comisiones
              </h3>
              <button
                onClick={() => {
                  setCajeroSeleccionado(null);
                  setComisionesDetalle([]);
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                ✕ Cerrar
              </button>
            </div>

            {comisionesDetalle.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                Cargando detalle...
              </div>
            ) : (
              <>
                <div className="bg-emerald-900/20 border border-emerald-700 rounded-lg p-4 mb-6">
                  <p className="text-emerald-400 font-semibold">
                    Total: {formatMoney(
                      comisionesDetalle.reduce((acc, c) => acc + parseFloat(c.amount), 0)
                    )}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Fecha</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Sesión</th>
                        <th className="text-right py-3 px-4 text-gray-400 font-medium">Monto</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(comisionesDetalle) && comisionesDetalle.map((comision) => (
                        <tr key={comision.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                          <td className="py-3 px-4 text-gray-300 text-sm">
                            {formatDate(comision.created_at)}
                          </td>
                          <td className="py-3 px-4 text-gray-300">
                            {comision.game_session_id ? `#${comision.game_session_id}` : '-'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-emerald-400 font-semibold">
                              {formatMoney(comision.amount)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-300 text-sm">
                            {comision.reason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
