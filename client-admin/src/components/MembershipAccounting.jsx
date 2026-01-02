import { useState, useEffect } from 'react';
import axios from 'axios';

export default function MembershipAccounting() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('summary');

    useEffect(() => {
        fetchAccountingData();
        const interval = setInterval(fetchAccountingData, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const fetchAccountingData = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await axios.get('/api/admin/memberships/accounting', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(response.data.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching membership accounting:', error);
            setLoading(false);
        }
    };

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('es-AR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-white text-xl">Cargando contabilidad...</div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-red-400 text-xl">Error al cargar datos</div>
            </div>
        );
    }

    const { financialSummary, subscriptionStats, pendingApprovals, historical } = data;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600">
                    💎 Contabilidad de Membresías
                </h2>
                <button
                    onClick={fetchAccountingData}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition-all shadow-lg"
                >
                    🔄 Actualizar
                </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 border-b border-gray-700">
                {[
                    { id: 'summary', label: '📊 Resumen', icon: '💰' },
                    { id: 'subscriptions', label: '👥 Suscripciones', icon: '📋' },
                    { id: 'pending', label: '⏳ Pendientes', icon: '🔔' },
                    { id: 'reports', label: '📈 Reportes', icon: '📊' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-6 py-3 font-semibold transition-all ${activeTab === tab.id
                                ? 'text-yellow-400 border-b-2 border-yellow-400'
                                : 'text-gray-400 hover:text-gray-200'
                            }`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {/* SUMMARY TAB */}
                {activeTab === 'summary' && (
                    <div className="space-y-6">
                        {/* Financial Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Current Month Revenue */}
                            <div className="bg-gradient-to-br from-green-900/40 to-emerald-900/30 border border-green-600/50 rounded-xl p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-green-300 text-sm font-semibold">Ingresos del Mes</span>
                                    <span className="text-2xl">💵</span>
                                </div>
                                <div className="text-3xl font-bold text-white">
                                    {formatMoney(financialSummary.currentMonthRevenue)}
                                </div>
                            </div>

                            {/* MRR */}
                            <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/30 border border-blue-600/50 rounded-xl p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-blue-300 text-sm font-semibold">MRR (Recurrente)</span>
                                    <span className="text-2xl">🔄</span>
                                </div>
                                <div className="text-3xl font-bold text-white">
                                    {formatMoney(financialSummary.mrr)}
                                </div>
                            </div>

                            {/* Total Active */}
                            <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/30 border border-purple-600/50 rounded-xl p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-purple-300 text-sm font-semibold">Suscripciones Activas</span>
                                    <span className="text-2xl">👥</span>
                                </div>
                                <div className="text-3xl font-bold text-white">
                                    {subscriptionStats.totalActive}
                                </div>
                            </div>
                        </div>

                        {/* Revenue by Tier */}
                        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                            <h3 className="text-xl font-bold text-white mb-4">💎 Desglose por Tier</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Bronce */}
                                {financialSummary.revenueByTier.bronce && (
                                    <div className="bg-gradient-to-r from-orange-900/30 to-orange-800/20 border border-orange-700/50 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-orange-300 font-semibold">🥉 Bronce</span>
                                            <span className="text-orange-400 text-sm">{financialSummary.revenueByTier.bronce.count} socios</span>
                                        </div>
                                        <div className="text-2xl font-bold text-white">
                                            {formatMoney(financialSummary.revenueByTier.bronce.revenue)}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            {formatMoney(financialSummary.revenueByTier.bronce.price)}/mes
                                        </div>
                                    </div>
                                )}

                                {/* Plata */}
                                {financialSummary.revenueByTier.plata && (
                                    <div className="bg-gradient-to-r from-gray-700/30 to-gray-600/20 border border-gray-500/50 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-gray-300 font-semibold">🥈 Plata</span>
                                            <span className="text-gray-400 text-sm">{financialSummary.revenueByTier.plata.count} socios</span>
                                        </div>
                                        <div className="text-2xl font-bold text-white">
                                            {formatMoney(financialSummary.revenueByTier.plata.revenue)}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            {formatMoney(financialSummary.revenueByTier.plata.price)}/mes
                                        </div>
                                    </div>
                                )}

                                {/* Oro */}
                                {financialSummary.revenueByTier.oro && (
                                    <div className="bg-gradient-to-r from-yellow-900/30 to-yellow-800/20 border border-yellow-600/50 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-yellow-300 font-semibold">🥇 Oro</span>
                                            <span className="text-yellow-400 text-sm">{financialSummary.revenueByTier.oro.count} socios</span>
                                        </div>
                                        <div className="text-2xl font-bold text-white">
                                            {formatMoney(financialSummary.revenueByTier.oro.revenue)}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            {formatMoney(financialSummary.revenueByTier.oro.price)}/mes
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* SUBSCRIPTIONS TAB */}
                {activeTab === 'subscriptions' && (
                    <div className="space-y-6">
                        {/* Upcoming Renewals */}
                        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                            <h3 className="text-xl font-bold text-white mb-4">🔔 Próximas Renovaciones (7 días)</h3>
                            {subscriptionStats.upcomingRenewals.length > 0 ? (
                                <div className="space-y-2">
                                    {subscriptionStats.upcomingRenewals.map((renewal, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg border border-gray-600/50">
                                            <div className="flex items-center space-x-3">
                                                <span className="text-2xl">👤</span>
                                                <div>
                                                    <p className="text-white font-semibold">{renewal.username}</p>
                                                    <p className="text-gray-400 text-sm">{renewal.tier}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-yellow-400 font-semibold">{renewal.daysUntilRenewal} días</p>
                                                <p className="text-gray-400 text-sm">{formatDate(renewal.renewalDate)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-400 text-center py-4">No hay renovaciones próximas</p>
                            )}
                        </div>

                        {/* Active by Tier */}
                        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                            <h3 className="text-xl font-bold text-white mb-4">📊 Distribución Actual</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-4 bg-orange-900/20 rounded-lg border border-orange-700/50">
                                    <div className="text-3xl mb-2">🥉</div>
                                    <div className="text-2xl font-bold text-orange-300">{subscriptionStats.byTier.bronce || 0}</div>
                                    <div className="text-sm text-gray-400">Bronce</div>
                                </div>
                                <div className="text-center p-4 bg-gray-700/20 rounded-lg border border-gray-500/50">
                                    <div className="text-3xl mb-2">🥈</div>
                                    <div className="text-2xl font-bold text-gray-300">{subscriptionStats.byTier.plata || 0}</div>
                                    <div className="text-sm text-gray-400">Plata</div>
                                </div>
                                <div className="text-center p-4 bg-yellow-900/20 rounded-lg border border-yellow-600/50">
                                    <div className="text-3xl mb-2">🥇</div>
                                    <div className="text-2xl font-bold text-yellow-300">{subscriptionStats.byTier.oro || 0}</div>
                                    <div className="text-sm text-gray-400">Oro</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* PENDING TAB */}
                {activeTab === 'pending' && (
                    <div className="space-y-6">
                        {/* Pending Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gradient-to-br from-yellow-900/40 to-amber-900/30 border border-yellow-600/50 rounded-xl p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-yellow-300 text-sm font-semibold">Solicitudes Pendientes</span>
                                    <span className="text-2xl">⏳</span>
                                </div>
                                <div className="text-3xl font-bold text-white">{pendingApprovals.count}</div>
                            </div>
                            <div className="bg-gradient-to-br from-green-900/40 to-emerald-900/30 border border-green-600/50 rounded-xl p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-green-300 text-sm font-semibold">Valor Total Pendiente</span>
                                    <span className="text-2xl">💰</span>
                                </div>
                                <div className="text-3xl font-bold text-white">{formatMoney(pendingApprovals.totalValue)}</div>
                            </div>
                        </div>

                        {/* Pending List */}
                        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                            <h3 className="text-xl font-bold text-white mb-4">📋 Detalle de Pendientes</h3>
                            {pendingApprovals.requests.length > 0 ? (
                                <div className="space-y-2">
                                    {pendingApprovals.requests.map((req) => (
                                        <div key={req.id} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg border border-gray-600/50">
                                            <div className="flex items-center space-x-3">
                                                <span className="text-2xl">👤</span>
                                                <div>
                                                    <p className="text-white font-semibold">{req.username}</p>
                                                    <p className="text-gray-400 text-sm">{req.planName}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-green-400 font-bold text-lg">{formatMoney(req.amount)}</p>
                                                <p className="text-gray-400 text-xs">{formatDate(req.createdAt)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-400 text-center py-8">✅ No hay solicitudes pendientes</p>
                            )}
                        </div>
                    </div>
                )}

                {/* REPORTS TAB */}
                {activeTab === 'reports' && (
                    <div className="space-y-6">
                        {/* Renewal Rate */}
                        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                            <h3 className="text-xl font-bold text-white mb-4">📊 Tasa de Renovación</h3>
                            <div className="flex items-center justify-center">
                                <div className="text-center">
                                    <div className="text-6xl font-bold text-green-400">{historical.renewalRate}%</div>
                                    <p className="text-gray-400 mt-2">Últimos 30 días</p>
                                </div>
                            </div>
                        </div>

                        {/* Monthly Revenue Chart */}
                        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                            <h3 className="text-xl font-bold text-white mb-4">📈 Ingresos Mensuales (Últimos 6 meses)</h3>
                            {historical.monthlyRevenue.length > 0 ? (
                                <div className="space-y-2">
                                    {historical.monthlyRevenue.map((month, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                                            <span className="text-gray-300 font-semibold">{month.month}</span>
                                            <div className="flex items-center space-x-4">
                                                <span className="text-gray-400 text-sm">{month.count} suscripciones</span>
                                                <span className="text-green-400 font-bold">{formatMoney(month.revenue)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-400 text-center py-4">No hay datos históricos disponibles</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
