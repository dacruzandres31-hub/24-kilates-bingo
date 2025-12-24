import React, { useState, useEffect } from 'react';
import useSocket from '../hooks/useSocket';
import './WinnersTicker.css'; // We'll create or reuse CSS

const fakeWinners = [
    { text: 'Juanito123 ganó $150 en Sala Oro', type: 'win', icon: '💰' },
    { text: 'MariaGana desbloqueó Nivel 5', type: 'levelup', icon: '🏆' },
];

const WinnersTicker = () => {
    const socket = useSocket();
    const [messages, setMessages] = useState(fakeWinners);

    useEffect(() => {
        if (!socket) return;

        const handleMessage = (data) => {
            // data: { text, icon, color, ... }
            setMessages(prev => [data, ...prev].slice(0, 10));
        };

        socket.on('global_ticker_message', handleMessage);

        return () => {
            socket.off('global_ticker_message', handleMessage);
        };
    }, [socket]);

    return (
        <div className="winners-ticker">
            <div className="ticker-label">🏆 ACTIVIDAD EN VIVO</div>
            <div className="ticker-content">
                <div className="ticker-track">
                    {messages.map((msg, index) => (
                        <div key={index} className="ticker-item">
                            <span className="ticker-icon">{msg.icon}</span>
                            <span className={`ticker-text ${msg.color || 'text-white'}`}>
                                {msg.text}
                            </span>
                        </div>
                    ))}
                    {/* Duplicate for infinite scroll effect if needed, though simple map is fine for MVP */}
                </div>
            </div>
        </div>
    );
};

export default WinnersTicker;
