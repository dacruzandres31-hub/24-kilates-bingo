import React, { useState, useEffect, useMemo } from 'react';
import useSocket from '../hooks/useSocket';
import { FaUsers, FaTrophy, FaGem, FaStar, FaCrown } from 'react-icons/fa';
import './WinnersTicker.css';

const RANDOM_NAMES = [
    'JuanGamer', 'MariaGanadora', 'Suerte24K', 'BingoMaster', 'ReyDeOro',
    'LuckyStrike', 'FortunaMix', 'DiamanteAzul', 'PoderOro', 'GamerPro_Arg',
    'EstrellaK', 'SúperBingo', 'MegaGanador', 'Santi_Bingo', 'LuchoSlot',
    'AnaSuerte', 'CarlosPro', 'VickyWin', 'NicoGana', 'JokerBingo'
];

const WinnersTicker = ({ stats }) => {
    const socket = useSocket();
    const [liveMessages, setLiveMessages] = useState([]);
    const [fakeWins, setFakeWins] = useState([]);

    // Generar premios falsos de la Rueda de la Fortuna ($100k, $50k, $5k)
    useEffect(() => {
        const generateFakeWin = () => {
            const prizes = [100000, 50000, 5000];
            const randomName = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
            const randomPrize = prizes[Math.floor(Math.random() * prizes.length)];

            const newFakeWin = {
                text: `${randomName} ganó $${randomPrize.toLocaleString()} en la Rueda de la Fortuna 🎡`,
                type: 'wheel',
                icon: '🎡',
                color: 'text-yellow-400 font-bold'
            };

            setFakeWins(prev => [newFakeWin, ...prev].slice(0, 5));
        };

        generateFakeWin();
        const interval = setInterval(generateFakeWin, 45000); // Cada 45 segundos inyectar uno nuevo
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!socket) return;

        const handleMessage = (data) => {
            setLiveMessages(prev => [data, ...prev].slice(0, 10));
        };

        socket.on('global_ticker_message', handleMessage);
        return () => socket.off('global_ticker_message', handleMessage);
    }, [socket]);

    // Combinar todo en un solo track: Stats Reales + Premios Reales + Premios Falsos
    const tickerTrack = useMemo(() => {
        const items = [];

        // 1. Estadísticas Reales de la Casa
        if (stats) {
            items.push(
                { text: `${stats.activePlayers} JUGADORES ACTIVOS`, icon: <FaUsers />, color: 'text-blue-400' },
                { text: `PAGADOS HOY: $${stats.prizesPaidToday.toLocaleString()}`, icon: <FaGem />, color: 'text-green-400' },
                { text: `${stats.vipRooms} SALAS VIP DISPONIBLES`, icon: <FaCrown />, color: 'text-yellow-500' }
            );

            // Top Players
            if (stats.topPlayers && stats.topPlayers.length > 0) {
                const topText = `TOP RANKING: ${stats.topPlayers.map((p, i) => `#${i + 1} ${p.username}`).join(' | ')}`;
                items.push({ text: topText, icon: <FaTrophy />, color: 'text-gold-400' });
            }
        }

        // 2. Actividad en Vivo (Socket)
        liveMessages.forEach(msg => {
            items.push({ text: msg.text, icon: msg.icon || <FaStar />, color: msg.color || 'text-white' });
        });

        // 3. Premios Falsos (Rueda de la Fortuna)
        fakeWins.forEach(win => {
            items.push({ text: win.text, icon: win.icon, color: win.color });
        });

        // Duplicar para el efecto marquee infinito si es necesario
        return [...items, ...items];
    }, [stats, liveMessages, fakeWins]);

    return (
        <div className="winners-ticker">
            <div className="ticker-label">
                <span className="pulse-dot"></span> NOTICIAS 24K
            </div>
            <div className="ticker-content">
                <div className="ticker-track">
                    {tickerTrack.map((item, index) => (
                        <div key={index} className="ticker-item">
                            <span className={`ticker-icon ${item.color?.split(' ')[0]}`}>{item.icon}</span>
                            <span className={`ticker-text ${item.color}`}>
                                {item.text}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default WinnersTicker;
