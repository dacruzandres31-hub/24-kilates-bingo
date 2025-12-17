import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, 
  RefreshCw, 
  Search, 
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export default function AllInventoriesPanel() {
  const [inventories, setInventories] = useState([]);
  const [stats, setStats] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRoom, setFilterRoom] = useState('all');
  const [filterAlert, setFilterAlert] = useState(false);

  useEffect(() => {
    fetchInventories();
  }, []);

  const getToken = () => localStorage.getItem('adminToken');

  const fetchInventories = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        '/api/admin/cards/all-inventories',
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      setInventories(response.data.inventories || []);
      setStats(response.data.stats || {});
      setRole(response.data.role);
      setError(null);
    } catch (err) {
      console.error('Error fetching inventories:', err);
      setError(err.response?.data?.error || 'Error al cargar inventarios');
    } finally {
      setLoading(false);
    }
  };

  const getAlertLevel = (percentage) => {
    if (!percentage) return 'ok';
    if (percentage <= 10) return 'ok';
    if (percentage <= 20) return 'warning';
    return 'critical';
  };

  const getAlertIcon = (percentage) => {
    if (!percentage) return '✅';
    if (percentage <= 10) return '✅';
    if (percentage <= 20) return '⚠️';
    return '🚫';
  };

  // Filtrar inventarios
  const filteredInventories = inventories.filter(inv => {
    const matchesSearch = inv.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRoom = filterRoom === 'all' || Object.keys(inv.rooms).includes(filterRoom);
    const matchesAlert = !filterAlert || (role === 'superadmin' && inv.avg_free_percentage > 10);
    
    return matchesSearch && matchesRoom && matchesAlert;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-12 h-12 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 text-red-300">
        <p className="font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Error
        </p>
        <p className="text-sm mt-2">{error}</p>
        <button
          onClick={fetchInventories}
          className="mt-3 text-sm underline hover:no-underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Título */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Users className="w-8 h-8 text-purple-400" />
          Inventarios de Red
        </h2>
        <button
          onClick={fetchInventories}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refrescar
        </button>
      </div>

      {/* Estadísticas generales */}
      {role === 'superadmin' ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 rounded-xl p-5 border border-blue-500/30">
            <div className="text-sm text-blue-300 font-medium">Total Red</div>
            <div className="text-3xl font-bold text-white mt-2">{stats.total_cards || 0}</div>
            <div className="text-xs text-blue-400 mt-1">cartones activos</div>
          </div>
          
          <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 rounded-xl p-5 border border-green-500/30">
            <div className="text-sm text-green-300 font-medium">💰 Pagos</div>
            <div className="text-3xl font-bold text-white mt-2">{stats.total_paid || 0}</div>
            <div className="text-xs text-green-400 mt-1">
              {stats.total_cards > 0 ? Math.round((stats.total_paid / stats.total_cards) * 100) : 0}% del total
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 rounded-xl p-5 border border-yellow-500/30">
            <div className="text-sm text-yellow-300 font-medium">🎁 Gratis</div>
            <div className="text-3xl font-bold text-white mt-2">{stats.total_free || 0}</div>
            <div className="text-xs text-yellow-400 mt-1">
              {stats.global_free_percentage || 0}% del total
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 rounded-xl p-5 border border-purple-500/30">
            <div className="text-sm text-purple-300 font-medium">✅ Cumplimiento</div>
            <div className="text-3xl font-bold text-white mt-2">{stats.compliance_rate || 0}%</div>
            <div className="text-xs text-purple-400 mt-1">
              {stats.users_with_alerts || 0} usuario(s) con alerta
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 rounded-xl p-5 border border-blue-500/30">
            <div className="text-sm text-blue-300 font-medium">Total Red</div>
            <div className="text-3xl font-bold text-white mt-2">{stats.total_cards || 0}</div>
            <div className="text-xs text-blue-400 mt-1">cartones activos</div>
          </div>
          
          <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 rounded-xl p-5 border border-green-500/30">
            <div className="text-sm text-green-300 font-medium">Usuarios Activos</div>
            <div className="text-3xl font-bold text-white mt-2">{inventories.length}</div>
            <div className="text-xs text-green-400 mt-1">con cartones</div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <select
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">Todas las salas</option>
              <option value="bronce">🥉 Bronce</option>
              <option value="plata">🥈 Plata</option>
              <option value="oro">🥇 Oro</option>
            </select>
          </div>

          {role === 'superadmin' && (
            <div className="flex items-center">
              <label className="flex items-center space-x-2 cursor-pointer text-white">
                <input
                  type="checkbox"
                  checked={filterAlert}
                  onChange={(e) => setFilterAlert(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 bg-gray-700 border-gray-600"
                />
                <span className="text-sm">Solo con alerta (&gt;10%)</span>
              </label>
            </div>
          )}
        </div>
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
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  🥉 Bronce
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  🥈 Plata
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  🥇 Oro
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Total
                </th>
                {role === 'superadmin' && (
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Estado
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredInventories.length === 0 ? (
                <tr>
                  <td colSpan={role === 'superadmin' ? 6 : 5} className="px-6 py-8 text-center text-gray-400">
                    No se encontraron usuarios con cartones
                  </td>
                </tr>
              ) : (
                filteredInventories.map((inv) => (
                  <tr key={inv.user_id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{inv.username}</div>
                      <div className="text-xs text-gray-400 capitalize">{inv.role}</div>
                    </td>

                    {role === 'superadmin' ? (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                          {inv.rooms.bronce ? (
                            <div>
                              <div className="font-semibold text-white text-base">
                                {inv.rooms.bronce.total_cards}
                              </div>
                              <div className="text-xs text-gray-400 space-x-2">
                                <span className="text-green-400">💰 {inv.rooms.bronce.normal_cards}</span>
                                <span className="text-yellow-400">🎁 {inv.rooms.bronce.gift_cards}</span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {inv.rooms.bronce.free_percentage}% gratis
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-600">-</span>
                          )}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                          {inv.rooms.plata ? (
                            <div>
                              <div className="font-semibold text-white text-base">
                                {inv.rooms.plata.total_cards}
                              </div>
                              <div className="text-xs text-gray-400 space-x-2">
                                <span className="text-green-400">💰 {inv.rooms.plata.normal_cards}</span>
                                <span className="text-yellow-400">🎁 {inv.rooms.plata.gift_cards}</span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {inv.rooms.plata.free_percentage}% gratis
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-600">-</span>
                          )}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                          {inv.rooms.oro ? (
                            <div>
                              <div className="font-semibold text-white text-base">
                                {inv.rooms.oro.total_cards}
                              </div>
                              <div className="text-xs text-gray-400 space-x-2">
                                <span className="text-green-400">💰 {inv.rooms.oro.normal_cards}</span>
                                <span className="text-yellow-400">🎁 {inv.rooms.oro.gift_cards}</span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {inv.rooms.oro.free_percentage}% gratis
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-600">-</span>
                          )}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-lg font-bold text-green-400">{inv.total_all}</div>
                          <div className="text-xs text-gray-400 space-x-2">
                            <span className="text-green-400">💰 {inv.total_paid}</span>
                            <span className="text-yellow-400">🎁 {inv.total_free}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            getAlertLevel(inv.avg_free_percentage) === 'ok'
                              ? 'bg-green-900/30 text-green-300 border border-green-500/30'
                              : getAlertLevel(inv.avg_free_percentage) === 'warning'
                              ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-500/30'
                              : 'bg-red-900/30 text-red-300 border border-red-500/30'
                          }`}>
                            {getAlertIcon(inv.avg_free_percentage)} {inv.avg_free_percentage}%
                          </span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-base font-semibold text-white">
                          {inv.rooms.bronce?.total_cards || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-base font-semibold text-white">
                          {inv.rooms.plata?.total_cards || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-base font-semibold text-white">
                          {inv.rooms.oro?.total_cards || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-lg font-bold text-green-400">
                          {inv.total_all}
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center text-sm text-gray-400">
        <div>
          Mostrando {filteredInventories.length} de {inventories.length} usuarios
        </div>
      </div>
    </div>
  );
}
