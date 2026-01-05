// ============================================
// COMPONENTE: REPORTE DE INGRESOS
// ============================================
// Reporte detallado de ingresos con distribución:
// - 10% Casa
// - 5% Admins
// - 15% Cajeros
// - 70% Pozos

import { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const API_URL = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : 'http://localhost:3001';

export default function ReporteIngresos() {
  const [reporteData, setReporteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [periodo, setPeriodo] = useState('today');

  useEffect(() => {
    fetchReporte();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo]);

  const fetchReporte = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');

      const { data } = await axios.get(
        `${API_URL}/api/admin/revenue/breakdown?period=${periodo}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setReporte(data.data || data || null);
      setError(null);
    } catch (err) {
      console.error('Error fetching reporte:', err);
      setReporte(null);
      setError(err.response?.data?.message || err.response?.data?.error || 'Error cargando reporte');
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const getPeriodoLabel = (period) => {
    const labels = {
      today: 'Hoy',
      week: 'Últimos 7 días',
      month: 'Últimos 30 días'
    };
    return labels[period] || period;
  };

  // Datos para el gráfico de distribución
  const getDistribucionData = () => {
    if (!reporteData?.distribucion) return [];

    return [
      { name: 'Casa 10%', value: parseFloat(reporteData.distribucion.casa_10), color: '#10b981' },
      { name: 'Admins 5%', value: parseFloat(reporteData.distribucion.admins_5), color: '#3b82f6' },
      { name: 'Cajeros 15%', value: parseFloat(reporteData.distribucion.cajeros_15), color: '#f59e0b' },
      { name: 'Pozos 70%', value: parseFloat(reporteData.distribucion.pozos_70), color: '#8b5cf6' }
    ];
  };

  return (
    <div className="space-y-6">
      {/* Filtro de Período */}
      <div className="flex items-center gap-4">
        <span className="text-gray-400 font-medium">📅 Período:</span>
        <button
          onClick={() => setPeriodo('today')}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            periodo === 'today'
              ? 'bg-emerald-600 text-white shadow-lg'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Hoy
        </button>
        <button
          onClick={() => setPeriodo('week')}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            periodo === 'week'
              ? 'bg-emerald-600 text-white shadow-lg'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          7 días
        </button>
        <button
          onClick={() => setPeriodo('month')}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            periodo === 'month'
              ? 'bg-emerald-600 text-white shadow-lg'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          30 días
        </button>

        <button
          onClick={fetchReporte}
          className="ml-auto px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
        >
          🔄 Refrescar
        </button>
      </div>

      {/* Contenido del Reporte */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Generando reporte...</p>
        </div>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-center">
          <p className="text-red-400">❌ {error}</p>
        </div>
      ) : !reporteData ? (
        <div className="text-center py-12 text-gray-400">
          📭 No hay datos disponibles
        </div>
      ) : (
        <>
          {/* Header del Reporte */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-6">
            <h3 className="text-2xl font-bold text-white mb-2">
              📊 Reporte de Ingresos - {getPeriodoLabel(periodo)}
            </h3>
            <p className="text-indigo-100">Distribución de ingresos netos según reglas de negocio</p>
          </div>

          {/* Métricas Principales */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-900/50 rounded-lg border border-gray-700 p-6">
              <p className="text-gray-400 text-sm mb-2">💰 Ingresos Brutos</p>
              <p className="text-3xl font-bold text-white">
                {formatMoney(reporteData.total_depositos)}
              </p>
            </div>

            <div className="bg-gray-900/50 rounded-lg border border-gray-700 p-6">
              <p className="text-gray-400 text-sm mb-2">💸 Retiros</p>
              <p className="text-3xl font-bold text-red-400">
                {formatMoney(reporteData.total_retiros)}
              </p>
            </div>

            <div className="bg-gray-900/50 rounded-lg border border-gray-700 p-6">
              <p className="text-gray-400 text-sm mb-2">📈 Ingresos Netos</p>
              <p className="text-3xl font-bold text-emerald-400">
                {formatMoney(reporteData.ingresos_netos)}
              </p>
            </div>

            <div className="bg-gray-900/50 rounded-lg border border-gray-700 p-6">
              <p className="text-gray-400 text-sm mb-2">🎁 Premios Pagados</p>
              <p className="text-3xl font-bold text-yellow-400">
                {formatMoney(reporteData.total_premios)}
              </p>
            </div>
          </div>

          {/* Distribución Visual */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Torta */}
            <div className="bg-gray-900/50 rounded-lg border border-gray-700 p-6">
              <h4 className="text-lg font-bold text-white mb-4">🥧 Distribución de Ingresos Netos</h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={getDistribucionData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {getDistribucionData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatMoney(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Valores Absolutos */}
            <div className="bg-gray-900/50 rounded-lg border border-gray-700 p-6">
              <h4 className="text-lg font-bold text-white mb-4">💵 Valores Absolutos</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-emerald-900/20 border border-emerald-700 rounded-lg">
                  <div>
                    <p className="text-emerald-400 font-medium">🏠 Casa (10%)</p>
                    <p className="text-gray-400 text-sm">Ganancia neta del negocio</p>
                  </div>
                  <p className="text-2xl font-bold text-emerald-400">
                    {formatMoney(reporteData.distribucion.casa_10)}
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
                  <div>
                    <p className="text-blue-400 font-medium">👔 Admins (5%)</p>
                    <p className="text-gray-400 text-sm">Deuda con socios/inversores</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-400">
                    {formatMoney(reporteData.distribucion.admins_5)}
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
                  <div>
                    <p className="text-yellow-400 font-medium">💰 Cajeros (15%)</p>
                    <p className="text-gray-400 text-sm">Comisiones a vendedores</p>
                  </div>
                  <p className="text-2xl font-bold text-yellow-400">
                    {formatMoney(reporteData.distribucion.cajeros_15)}
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 bg-purple-900/20 border border-purple-700 rounded-lg">
                  <div>
                    <p className="text-purple-400 font-medium">🎰 Pozos (70%)</p>
                    <p className="text-gray-400 text-sm">Línea + Bingo + Acumulativo</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-400">
                    {formatMoney(reporteData.distribucion.pozos_70)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Movimientos Detallados */}
          {reporteData.movimientos_detalle && reporteData.movimientos_detalle.length > 0 && (
            <div className="bg-gray-900/50 rounded-lg border border-gray-700 p-6">
              <h4 className="text-lg font-bold text-white mb-4">📋 Movimientos Detallados</h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Tipo</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">Cantidad</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">Total</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">% del Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporteData.movimientos_detalle.map((mov, index) => {
                      const porcentaje = reporteData.ingresos_netos > 0 
                        ? (parseFloat(mov.total) / parseFloat(reporteData.ingresos_netos)) * 100 
                        : 0;

                      return (
                        <tr key={index} className="border-b border-gray-800 hover:bg-gray-800/50">
                          <td className="py-3 px-4 text-white font-medium">
                            {mov.movement_type}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-300">
                            {mov.count}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`font-semibold ${
                              parseFloat(mov.total) >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {formatMoney(mov.total)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-gray-400">
                            {porcentaje.toFixed(2)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Advertencias y Notas */}
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
            <h4 className="text-blue-400 font-semibold mb-2">ℹ️ Notas Importantes</h4>
            <ul className="text-gray-300 text-sm space-y-1 list-disc list-inside">
              <li>Los cálculos se basan en <strong>ingresos netos</strong> (depósitos - retiros)</li>
              <li>La comisión del 15% se distribuye <strong>individualmente</strong> a cada cajero según sus ventas</li>
              <li>El 70% de pozos se distribuye en: Línea, Bingo y Acumulativo</li>
              <li>Todos los cálculos usan <strong>MoneyMath</strong> para precisión decimal</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
