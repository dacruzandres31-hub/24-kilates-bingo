import React, { useState, useEffect } from 'react';
import { Activity, Users, Play, Pause, TrendingUp } from 'lucide-react';
import axios from 'axios';
import './LiveSessionMonitor.css';

const LiveSessionMonitor = () => {
    const [sessions, setSessions] = useState([]);
    const [diagnostics, setDiagnostics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Cargar sesiones activas
    const loadLiveSessions = async () => {
        try {
            const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
            const response = await axios.get('/api/admin/live-sessions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data.success) {
                setSessions(response.data.sessions);
            }
        } catch (err) {
            console.error('[LiveMonitor] Error loading sessions:', err);
            setError(err.response?.data?.message || 'Error al cargar sesiones');
        }
    };

    // Cargar diagnósticos de WebSocket
    const loadDiagnostics = async () => {
        try {
            const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
            const response = await axios.get('/api/admin/socket-diagnostics', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data.success) {
                setDiagnostics(response.data);
            }
        } catch (err) {
            console.error('[LiveMonitor] Error loading diagnostics:', err);
        }
    };

    // Cargar datos iniciales
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([loadLiveSessions(), loadDiagnostics()]);
            setLoading(false);
        };

        loadData();

        // Actualizar cada 3 segundos
        const interval = setInterval(() => {
            loadLiveSessions();
            loadDiagnostics();
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    const getRoomColor = (room) => {
        const colors = {
            'starter': '#10b981',
            'bronce': '#cd7f32',
            'plata': '#c0c0c0',
            'oro': '#ffd700'
        };
        return colors[room] || '#6b7280';
    };

    const getStatusBadge = (status) => {
        const badges = {
            'active': { label: 'Activa', color: '#10b981', icon: <Play size={14} /> },
            'playing': { label: 'Sorteando', color: '#3b82f6', icon: <Activity size={14} /> },
            'pending': { label: 'Pendiente', color: '#f59e0b', icon: <Pause size={14} /> }
        };
        const badge = badges[status] || { label: status, color: '#6b7280', icon: null };

        return (
            <span className="status-badge" style={{ backgroundColor: badge.color }}>
                {badge.icon}
                {badge.label}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="live-monitor-container">
                <div className="loading-spinner">
                    <Activity size={48} className="spin" />
                    <p>Cargando monitoreo en vivo...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="live-monitor-container">
                <div className="error-message">
                    <p>❌ {error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="live-monitor-container">
            <div className="monitor-header">
                <h1>
                    <Activity size={32} />
                    Monitoreo en Vivo
                </h1>
                <div className="header-stats">
                    <div className="stat-card">
                        <Users size={20} />
                        <div>
                            <span className="stat-value">{diagnostics?.sockets?.connectedSockets || 0}</span>
                            <span className="stat-label">Conexiones Activas</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <TrendingUp size={20} />
                        <div>
                            <span className="stat-value">{diagnostics?.gameEngine?.activeGames || 0}</span>
                            <span className="stat-label">Sorteos en Memoria</span>
                        </div>
                    </div>
                </div>
            </div>

            {sessions.length === 0 ? (
                <div className="no-sessions">
                    <p>No hay sesiones activas en este momento</p>
                </div>
            ) : (
                <div className="sessions-grid">
                    {sessions.map(session => (
                        <div key={session.id} className="session-card">
                            <div className="session-header">
                                <div className="session-title">
                                    <div
                                        className="room-indicator"
                                        style={{ backgroundColor: getRoomColor(session.room) }}
                                    />
                                    <h3>Sala {session.room.charAt(0).toUpperCase() + session.room.slice(1)}</h3>
                                </div>
                                {getStatusBadge(session.status)}
                            </div>

                            <div className="session-info">
                                <div className="info-row">
                                    <span className="info-label">Sesión ID:</span>
                                    <span className="info-value">#{session.id}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Jugadores:</span>
                                    <span className="info-value">{session.players_count || 0}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Bolillas:</span>
                                    <span className="info-value">{session.balls_drawn || 0}/90</span>
                                </div>
                            </div>

                            <div className="pots-section">
                                <h4>Pozos Acumulados</h4>
                                <div className="pots-grid">
                                    <div className="pot-item">
                                        <span className="pot-label">Línea</span>
                                        <span className="pot-value">${parseFloat(session.jackpot_linea || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="pot-item">
                                        <span className="pot-label">Bingo</span>
                                        <span className="pot-value">${parseFloat(session.jackpot_bingo || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="pot-item">
                                        <span className="pot-label">Pre-40</span>
                                        <span className="pot-value">${parseFloat(session.jackpot_pre40 || 0).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {session.recentBalls && session.recentBalls.length > 0 && (
                                <div className="recent-balls">
                                    <h4>Últimas Bolillas</h4>
                                    <div className="balls-list">
                                        {session.recentBalls.map((ball, idx) => (
                                            <div key={idx} className="ball-item">
                                                <span className="ball-letter">{ball.ball_letter}</span>
                                                <span className="ball-number">{ball.ball_number}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {diagnostics && (
                <div className="diagnostics-section">
                    <h3>Diagnósticos del Sistema</h3>
                    <div className="diagnostics-grid">
                        <div className="diagnostic-card">
                            <h4>WebSocket Rooms</h4>
                            {diagnostics.sockets.rooms.length === 0 ? (
                                <p className="no-data">No hay rooms activos</p>
                            ) : (
                                <ul className="rooms-list">
                                    {diagnostics.sockets.rooms.map((room, idx) => (
                                        <li key={idx}>
                                            <span className="room-name">{room.name}</span>
                                            <span className="room-clients">{room.clients} cliente(s)</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="diagnostic-card">
                            <h4>Sesiones en BD</h4>
                            {diagnostics.database.sessions.length === 0 ? (
                                <p className="no-data">No hay sesiones en BD</p>
                            ) : (
                                <ul className="sessions-list">
                                    {diagnostics.database.sessions.map((session, idx) => (
                                        <li key={idx}>
                                            <span className="session-room">{session.room}</span>
                                            <span className="session-status">{session.status}</span>
                                            <span className="session-balls">{session.balls_drawn} bolillas</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LiveSessionMonitor;
