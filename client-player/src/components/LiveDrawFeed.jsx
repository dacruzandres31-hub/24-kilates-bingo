import React, { useState, useEffect } from 'react';
import { Activity, Users, TrendingUp, Play } from 'lucide-react';
import useSocket from '../hooks/useSocket';
import './LiveDrawFeed.css';

const LiveDrawFeed = () => {
    const socket = useSocket();
    const [activeDraws, setActiveDraws] = useState({
        starter: null,
        bronce: null,
        plata: null,
        oro: null
    });

    useEffect(() => {
        if (!socket) return;

        // Unirse a todas las salas como espectador
        const rooms = ['starter', 'bronce', 'plata', 'oro'];
        rooms.forEach(room => {
            socket.emit('join_room_spectator', { room });
            console.log(`[LiveDrawFeed] 📺 Uniéndose como espectador a room_${room}`);
        });

        // Escuchar bolillas de todas las salas
        const handleBallDrawn = (data) => {
            console.log('[LiveDrawFeed] 🎱 Bolilla recibida:', data);

            const { room, ballNumber, ballLetter, drawOrder, gameSessionId } = data;

            if (!room) return;

            setActiveDraws(prev => {
                const currentDraw = prev[room] || { balls: [], sessionId: null };

                // Si es una nueva sesión, resetear
                if (currentDraw.sessionId && currentDraw.sessionId !== gameSessionId) {
                    return {
                        ...prev,
                        [room]: {
                            sessionId: gameSessionId,
                            balls: [{ number: ballNumber, letter: ballLetter, order: drawOrder }],
                            lastUpdate: Date.now()
                        }
                    };
                }

                // Agregar bolilla si no existe
                const ballExists = currentDraw.balls.some(b => b.number === ballNumber);
                if (ballExists) return prev;

                return {
                    ...prev,
                    [room]: {
                        sessionId: gameSessionId,
                        balls: [...currentDraw.balls, { number: ballNumber, letter: ballLetter, order: drawOrder }],
                        lastUpdate: Date.now()
                    }
                };
            });
        };

        socket.on('number_drawn', handleBallDrawn);

        // Cleanup
        return () => {
            socket.off('number_drawn', handleBallDrawn);
            rooms.forEach(room => {
                socket.emit('leave_room_spectator', { room });
            });
        };
    }, [socket]);

    const getRoomColor = (room) => {
        const colors = {
            'starter': '#10b981',
            'bronce': '#cd7f32',
            'plata': '#c0c0c0',
            'oro': '#ffd700'
        };
        return colors[room] || '#6b7280';
    };

    const getRoomName = (room) => {
        const names = {
            'starter': 'Starter',
            'bronce': 'Bronce',
            'plata': 'Plata',
            'oro': 'Oro'
        };
        return names[room] || room;
    };

    const activeRooms = Object.entries(activeDraws).filter(([_, draw]) => draw && draw.balls.length > 0);

    if (activeRooms.length === 0) {
        return (
            <div className="live-draw-feed empty">
                <div className="empty-state">
                    <Activity size={48} className="empty-icon" />
                    <p>No hay sorteos activos en este momento</p>
                    <span className="empty-subtitle">Los sorteos aparecerán aquí cuando estén en curso</span>
                </div>
            </div>
        );
    }

    return (
        <div className="live-draw-feed">
            <div className="feed-header">
                <h2>
                    <Play size={24} className="pulse" />
                    Sorteos en Vivo
                </h2>
                <span className="live-badge">
                    <span className="live-dot"></span>
                    EN VIVO
                </span>
            </div>

            <div className="draws-grid">
                {activeRooms.map(([room, draw]) => (
                    <div key={room} className="draw-card">
                        <div className="draw-header">
                            <div className="room-info">
                                <div
                                    className="room-indicator"
                                    style={{ backgroundColor: getRoomColor(room) }}
                                />
                                <h3>Sala {getRoomName(room)}</h3>
                            </div>
                            <span className="ball-count">{draw.balls.length}/90</span>
                        </div>

                        <div className="latest-ball">
                            {draw.balls.length > 0 && (
                                <>
                                    <span className="latest-label">Última bolilla:</span>
                                    <div className="ball-display">
                                        <span className="ball-letter">{draw.balls[draw.balls.length - 1].letter}</span>
                                        <span className="ball-number">{draw.balls[draw.balls.length - 1].number}</span>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="recent-balls">
                            <span className="recent-label">Últimas 5:</span>
                            <div className="balls-row">
                                {draw.balls.slice(-5).reverse().map((ball, idx) => (
                                    <div key={idx} className="mini-ball">
                                        <span className="mini-letter">{ball.letter}</span>
                                        <span className="mini-number">{ball.number}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="draw-footer">
                            <button
                                className="join-button"
                                onClick={() => window.location.href = `/${room}-room`}
                            >
                                <Users size={16} />
                                Ver en Sala
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LiveDrawFeed;
