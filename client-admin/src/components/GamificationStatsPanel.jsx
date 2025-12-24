
import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function GamificationStatsPanel() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 60000); // 1 min refresh
        return () => clearInterval(interval);
    }, []);

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get('/api/gamification/admin/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setStats(res.data.stats);
            }
            setLoading(false);
        } catch (err) {
            console.error('Error loading gamification stats', err);
            setLoading(false);
        }
    };

    if (loading) return <div className="h-32 bg-gray-800 rounded animate-pulse" />;
    if (!stats) return null;

    return (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                🏆 Gamificación - Estado Global
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Active Streaks */}
                <div className="bg-gradient-to-br from-orange-900/40 to-red-900/30 p-4 rounded-lg border border-orange-700/30">
                    <p className="text-gray-400 text-sm">Rachas Activas</p>
                    <p className="text-2xl font-bold text-orange-400">
                        🔥 {stats.activeStreaks}
                    </p>
                    <p className="text-xs text-gray-500">Max: {stats.maxStreak} días</p>
                </div>

                {/* Achievements */}
                <div className="bg-gradient-to-br from-yellow-900/40 to-amber-900/30 p-4 rounded-lg border border-yellow-700/30">
                    <p className="text-gray-400 text-sm">Logros Desbloqueados</p>
                    <p className="text-2xl font-bold text-yellow-400">
                        🏅 {stats.achievementsUnlocked}
                    </p>
                    <p className="text-xs text-gray-500">{stats.usersWithAchievements} usuarios únicos</p>
                </div>

                {/* Level */}
                <div className="bg-gradient-to-br from-blue-900/40 to-cyan-900/30 p-4 rounded-lg border border-blue-700/30">
                    <p className="text-gray-400 text-sm">Nivel Promedio</p>
                    <p className="text-2xl font-bold text-cyan-400">
                        ⭐ {stats.avgLevel}
                    </p>
                </div>

                {/* XP */}
                <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/30 p-4 rounded-lg border border-purple-700/30">
                    <p className="text-gray-400 text-sm">XP Total Distribuida</p>
                    <p className="text-2xl font-bold text-purple-400">
                        ⚡ {stats.totalXp.toLocaleString()}
                    </p>
                </div>
            </div>
        </div>
    );
}
