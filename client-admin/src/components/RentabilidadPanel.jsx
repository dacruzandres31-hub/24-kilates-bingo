// ============================================
// COMPONENTE: DASHBOARD DE RENTABILIDAD (GGR)
// ============================================
// Visualización de "Real Money In" vs "Real Money Out"
// Calcula la ganancia neta real del negocio.

import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
    AreaChart, Area
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function RentabilidadPanel() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState('month'); // today, week, month, year
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    useEffect(() => {
        fetchGGR();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [range]);

    const fetchGGR = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('adminToken');

            let query = '';
            if (range === 'custom' && customStart && customEnd) {
                query = `?startDate=${customStart}&endDate=${customEnd}`;
            } else {
                // Simple logic for predefined ranges, ideally handled by backend or defined dates here
                // For now, let's rely on backend defaults or basic params
                const now = new Date();
                let start = new Date();

                if (range === 'today') {
                    // start is today 00:00
                    start.setHours(0, 0, 0, 0);
                } else if (range === 'week') {
                    start.setDate(now.getDate() - 7);
                } else if (range === 'month') {
                    start.setDate(1); // First day of current month
                }

                query = `?startDate=${start.toISOString().split('T')[0]}&endDate=${now.toISOString().split('T')[0]}`;
            }

            const res = await axios.get(`${API_URL}/api/admin/finances/ggr${query}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                setData(res.data.data);
            }
        } catch (err) {
            console.error('Error loading GGR:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatMoney = (val) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0
        }).format(val || 0);
    };

    if (loading) return <div className="p-8 text-center text-gray-400">Cargando métricas de rentabilidad...</div>;
    if (!data) return <div className="p-8 text-center text-red-400">Error cargando datos.</div>;

    const { metrics, breakdown } = data;

    const chartData = [
        { name: 'Ventas Cartones', value: breakdown.sales, type: 'in' },
        { name: 'Cargas Manuales', value: breakdown.manualLoads, type: 'in' },
        { name: 'Retiros Pagados', value: breakdown.withdrawals, type: 'out' },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                <div>
                    <h2 className="text-xl font-bold text-white">📈 Rentabilidad Real (GGR)</h2>
                    <p className="text-xs text-gray-400">Dinero que entra vs Dinero que sale del sistema</p>
                </div>

                <div className="flex bg-gray-800 rounded-lg p-1">
                    {['today', 'week', 'month'].map(r => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            className={`px-4 py-1.5 text-sm rounded transition ${range === r ? 'bg-gold-500 text-black font-bold' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            {r === 'today' ? 'Hoy' : r === 'week' ? '7 Días' : 'Este Mes'}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* IN */}
                <div className="bg-emerald-900/20 border border-emerald-800 p-4 rounded-lg">
                    <div className="text-emerald-500 text-sm font-bold uppercase mb-1">Total Ingresos (In)</div>
                    <div className="text-3xl font-bold text-white tracking-tight">{formatMoney(metrics.totalIn)}</div>
                    <div className="text-xs text-emerald-400/60 mt-2">Ventas: {formatMoney(breakdown.sales)}</div>
                </div>

                {/* OUT */}
                <div className="bg-red-900/20 border border-red-800 p-4 rounded-lg">
                    <div className="text-red-500 text-sm font-bold uppercase mb-1">Total Pagos (Out)</div>
                    <div className="text-3xl font-bold text-white tracking-tight">{formatMoney(metrics.totalOut)}</div>
                    <div className="text-xs text-red-400/60 mt-2">Retiros completados</div>
                </div>

                {/* GGR */}
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-lg border border-gold-500/30 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">💰</div>
                    <div className="text-gold-400 text-sm font-bold uppercase mb-1">GGR (Ganancia Neta)</div>
                    <div className={`text-4xl font-black tracking-tight ${metrics.ggr >= 0 ? 'text-white' : 'text-red-400'}`}>
                        {formatMoney(metrics.ggr)}
                    </div>
                    <div className="text-xs text-gray-400 mt-2">
                        Margen Real: <span className={metrics.margin > 20 ? 'text-green-400' : 'text-yellow-400'}>{metrics.margin}%</span>
                    </div>
                </div>

                {/* Liability */}
                <div className="bg-blue-900/10 border border-blue-900/50 p-4 rounded-lg">
                    <div className="text-blue-400 text-sm font-bold uppercase mb-1">Pasivo Circulante</div>
                    <div className="text-2xl font-bold text-white">{formatMoney(metrics.currentLiability)}</div>
                    <div className="text-xs text-blue-300/50 mt-2">Saldo en cuentas de jugadores</div>
                </div>
            </div>

            {/* Visual Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart: Waterflow equivalent */}
                <div className="bg-gray-900/50 border border-gray-700 p-6 rounded-lg">
                    <h3 className="text-white font-bold mb-4">Flujo de Caja</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val / 1000}k`} />
                                <Tooltip
                                    cursor={{ fill: '#ffffff10' }}
                                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                                    formatter={(val) => formatMoney(val)}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.type === 'in' ? '#10b981' : '#ef4444'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Explanation */}
                <div className="bg-gray-800/30 p-6 rounded-lg border border-gray-700 flex flex-col justify-center">
                    <h3 className="text-white font-bold mb-2">Entendiendo el GGR</h3>
                    <div className="space-y-4 text-sm text-gray-300">
                        <p>
                            El <strong className="text-gold-400">Gross Gaming Revenue (GGR)</strong> representa la utilidad real generada por las operaciones de juego antes de gastos operativos (servidores, nómina, etc).
                        </p>
                        <div className="bg-gray-900 p-4 rounded border border-gray-600 font-mono text-xs">
                            GGR = (Ventas Cartones + Cargas) - Retiros Pagados
                        </div>
                        <ul className="list-disc pl-5 space-y-1 text-gray-400">
                            <li>No incluye "Premios" que se re-apuestan (son crédito interno).</li>
                            <li>Solo considera dinero que efectivamente <strong>entra</strong> o <strong>sale</strong> de la caja.</li>
                            <li>El <strong>Pasivo Circulante</strong> es dinero que "debemos" a los jugadores (sus saldos actuales). Si todos retiraran hoy, ese sería el costo.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
