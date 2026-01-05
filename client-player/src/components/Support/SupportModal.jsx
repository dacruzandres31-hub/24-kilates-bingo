import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaHeadset, FaTimes, FaInbox, FaPaperPlane, FaSpinner, FaCommentAlt, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import './SupportModal.css';

// Traducción de estados
const statusLabels = {
    'open': 'Abierto',
    'in_progress': 'En Progreso',
    'resolved': 'Resuelto',
    'closed': 'Cerrado'
};

// Traducción de categorías
const categoryLabels = {
    'payment': 'Problema de Pago / Depósito',
    'game_bug': 'Error en el Juego',
    'account': 'Cuenta y Acceso',
    'other': 'Otro'
};

export default function SupportModal({ isOpen, onClose }) {
    const [activeTab, setActiveTab] = useState('new'); // 'new', 'list', 'detail'
    const [tickets, setTickets] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // New Ticket Form State
    const [subject, setSubject] = useState('');
    const [category, setCategory] = useState('payment');
    const [message, setMessage] = useState('');

    // Ticket Detail/Chat State
    const [ticketMessages, setTicketMessages] = useState([]);
    const [replyMessage, setReplyMessage] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            fetchTickets();
            setActiveTab('new');
        }
    }, [isOpen]);

    useEffect(() => {
        if (activeTab === 'detail' && selectedTicket) {
            scrollToBottom();
        }
    }, [ticketMessages, activeTab]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchTickets = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('playerToken');
            const res = await axios.get('/api/support/my-tickets', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setTickets(res.data.tickets);
            }
        } catch (err) {
            console.error('Error fetching tickets', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateTicket = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const token = localStorage.getItem('playerToken');
            await axios.post('/api/support/ticket', {
                subject,
                category,
                message
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Reset and switch to list
            setSubject('');
            setMessage('');
            setCategory('payment');
            await fetchTickets();
            setActiveTab('list');
        } catch (err) {
            console.error('Error creating ticket', err);
            alert('Error al crear ticket');
        } finally {
            setIsLoading(false);
        }
    };

    const openTicketDetail = async (ticket) => {
        setSelectedTicket(ticket);
        setActiveTab('detail');
        setIsLoading(true);
        try {
            const token = localStorage.getItem('playerToken');
            const res = await axios.get(`/api/support/ticket/${ticket.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setTicketMessages(res.data.messages);
            }
        } catch (err) {
            console.error('Error fetching details', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReply = async (e) => {
        e.preventDefault();
        if (!replyMessage.trim()) return;

        try {
            const token = localStorage.getItem('playerToken');
            await axios.post(`/api/support/ticket/${selectedTicket.id}/reply`, {
                message: replyMessage
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setReplyMessage('');
            // Refresh messages
            const res = await axios.get(`/api/support/ticket/${selectedTicket.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTicketMessages(res.data.messages);
        } catch (err) {
            console.error('Error sending reply', err);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="support-modal-overlay">
            <div className="support-modal-container">

                {/* HEADER */}
                <div className="support-header">
                    <div className="support-title">
                        <FaHeadset className="support-icon" />
                        <h2>Soporte Técnico</h2>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                {/* TABS */}
                {activeTab !== 'detail' && (
                    <div className="support-tabs">
                        <button
                            className={`tab-btn ${activeTab === 'new' ? 'active' : ''}`}
                            onClick={() => setActiveTab('new')}
                        >
                            <FaPaperPlane /> Nuevo Ticket
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('list'); fetchTickets(); }}
                        >
                            <FaInbox /> Mis Tickets
                        </button>
                    </div>
                )}

                {/* CONTENT */}
                <div className="support-content">

                    {/* NEW TICKET FORM */}
                    {activeTab === 'new' && (
                        <form onSubmit={handleCreateTicket} className="new-ticket-form">
                            <div className="form-group">
                                <label>Categoría</label>
                                <select value={category} onChange={e => setCategory(e.target.value)}>
                                    <option value="payment">Problema de Pago / Depósito</option>
                                    <option value="game_bug">Error en el Juego</option>
                                    <option value="account">Cuenta y Acceso</option>
                                    <option value="other">Otro</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Asunto</label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={e => setSubject(e.target.value)}
                                    placeholder="Resumen del problema"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Mensaje</label>
                                <textarea
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    placeholder="Describe tu problema detalladamente..."
                                    rows={5}
                                    required
                                />
                            </div>

                            <button type="submit" className="submit-ticket-btn" disabled={isLoading}>
                                {isLoading ? <FaSpinner className="spin" /> : 'Enviar Ticket'}
                            </button>
                        </form>
                    )}

                    {/* TICKET LIST */}
                    {activeTab === 'list' && (
                        <div className="tickets-list">
                            {isLoading && <div className="loading-state"><FaSpinner className="spin" /></div>}

                            {!isLoading && tickets.length === 0 && (
                                <div className="empty-state">No tienes tickets creados.</div>
                            )}

                            {tickets.map(ticket => (
                                <div key={ticket.id} className="ticket-item" onClick={() => openTicketDetail(ticket)}>
                                    <div className="ticket-status-icon">
                                        {ticket.status === 'resolved' || ticket.status === 'closed' ?
                                            <FaCheckCircle className="text-green-400" /> :
                                            <FaExclamationCircle className="text-yellow-400" />
                                        }
                                    </div>
                                    <div className="ticket-info">
                                        <div className="ticket-subject">{ticket.subject}</div>
                                        <div className="ticket-meta">
                                            <span className="ticket-id">#{ticket.id}</span>
                                            <span className="ticket-category">{categoryLabels[ticket.category] || ticket.category}</span>
                                            <span className="ticket-date">{new Date(ticket.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className={`ticket-badge status-${ticket.status}`}>
                                        {statusLabels[ticket.status] || ticket.status}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* TICKET DETAIL / CHAT */}
                    {activeTab === 'detail' && selectedTicket && (
                        <div className="ticket-detail-view">
                            <div className="detail-header">
                                <button className="back-btn" onClick={() => setActiveTab('list')}>
                                    ← Volver
                                </button>
                                <div className="detail-title">
                                    <span className="detail-id">#{selectedTicket.id}</span>
                                    <span className="detail-subject">{selectedTicket.subject}</span>
                                </div>
                                <div className={`status-badge status-${selectedTicket.status}`}>
                                    {statusLabels[selectedTicket.status] || selectedTicket.status}
                                </div>
                            </div>

                            <div className="messages-container">
                                {ticketMessages.map((msg, idx) => (
                                    <div key={idx} className={`message-bubble ${msg.is_admin ? 'message-admin' : 'message-user'}`}>
                                        <div className="message-sender">
                                            {msg.is_admin ? 'Soporte 24K' : 'Tú'}
                                        </div>
                                        <div className="message-text">{msg.message}</div>
                                        <div className="message-time">
                                            {new Date(msg.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="reply-box">
                                <form onSubmit={handleReply}>
                                    <input
                                        type="text"
                                        value={replyMessage}
                                        onChange={e => setReplyMessage(e.target.value)}
                                        placeholder="Escribe una respuesta..."
                                        disabled={selectedTicket.status === 'closed'}
                                    />
                                    <button type="submit" disabled={!replyMessage.trim() || selectedTicket.status === 'closed'}>
                                        <FaPaperPlane />
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                </div>
                {/* FOOTER ACTION */}
                <div className="support-footer-action">
                    <button className="back-lobby-btn" onClick={onClose}>
                        Volver al Lobby
                    </button>
                </div>
            </div>
        </div>
    );
}
