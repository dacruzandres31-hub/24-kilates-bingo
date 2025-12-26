import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, TrendingUp, List, Calendar, Filter } from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

export default function PotHistoryModal({ room, onClose }) {
    const [activeTab, setActiveTab] = useState('chart'); // chart | list
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(7);

    useEffect(() => {
        fetchData();
    }, [room, days]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('adminToken');

            const [historyRes, statsRes] = await Promise.all([
                axios.get(`/api/admin/pot-history/${room}?days=${days}`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get(`/api/admin/pot-stats/${room}?days=${days}`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            setHistory(historyRes.data.history);
            setStats(statsRes.data.stats);
        } catch (error) {
            console.error('Error fetching pot history:', error);
        } finally {
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

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('es-CO', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">

                {/* Header */}
                <div className="p-6 border-b border-gray-700 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <TrendingUp className="text-purple-400" />
                            Historial de Pozos - Sala {room.charAt(0).toUpperCase() + room.slice(1)}
                        </h2>
                        <p className="text-gray-400 text-sm mt-1">Evolución y movimientos de los acumulados</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="text-gray-400 hover:text-white" />
                    </button>
                </div>

                {/* Controls */}
                <div className="p-4 bg-gray-800/50 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700">
                        <button
                            onClick={() => setActiveTab('chart')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'chart'
                                    ? 'bg-purple-600 text-white shadow-lg'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <TrendingUp size={16} />
                                Gráfico
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('list')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'list'
                                    ? 'bg-purple-600 text-white shadow-lg'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <List size={16} />
                                Listado
                            </div>
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400 flex items-center gap-2">
                            <Filter size={14} />
                            Rango:
                        </span>
                        <select
                            value={days}
                            onChange={(e) => setDays(e.target.value)}
                            className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-purple-500"
                        >
                            <option value="1">Últimas 24h</option>
                            <option value="3">Últimos 3 días</option>
                            <option value="7">Última semana</option>
                            <option value="30">Último mes</option>
                        </select>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
                        </div>
                    ) : (
                        <>
                            {/* VISTA GRÁFICO */}
                            {activeTab === 'chart' && (
                                <div className="h-[500px] w-full bg-gray-800/30 rounded-xl p-4 border border-gray-700">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={stats}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                            <XAxis
                                                dataKey="hour"
                                                stroke="#9CA3AF"
                                                tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
                                            />
                                            <YAxis stroke="#9CA3AF" tickFormatter={(val) => `$${val / 1000}k`} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                                                formatter={(value) => [formatMoney(value), '']}
                                                labelFormatter={(label) => new Date(label).toLocaleString()}
                                            />
                                            <Legend />
                                            <Line
                                                type="monotone"
                                                dataKey="max_pre40"
                                                name="Pre-40 Jackpot"
                                                stroke="#FBBF24"
                                                strokeWidth={3}
                                                dot={false}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="avg_bingo"
                                                name="Pozo Bingo (Avg)"
                                                stroke="#34D399"
                                                strokeWidth={2}
                                                dot={false}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="avg_linea"
                                                name="Pozo Línea (Avg)"
                                                stroke="#60A5FA"
                                                strokeWidth={2}
                                                dot={false}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {/* VISTA LISTADO */}
                            {activeTab === 'list' && (
                                <div className="overflow-x-auto rounded-xl border border-gray-700">
                                    <table className="w-full text-left text-sm text-gray-400">
                                        <thead className="bg-gray-800 text-gray-200 uppercase font-medium">
                                            <tr>
                                                <th className="px-6 py-3">Fecha</th>
                                                <th className="px-6 py-3">Tipo</th>
                                                <th className="px-6 py-3 text-right">Línea</th>
                                                <th className="px-6 py-3 text-right">Bingo</th>
                                                <th className="px-6 py-3 text-right">Pre-40</th>
                                                <th className="px-6 py-3">Jugador / Evento</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-700 bg-gray-900/50">
                                            {history.map((item) => (
                                                <tr key={item.id} className="hover:bg-gray-800/50 transition-colors">
                                                    <td className="px-6 py-4 font-mono text-xs">
                                                        {formatDate(item.created_at)}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.type === 'purchase' ? 'bg-green-500/10 text-green-400' :
                                                                item.type === 'win' ? 'bg-red-500/10 text-red-400' :
                                                                    'bg-blue-500/10 text-blue-400'
                                                            }`}>
                                                            {item.type === 'purchase' ? 'Compra' :
                                                                item.type === 'win' ? 'Premio' :
                                                                    item.type === 'reset' ? 'Reinicio' : item.type}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-medium text-blue-300">
                                                        {formatMoney(item.jackpot_linea)}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-medium text-green-300">
                                                        {formatMoney(item.jackpot_bingo)}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-medium text-yellow-300">
                                                        {formatMoney(item.jackpot_pre40)}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {item.player_name ? (
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs">
                                                                    {item.player_name[0]}
                                                                </div>
                                                                <span className="text-white">{item.player_name}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-500 italic">Sistema</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {history.length === 0 && (
                                        <div className="p-8 text-center text-gray-500">
                                            No hay registros en el rango seleccionado
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
