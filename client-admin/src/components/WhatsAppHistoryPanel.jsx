import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Calendar, MessageSquare, CheckCircle2, Clock } from 'lucide-react';

export default function WhatsAppHistoryPanel() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        search: ''
    });

    useEffect(() => {
        fetchHistory();
    }, [filters]); // Reload when filters change

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const queryParams = new URLSearchParams(filters).toString();
            const res = await axios.get(`/api/whatsapp/history?${queryParams}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setHistory(res.data.history);
            }
        } catch (error) {
            console.error('Error fetching WA history:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        setFilters(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    return (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Clock className="w-6 h-6 text-green-400" /> Historial de Envíos WhatsApp
            </h2>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                        type="text"
                        name="search"
                        placeholder="Buscar por usuario..."
                        value={filters.search}
                        onChange={handleFilterChange}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white outline-none focus:ring-2 focus:ring-green-500/50"
                    />
                </div>
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                        type="date"
                        name="startDate"
                        value={filters.startDate}
                        onChange={handleFilterChange}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white outline-none focus:ring-2 focus:ring-green-500/50"
                    />
                </div>
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                        type="date"
                        name="endDate"
                        value={filters.endDate}
                        onChange={handleFilterChange}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white outline-none focus:ring-2 focus:ring-green-500/50"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-700">
                <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 uppercase font-bold text-xs">
                        <tr>
                            <th className="px-4 py-3">Fecha y Hora</th>
                            <th className="px-4 py-3">Destinatario</th>
                            <th className="px-4 py-3">Teléfono</th>
                            <th className="px-4 py-3">ID Transacción</th>
                            <th className="px-4 py-3 text-center">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700 bg-slate-800/50">
                        {loading ? (
                            <tr>
                                <td colSpan="5" className="p-8 text-center text-slate-500">Cargando historial...</td>
                            </tr>
                        ) : history.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="p-8 text-center text-slate-500">No se encontraron envíos registrados.</td>
                            </tr>
                        ) : (
                            history.map(item => (
                                <tr key={item.id} className="hover:bg-slate-700/30 transition-colors">
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        {new Date(item.sent_at).toLocaleString('es-AR')}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-white">
                                        {item.recipient_name}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-slate-400">
                                        {item.phone_sent}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                                        #{item.transaction_id || 'N/A'}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${item.status === 'sent'
                                                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                            }`}>
                                            {item.status === 'sent' ? <CheckCircle2 className="w-3 h-3" /> : 'Error'}
                                            {item.status === 'sent' ? 'Enviado' : 'Falló'}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
