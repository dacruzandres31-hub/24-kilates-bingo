import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaTrophy, FaMedal } from 'react-icons/fa';

const LeaderboardWidget = () => {
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const token = localStorage.getItem('playerToken');
                const response = await axios.get('/api/gamification/ranking/global', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.data.success) {
                    setLeaderboard(response.data.leaderboard);
                }
            } catch (error) {
                console.error('Error fetching leaderboard', error);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
        // Refresh every 2 minutes
        const interval = setInterval(fetchLeaderboard, 120000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return null;

    return (
        <div className="bg-slate-900/80 border border-gold-500/30 rounded-lg p-4 w-full max-w-sm backdrop-blur-sm animate-fade-in shadow-lg">
            <div className="flex items-center gap-2 mb-3 border-b border-white/10 pb-2">
                <FaTrophy className="text-gold-400" />
                <h3 className="text-white font-bold text-sm tracking-wider">TOP JUGADORES</h3>
            </div>

            <div className="space-y-2">
                {leaderboard.map((player, index) => (
                    <div key={player.username} className="flex items-center justify-between bg-white/5 p-2 rounded hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-3">
                            <span className={`
                w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold
                ${index === 0 ? 'bg-yellow-500 text-black' :
                                    index === 1 ? 'bg-gray-400 text-black' :
                                        index === 2 ? 'bg-amber-700 text-white' : 'bg-slate-700 text-gray-400'}
              `}>
                                {index + 1}
                            </span>
                            <div className="flex flex-col">
                                <span className="text-white text-sm font-medium">{player.username}</span>
                                <span className="text-xs text-gold-500/80">Nivel {player.level}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-xs text-gray-400 font-mono">{new Intl.NumberFormat().format(player.xp)} XP</span>
                        </div>
                    </div>
                ))}
                {leaderboard.length === 0 && (
                    <p className="text-gray-500 text-sm italic py-2 text-center">Sin datos aún...</p>
                )}
            </div>
        </div>
    );
};

export default LeaderboardWidget;
