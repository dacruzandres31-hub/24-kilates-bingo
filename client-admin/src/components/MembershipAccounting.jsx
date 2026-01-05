import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

export default function MembershipAccounting() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('summary');
    
    // Estado para edición de precios
    const [memberships, setMemberships] = useState([]);
    const [editingPrices, setEditingPrices] = useState({});
    const [savingPrice, setSavingPrice] = useState(null);

    // Estado para gestión de membresías activas
    const [activeUsers, setActiveUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSubscription, setSelectedSubscription] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchAccountingData();
        fetchMemberships();
        fetchActiveUsers();
        
        // Socket.IO para actualizaciones en tiempo real
        const socket = io(import.meta.env.VITE_API_URL || window.location.origin);
        
        // Escuchar nuevas solicitudes de depósito/membresía
        socket.on('deposit_request_created', (data) => {
            console.log('📩 Nueva solicitud recibida:', data);
            if (data.requestType === 'membership_purchase') {
                fetchAccountingData(); // Refrescar datos
            }
        });
        
        // Escuchar cuando una solicitud es procesada
        socket.on('deposit_request_processed', (data) => {
            console.log('✅ Solicitud procesada:', data);
            if (data.requestType === 'membership_purchase') {
                fetchAccountingData();
                fetchActiveUsers();
            }
        });
        
        const interval = setInterval(fetchAccountingData, 30000); // Refresh every 30s como backup
        
        return () => {
            clearInterval(interval);
            socket.off('deposit_request_created');
            socket.off('deposit_request_processed');
            socket.disconnect();
        };
    }, []);

    const fetchActiveUsers = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await axios.get('/api/admin/memberships/active-users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setActiveUsers(response.data.data || []);
        } catch (error) {
            console.error('Error fetching active users:', error);
        }
    };

    const handleRenewMembership = async (subscriptionId) => {
        if (!confirm('¿Confirmar renovación por 1 mes adicional?')) return;
        
        try {
            setActionLoading(true);
            const token = localStorage.getItem('adminToken');
            const response = await axios.post(`/api/admin/memberships/subscriptions/${subscriptionId}/renew`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(`✅ ${response.data.message}`);
            setSelectedSubscription(null);
            fetchActiveUsers();
            fetchAccountingData();
        } catch (error) {
            alert('❌ Error: ' + (error.response?.data?.error || error.message));
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteMembership = async (subscriptionId, username) => {
        if (!confirm(`⚠️ ¿Estás seguro de ELIMINAR la membresía de ${username}?\n\nEsta acción no se puede deshacer.`)) return;
        
        try {
            setActionLoading(true);
            const token = localStorage.getItem('adminToken');
            const response = await axios.delete(`/api/admin/memberships/subscriptions/${subscriptionId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(`✅ ${response.data.message}`);
            setSelectedSubscription(null);
            fetchActiveUsers();
            fetchAccountingData();
        } catch (error) {
            alert('❌ Error: ' + (error.response?.data?.error || error.message));
        } finally {
            setActionLoading(false);
        }
    };

    // Filtrar usuarios por búsqueda (nueva estructura agrupada)
    const filteredUsers = activeUsers.filter(user => 
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.subscriptions?.some(sub => sub.plan_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const fetchMemberships = async () => {
        try {
            const response = await axios.get('/api/memberships');
            setMemberships(response.data || []);
            // Inicializar precios editables
            const prices = {};
            response.data.forEach(m => {
                prices[m.id] = parseFloat(m.price);
            });
            setEditingPrices(prices);
        } catch (error) {
            console.error('Error fetching memberships:', error);
        }
    };

    const handlePriceChange = (id, value) => {
        setEditingPrices(prev => ({
            ...prev,
            [id]: value
        }));
    };

    const savePrice = async (membershipId) => {
        try {
            setSavingPrice(membershipId);
            const token = localStorage.getItem('adminToken');
            await axios.put(`/api/admin/memberships/${membershipId}/price`, 
                { price: parseFloat(editingPrices[membershipId]) },
                { headers: { Authorization: `Bearer ${token}` }}
            );
            alert('✅ Precio actualizado correctamente');
            fetchMemberships();
        } catch (error) {
            console.error('Error updating price:', error);
            alert('❌ Error al actualizar precio: ' + (error.response?.data?.error || error.message));
        } finally {
            setSavingPrice(null);
        }
    };

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
            <div className="flex flex-wrap gap-2 border-b border-gray-700 pb-2">
                {[
                    { id: 'summary', label: 'Resumen', icon: '📊' },
                    { id: 'subscriptions', label: 'Suscripciones', icon: '👥' },
                    { id: 'manage', label: 'Gestionar', icon: '⚙️' },
                    { id: 'pending', label: 'Pendientes', icon: '⏳' },
                    { id: 'reports', label: 'Reportes', icon: '📈' },
                    { id: 'prices', label: 'Valor Membresías', icon: '💎' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 font-semibold rounded-t-lg transition-all ${activeTab === tab.id
                                ? 'text-yellow-400 bg-gray-800 border-b-2 border-yellow-400'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
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
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {/* Embajador */}
                                {financialSummary.revenueByTier.embajador && (
                                    <div className="bg-gradient-to-r from-emerald-900/30 to-emerald-800/20 border border-emerald-600/50 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-emerald-300 font-semibold">👑 Embajador</span>
                                            <span className="text-emerald-400 text-sm">{financialSummary.revenueByTier.embajador.count} socios</span>
                                        </div>
                                        <div className="text-2xl font-bold text-white">
                                            {formatMoney(financialSummary.revenueByTier.embajador.revenue)}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            {formatMoney(financialSummary.revenueByTier.embajador.price)}/mes
                                        </div>
                                    </div>
                                )}
                                
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
                                                    <p className="text-gray-400 text-sm">{renewal.planName} - {formatMoney(renewal.price)}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-yellow-400 font-semibold">{formatDate(renewal.renewalDate)}</p>
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
                            <div className="grid grid-cols-4 gap-4">
                                <div className="text-center p-4 bg-emerald-900/20 rounded-lg border border-emerald-600/50">
                                    <div className="text-3xl mb-2">👑</div>
                                    <div className="text-2xl font-bold text-emerald-300">{subscriptionStats.byTier?.embajador || 0}</div>
                                    <div className="text-sm text-gray-400">Embajador</div>
                                </div>
                                <div className="text-center p-4 bg-orange-900/20 rounded-lg border border-orange-700/50">
                                    <div className="text-3xl mb-2">🥉</div>
                                    <div className="text-2xl font-bold text-orange-300">{subscriptionStats.byTier?.bronce || 0}</div>
                                    <div className="text-sm text-gray-400">Bronce</div>
                                </div>
                                <div className="text-center p-4 bg-gray-700/20 rounded-lg border border-gray-500/50">
                                    <div className="text-3xl mb-2">🥈</div>
                                    <div className="text-2xl font-bold text-gray-300">{subscriptionStats.byTier?.plata || 0}</div>
                                    <div className="text-sm text-gray-400">Plata</div>
                                </div>
                                <div className="text-center p-4 bg-yellow-900/20 rounded-lg border border-yellow-600/50">
                                    <div className="text-3xl mb-2">🥇</div>
                                    <div className="text-2xl font-bold text-yellow-300">{subscriptionStats.byTier?.oro || 0}</div>
                                    <div className="text-sm text-gray-400">Oro</div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Lista de Suscripciones Activas */}
                        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                            <h3 className="text-xl font-bold text-white mb-4">📋 Suscripciones Activas</h3>
                            {subscriptionStats.activeSubscriptions && subscriptionStats.activeSubscriptions.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-gray-600">
                                                <th className="text-left py-3 px-4 text-gray-400 font-semibold">Usuario</th>
                                                <th className="text-left py-3 px-4 text-gray-400 font-semibold">Plan</th>
                                                <th className="text-right py-3 px-4 text-gray-400 font-semibold">Precio</th>
                                                <th className="text-center py-3 px-4 text-gray-400 font-semibold">Auto-Renovar</th>
                                                <th className="text-right py-3 px-4 text-gray-400 font-semibold">Próx. Cobro</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {subscriptionStats.activeSubscriptions.map((sub, idx) => (
                                                <tr key={sub.id || idx} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                                                    <td className="py-3 px-4 text-white font-medium">{sub.username}</td>
                                                    <td className="py-3 px-4">
                                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                                            sub.planName?.toLowerCase().includes('oro') ? 'bg-yellow-900/50 text-yellow-300' :
                                                            sub.planName?.toLowerCase().includes('plata') ? 'bg-gray-600/50 text-gray-200' :
                                                            sub.planName?.toLowerCase().includes('bronce') ? 'bg-orange-900/50 text-orange-300' :
                                                            sub.planName?.toLowerCase().includes('embajador') ? 'bg-emerald-900/50 text-emerald-300' :
                                                            'bg-gray-700 text-gray-300'
                                                        }`}>
                                                            {sub.planName}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-green-400 font-semibold">{formatMoney(sub.price)}</td>
                                                    <td className="py-3 px-4 text-center">
                                                        {sub.autoRenew ? (
                                                            <span className="text-green-400">✅</span>
                                                        ) : (
                                                            <span className="text-red-400">❌</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-gray-400">{formatDate(sub.nextBillingDate)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-gray-400 text-center py-8">No hay suscripciones activas</p>
                            )}
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
                                                <p className="text-green-400 font-bold text-lg">{formatMoney(req.amountDeclared)}</p>
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

                {/* PRICES TAB - Solo Andy */}
                {activeTab === 'prices' && (
                    <div className="space-y-6">
                        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-yellow-600/50">
                            <h3 className="text-xl font-bold text-yellow-400 mb-6">💎 Configurar Precios de Membresías</h3>
                            <p className="text-gray-400 mb-6">Los cambios se aplicarán inmediatamente a nuevas compras.</p>
                            
                            <div className="space-y-4">
                                {memberships.map(membership => (
                                    <div key={membership.id} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-xl border border-gray-600">
                                        <div className="flex items-center space-x-4">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                                                membership.name.includes('Embajador') ? 'bg-gradient-to-r from-purple-600 to-pink-600' :
                                                membership.name.includes('Bronce') ? 'bg-gradient-to-r from-amber-700 to-amber-900' :
                                                membership.name.includes('Plata') ? 'bg-gradient-to-r from-gray-400 to-gray-600' :
                                                'bg-gradient-to-r from-yellow-500 to-amber-600'
                                            }`}>
                                                {membership.name.includes('Embajador') ? '👑' :
                                                 membership.name.includes('Bronce') ? '🥉' :
                                                 membership.name.includes('Plata') ? '🥈' : '🥇'}
                                            </div>
                                            <div>
                                                <h4 className="text-white font-bold">{membership.name}</h4>
                                                <p className="text-gray-400 text-sm">Precio actual: {formatMoney(membership.price)}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center space-x-3">
                                            <div className="flex items-center bg-gray-800 rounded-lg px-3 py-2 border border-gray-600">
                                                <span className="text-green-400 font-bold mr-2">$</span>
                                                <input
                                                    type="number"
                                                    value={editingPrices[membership.id] || ''}
                                                    onChange={(e) => handlePriceChange(membership.id, e.target.value)}
                                                    className="w-28 bg-transparent text-white text-right font-bold focus:outline-none"
                                                    step="100"
                                                    min="0"
                                                />
                                                <span className="text-gray-400 ml-2">ARS</span>
                                            </div>
                                            <button
                                                onClick={() => savePrice(membership.id)}
                                                disabled={savingPrice === membership.id}
                                                className={`px-4 py-2 rounded-lg font-bold transition-all ${
                                                    savingPrice === membership.id
                                                        ? 'bg-gray-600 text-gray-400 cursor-wait'
                                                        : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white'
                                                }`}
                                            >
                                                {savingPrice === membership.id ? '⏳' : '💾 Guardar'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
                                <p className="text-yellow-400 text-sm">
                                    ⚠️ <strong>Nota:</strong> Los cambios de precio solo afectan a nuevas suscripciones. 
                                    Las renovaciones automáticas mantienen el precio original.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* MANAGE TAB - Gestionar membresías activas */}
                {activeTab === 'manage' && (
                    <div className="space-y-6">
                        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-purple-600/50">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-purple-400">⚙️ Gestionar Membresías Activas</h3>
                                <button
                                    onClick={fetchActiveUsers}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all"
                                >
                                    🔄 Actualizar Lista
                                </button>
                            </div>
                            
                            {/* Search Bar */}
                            <div className="mb-6">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="🔍 Buscar por nombre de usuario o membresía..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all"
                                    />
                                    {searchTerm && (
                                        <button
                                            onClick={() => setSearchTerm('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                                <p className="text-gray-500 text-sm mt-2">
                                    Mostrando {filteredUsers.length} de {activeUsers.length} usuarios con membresías activas
                                </p>
                            </div>
                            
                            {/* Users List */}
                            <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                {filteredUsers.length === 0 ? (
                                    <div className="text-center py-10 text-gray-500">
                                        {searchTerm ? '🔍 No se encontraron usuarios con ese criterio' : '📭 No hay membresías activas'}
                                    </div>
                                ) : (
                                    filteredUsers.map(user => (
                                        <div 
                                            key={user.user_id}
                                            className={`p-4 rounded-xl border transition-all cursor-pointer ${
                                                selectedSubscription?.user_id === user.user_id
                                                    ? 'bg-purple-900/40 border-purple-500'
                                                    : 'bg-gray-700/30 border-gray-600 hover:bg-gray-700/50 hover:border-purple-500/50'
                                            }`}
                                            onClick={() => setSelectedSubscription(
                                                selectedSubscription?.user_id === user.user_id ? null : user
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-4">
                                                    {/* Avatar con las membresías */}
                                                    <div className="flex -space-x-2">
                                                        {user.subscriptions.map((sub, idx) => (
                                                            <div 
                                                                key={sub.subscription_id}
                                                                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 border-gray-800 ${
                                                                    sub.plan_name.toLowerCase().includes('embajador') ? 'bg-gradient-to-r from-emerald-600 to-green-600' :
                                                                    sub.plan_name.toLowerCase().includes('bronce') ? 'bg-gradient-to-r from-amber-700 to-amber-900' :
                                                                    sub.plan_name.toLowerCase().includes('plata') ? 'bg-gradient-to-r from-gray-400 to-gray-600' :
                                                                    'bg-gradient-to-r from-yellow-500 to-amber-600'
                                                                }`}
                                                                style={{ zIndex: 10 - idx }}
                                                            >
                                                                {sub.plan_name.toLowerCase().includes('embajador') ? '👑' :
                                                                 sub.plan_name.toLowerCase().includes('bronce') ? '🥉' :
                                                                 sub.plan_name.toLowerCase().includes('plata') ? '🥈' : '🥇'}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-white font-bold">{user.username}</h4>
                                                        <p className="text-gray-400 text-sm">
                                                            {user.subscriptions.length} membresía{user.subscriptions.length > 1 ? 's' : ''} activa{user.subscriptions.length > 1 ? 's' : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center space-x-2">
                                                    {user.subscriptions.map(sub => (
                                                        <span 
                                                            key={sub.subscription_id}
                                                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                                sub.plan_name.toLowerCase().includes('embajador') ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-500/50' :
                                                                sub.plan_name.toLowerCase().includes('bronce') ? 'bg-amber-900/50 text-amber-400 border border-amber-500/50' :
                                                                sub.plan_name.toLowerCase().includes('plata') ? 'bg-gray-700 text-gray-300 border border-gray-500/50' :
                                                                'bg-yellow-900/50 text-yellow-400 border border-yellow-500/50'
                                                            }`}
                                                        >
                                                            {sub.plan_name.replace('Socio ', '')}
                                                        </span>
                                                    ))}
                                                    <span className="text-gray-500 ml-2">▼</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            
                            {/* Action Panel (when user is selected) */}
                            {selectedSubscription && (
                                <div className="mt-6 p-6 bg-gray-900/80 rounded-xl border border-purple-500 animate-in slide-in-from-bottom duration-300">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h4 className="text-white font-bold text-lg">
                                                {selectedSubscription.username}
                                            </h4>
                                            <p className="text-gray-400">
                                                {selectedSubscription.subscriptions.length} membresía{selectedSubscription.subscriptions.length > 1 ? 's' : ''} activa{selectedSubscription.subscriptions.length > 1 ? 's' : ''}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setSelectedSubscription(null)}
                                            className="text-gray-400 hover:text-white text-xl"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    
                                    {/* Lista de membresías del usuario */}
                                    <div className="space-y-3">
                                        {selectedSubscription.subscriptions.map(sub => (
                                            <div 
                                                key={sub.subscription_id}
                                                className={`p-4 rounded-lg border ${
                                                    sub.plan_name.toLowerCase().includes('embajador') ? 'bg-emerald-900/20 border-emerald-600/50' :
                                                    sub.plan_name.toLowerCase().includes('bronce') ? 'bg-amber-900/20 border-amber-600/50' :
                                                    sub.plan_name.toLowerCase().includes('plata') ? 'bg-gray-700/30 border-gray-500/50' :
                                                    'bg-yellow-900/20 border-yellow-600/50'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center space-x-3">
                                                        <span className={`text-2xl`}>
                                                            {sub.plan_name.toLowerCase().includes('embajador') ? '👑' :
                                                             sub.plan_name.toLowerCase().includes('bronce') ? '🥉' :
                                                             sub.plan_name.toLowerCase().includes('plata') ? '🥈' : '🥇'}
                                                        </span>
                                                        <div>
                                                            <h5 className="text-white font-bold">{sub.plan_name}</h5>
                                                            <p className="text-gray-400 text-sm">Vence: {formatDate(sub.next_billing_date)}</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-green-400 font-bold">${parseFloat(sub.price).toLocaleString()}/mes</span>
                                                </div>
                                                
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleRenewMembership(sub.subscription_id); }}
                                                        disabled={actionLoading}
                                                        className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                                                    >
                                                        {actionLoading ? '⏳' : '🔄'} +1 Mes
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteMembership(sub.subscription_id, selectedSubscription.username); }}
                                                        disabled={actionLoading}
                                                        className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                                                    >
                                                        {actionLoading ? '⏳' : '🗑️'} Eliminar
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
