import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { RefreshCw, MessageSquare, Check, X, Bell } from 'lucide-react';

// Traducción de categorías
const categoryLabels = {
    'payment': 'Problema de Pago / Depósito',
    'game_bug': 'Error en el Juego',
    'account': 'Cuenta y Acceso',
    'other': 'Otro'
};

export default function SupportPanel() {
    const [tickets, setTickets] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [ticketMessages, setTicketMessages] = useState([]);
    const [adminReply, setAdminReply] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        fetchTickets();
        const interval = setInterval(fetchTickets, 30000); // 30s auto-refresh
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (selectedTicket) {
            fetchTicketDetails(selectedTicket.id);
            scrollToBottom();
        }
    }, [selectedTicket]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchTickets = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get('/api/support/admin/all', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setTickets(res.data.tickets);
            }
        } catch (err) {
            console.error('Error loading tickets', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchTicketDetails = async (ticketId) => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get(`/api/support/ticket/${ticketId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setTicketMessages(res.data.messages);
                scrollToBottom();
            }
        } catch (err) {
            console.error('Error fetching details', err);
        }
    };

    const handleStatusUpdate = async (ticketId, newStatus, e) => {
        e.stopPropagation(); // prevent opening detail
        try {
            const token = localStorage.getItem('adminToken');
            await axios.put(`/api/support/admin/ticket/${ticketId}/status`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchTickets();
            if (selectedTicket && selectedTicket.id === ticketId) {
                setSelectedTicket(prev => ({ ...prev, status: newStatus }));
            }
        } catch (err) {
            alert('Error updating status');
        }
    };

    const handleReply = async (e) => {
        e.preventDefault();
        if (!adminReply.trim()) return;

        try {
            const token = localStorage.getItem('adminToken');
            await axios.post(`/api/support/ticket/${selectedTicket.id}/reply`, {
                message: adminReply
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setAdminReply('');
            fetchTicketDetails(selectedTicket.id);
            // Optional: Auto-update status to 'in_progress' or 'resolved' could be handled by backend
        } catch (err) {
            console.error('Error sending reply', err);
            alert('Error enviando respuesta');
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">

            {/* TICKET LIST */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-4 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Bell className="w-5 h-5 text-yellow-400" /> Tickets
                    </h2>
                    <button onClick={fetchTickets} className="p-2 bg-gray-700 rounded hover:bg-gray-600 transition">
                        <RefreshCw className="w-4 h-4 text-white" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 space-y-2 pr-2">
                    {tickets.map(ticket => (
                        <div
                            key={ticket.id}
                            onClick={() => setSelectedTicket(ticket)}
                            className={`p-3 rounded-lg cursor-pointer border transition-all ${selectedTicket?.id === ticket.id
                                    ? 'bg-purple-900/40 border-purple-500'
                                    : 'bg-gray-700/30 border-gray-600 hover:bg-gray-700'
                                }`}
                        >
                            <div className="flex justify-between items-start">
                                <span className="font-bold text-gray-200">#{ticket.id} {ticket.subject}</span>
                                <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase
                  ${ticket.status === 'open' ? 'bg-blue-600 text-white' :
                                        ticket.status === 'in_progress' ? 'bg-orange-600 text-white' :
                                            'bg-green-600 text-white'}`
                                }>
                                    {ticket.status === 'open' ? 'ABIERTO' : 
                                     ticket.status === 'in_progress' ? 'EN PROGRESO' : 
                                     ticket.status === 'resolved' ? 'RESUELTO' : 'CERRADO'}
                                </span>
                            </div>
                            <div className="mt-1 flex justify-between items-center text-xs text-gray-400">
                                <span>👤 {ticket.username}</span>
                                <span>{new Date(ticket.updated_at).toLocaleDateString()}</span>
                            </div>
                            <div className="mt-2 flex gap-2">
                                {ticket.status !== 'closed' && (
                                    <button
                                        onClick={(e) => handleStatusUpdate(ticket.id, 'closed', e)}
                                        className="text-xs bg-red-900/50 hover:bg-red-900 text-red-300 px-2 py-1 rounded"
                                    >
                                        Cerrar
                                    </button>
                                )}
                                {ticket.status === 'open' && (
                                    <button
                                        onClick={(e) => handleStatusUpdate(ticket.id, 'in_progress', e)}
                                        className="text-xs bg-yellow-900/50 hover:bg-yellow-900 text-yellow-300 px-2 py-1 rounded"
                                    >
                                        Tomar
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {tickets.length === 0 && <p className="text-gray-500 text-center py-4">No hay tickets.</p>}
                </div>
            </div>

            {/* TICKET DETAIL / CHAT */}
            <div className="lg:col-span-2 bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-4 flex flex-col">
                {selectedTicket ? (
                    <>
                        <div className="border-b border-gray-700 pb-3 mb-3 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-white">#{selectedTicket.id} - {selectedTicket.subject}</h3>
                                <p className="text-sm text-gray-400">
                                    Usuario: <span className="text-purple-400">{selectedTicket.username}</span> |
                                    Categoría: {categoryLabels[selectedTicket.category] || selectedTicket.category}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <select
                                    value={selectedTicket.status}
                                    onChange={(e) => handleStatusUpdate(selectedTicket.id, e.target.value, { stopPropagation: () => { } })}
                                    className="bg-gray-700 text-white text-sm rounded border border-gray-600 p-1"
                                >
                                    <option value="open">Abierto</option>
                                    <option value="in_progress">En Progreso</option>
                                    <option value="resolved">Resuelto</option>
                                    <option value="closed">Cerrado</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-4 p-2 mb-4 bg-gray-900/30 rounded-lg">
                            {ticketMessages.map((msg, idx) => (
                                <div key={idx} className={`flex flex-col ${msg.is_admin ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[80%] rounded-lg p-3 ${msg.is_admin
                                            ? 'bg-purple-900/50 border border-purple-700/50 text-gray-200'
                                            : 'bg-gray-700/50 border border-gray-600/50 text-gray-300'
                                        }`}>
                                        <div className="text-xs font-bold mb-1 opacity-75">
                                            {msg.is_admin ? 'Admin (Tú)' : `Usuario: ${selectedTicket.username}`}
                                        </div>
                                        <p className="whitespace-pre-wrap">{msg.message}</p>
                                        <div className="text-[10px] opacity-50 text-right mt-1">
                                            {new Date(msg.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleReply} className="mt-auto">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={adminReply}
                                    onChange={e => setAdminReply(e.target.value)}
                                    placeholder="Escribe una respuesta para el usuario..."
                                    className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                />
                                <button
                                    type="submit"
                                    disabled={!adminReply.trim()}
                                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition"
                                >
                                    <MessageSquare className="w-5 h-5" />
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500">
                        <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
                        <p>Selecciona un ticket para ver los detalles.</p>
                    </div>
                )}
            </div>

        </div>
    );
}
