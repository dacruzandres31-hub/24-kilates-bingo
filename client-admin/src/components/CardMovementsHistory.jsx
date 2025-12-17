import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  History, 
  RefreshCw, 
  Search, 
  AlertCircle,
  Filter
} from 'lucide-react';

export default function CardMovementsHistory() {
  const [movements, setMovements] = useState([]);
  const [total, setTotal] = useState(0);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros
  const [searchUser, setSearchUser] = useState('');
  const [filterRoom, setFilterRoom] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterCardType, setFilterCardType] = useState('all'); // solo superadmin
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Paginación
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchMovements();
  }, [offset, limit]);

  const getToken = () => localStorage.getItem('adminToken');

  const fetchMovements = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (searchUser) params.append('user_id', searchUser);
      if (filterRoom !== 'all') params.append('room', filterRoom);
      if (filterType !== 'all') params.append('movement_type', filterType);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);

      const response = await axios.get(
        `/api/admin/cards/all-movements?${params.toString()}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      setMovements(response.data.movements || []);
      setTotal(response.data.total || 0);
      setRole(response.data.role);
      setError(null);
    } catch (err) {
      console.error('Error fetching movements:', err);
      setError(err.response?.data?.error || 'Error al cargar historial');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    setOffset(0);
    setCurrentPage(1);
    fetchMovements();
  };

  const handleClearFilters = () => {
    setSearchUser('');
    setFilterRoom('all');
    setFilterType('all');
    setFilterCardType('all');
    setDateFrom('');
    setDateTo('');
    setOffset(0);
    setCurrentPage(1);
    fetchMovements();
  };

  const handlePageChange = (direction) => {
    if (direction === 'next' && offset + limit < total) {
      setOffset(offset + limit);
      setCurrentPage(currentPage + 1);
    } else if (direction === 'prev' && offset > 0) {
      setOffset(Math.max(0, offset - limit));
      setCurrentPage(currentPage - 1);
    }
  };

  const getMovementTypeLabel = (type) => {
    const labels = {
      credit: 'Acreditado',
      debit: 'Descontado',
      transfer_send: 'Transferido (enviado)',
      transfer_receive: 'Transferido (recibido)',
      refund: 'Devolución',
      expired: 'Expirado',
    };
    return labels[type] || type;
  };

  const getMovementTypeColor = (type) => {
    const colors = {
      credit: 'text-green-300 bg-green-900/30 border border-green-500/30',
      debit: 'text-red-300 bg-red-900/30 border border-red-500/30',
      transfer_send: 'text-orange-300 bg-orange-900/30 border border-orange-500/30',
      transfer_receive: 'text-blue-300 bg-blue-900/30 border border-blue-500/30',
      refund: 'text-purple-300 bg-purple-900/30 border border-purple-500/30',
      expired: 'text-gray-400 bg-gray-800/30 border border-gray-600/30',
    };
    return colors[type] || 'text-gray-400 bg-gray-800/30 border border-gray-600/30';
  };

  const getRoomBadge = (room) => {
    const badges = {
      bronce: 'bg-orange-900/30 text-orange-300 border border-orange-500/30',
      plata: 'bg-gray-700/50 text-gray-300 border border-gray-500/30',
      oro: 'bg-yellow-900/30 text-yellow-300 border border-yellow-500/30',
    };
    return badges[room] || 'bg-gray-700/50 text-gray-400 border border-gray-600/30';
  };

  // Filtrar por tipo de cartón localmente (solo superadmin)
  const filteredMovements = role === 'superadmin' && filterCardType !== 'all'
    ? movements.filter(m => {
        if (filterCardType === 'paid') return m.is_gift === 0;
        if (filterCardType === 'free') return m.is_gift === 1;
        return true;
      })
    : movements;

  const totalPages = Math.ceil(total / limit);

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
          onClick={fetchMovements}
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
          <History className="w-8 h-8 text-purple-400" />
          Historial de Movimientos
        </h2>
        <button
          onClick={fetchMovements}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refrescar
        </button>
      </div>

      {/* Estadísticas del período */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 rounded-xl p-5 border border-blue-500/30">
          <div className="text-sm text-blue-300 font-medium">Total Movimientos</div>
          <div className="text-3xl font-bold text-white mt-2">{total}</div>
          <div className="text-xs text-blue-400 mt-1">en este período</div>
        </div>
        
        <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 rounded-xl p-5 border border-green-500/30">
          <div className="text-sm text-green-300 font-medium">✅ Acreditados</div>
          <div className="text-3xl font-bold text-white mt-2">
            {filteredMovements.filter(m => m.movement_type === 'credit').length}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-red-900/40 to-red-800/20 rounded-xl p-5 border border-red-500/30">
          <div className="text-sm text-red-300 font-medium">❌ Descontados</div>
          <div className="text-3xl font-bold text-white mt-2">
            {filteredMovements.filter(m => m.movement_type === 'debit').length}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 rounded-xl p-5 border border-purple-500/30">
          <div className="text-sm text-purple-300 font-medium">🔄 Transferencias</div>
          <div className="text-3xl font-bold text-white mt-2">
            {filteredMovements.filter(m => m.movement_type.includes('transfer')).length}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-5">
        <div className="flex items-center gap-2 mb-4 text-white">
          <Filter className="w-5 h-5 text-purple-400" />
          <span className="font-medium">Filtros</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Usuario (ID)
            </label>
            <input
              type="text"
              placeholder="ID del usuario..."
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Sala
            </label>
            <select
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">Todas</option>
              <option value="bronce">🥉 Bronce</option>
              <option value="plata">🥈 Plata</option>
              <option value="oro">🥇 Oro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tipo de Movimiento
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">Todos</option>
              <option value="credit">Acreditado</option>
              <option value="debit">Descontado</option>
              <option value="transfer_send">Transferido (enviado)</option>
              <option value="transfer_receive">Transferido (recibido)</option>
              <option value="refund">Devolución</option>
              <option value="expired">Expirado</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Fecha Desde
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Fecha Hasta
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {role === 'superadmin' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tipo de Cartón
              </label>
              <select
                value={filterCardType}
                onChange={(e) => setFilterCardType(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">Todos</option>
                <option value="paid">💰 Solo Pagos</option>
                <option value="free">🎁 Solo Gratis</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2">
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Limpiar
          </button>
          <button
            onClick={handleApplyFilters}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Aplicar Filtros
          </button>
        </div>
      </div>

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
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Movimiento
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Sala
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Cantidad
                </th>
                {role === 'superadmin' && (
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Tipo
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Detalle
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={role === 'superadmin' ? 7 : 6} className="px-6 py-8 text-center text-gray-400">
                    No se encontraron movimientos
                  </td>
                </tr>
              ) : (
                filteredMovements.map((mov, idx) => (
                  <tr key={idx} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {new Date(mov.created_at).toLocaleString('es-AR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">
                        {mov.username || `User #${mov.user_id}`}
                      </div>
                      <div className="text-xs text-gray-400">ID: {mov.user_id}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        getMovementTypeColor(mov.movement_type)
                      }`}>
                        {getMovementTypeLabel(mov.movement_type)}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase ${
                        getRoomBadge(mov.room)
                      }`}>
                        {mov.room}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-white">
                      {mov.quantity > 0 ? '+' : ''}{mov.quantity}
                    </td>

                    {role === 'superadmin' && (
                      <td className="px-6 py-4 whitespace-nowrap text-center text-xl">
                        {mov.is_gift === 1 ? '🎁' : '💰'}
                      </td>
                    )}

                    <td className="px-6 py-4 text-sm text-gray-300 max-w-xs truncate">
                      {mov.description || '-'}
                      {mov.from_user_id && (
                        <div className="text-xs text-gray-500">
                          De: {mov.from_username || `User #${mov.from_user_id}`}
                        </div>
                      )}
                      {mov.to_user_id && (
                        <div className="text-xs text-gray-500">
                          A: {mov.to_username || `User #${mov.to_user_id}`}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-400">
          Mostrando {offset + 1} - {Math.min(offset + limit, total)} de {total} movimientos
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => handlePageChange('prev')}
            disabled={offset === 0}
            className={`px-4 py-2 border rounded-lg transition-colors ${
              offset === 0
                ? 'border-gray-700 text-gray-600 cursor-not-allowed'
                : 'border-gray-600 text-gray-300 hover:bg-gray-700'
            }`}
          >
            ← Anterior
          </button>

          <div className="px-4 py-2 border border-gray-600 rounded-lg text-sm text-white">
            Página {currentPage} de {totalPages || 1}
          </div>

          <button
            onClick={() => handlePageChange('next')}
            disabled={offset + limit >= total}
            className={`px-4 py-2 border rounded-lg transition-colors ${
              offset + limit >= total
                ? 'border-gray-700 text-gray-600 cursor-not-allowed'
                : 'border-gray-600 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Siguiente →
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-400">
            Por página:
          </label>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setOffset(0);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>
    </div>
  );
}
