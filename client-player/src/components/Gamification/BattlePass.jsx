import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaClock, FaGem, FaCrown, FaTimes } from 'react-icons/fa';
import './BattlePass.css';

const BattlePass = ({ onClose }) => {
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(null);
    const [seasonLevels, setSeasonLevels] = useState([]);
    const [timeLeft, setTimeLeft] = useState('');

    const seasonEnds = new Date('2026-01-31T23:59:59');

    useEffect(() => {
        fetchSeasonData();
        const timer = setInterval(() => {
            const now = new Date();
            const diff = seasonEnds - now;
            if (diff <= 0) {
                setTimeLeft('Temporada Finalizada');
                return;
            }
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((diff / 1000 / 60) % 60);
            setTimeLeft(`${days}d ${hours}h ${minutes}m`);
        }, 60000); // Update every minute

        // Initial call
        const now = new Date();
        const diff = seasonEnds - now;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);

        return () => clearInterval(timer);
    }, []);

    const fetchSeasonData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('playerToken');
            const headers = { Authorization: `Bearer ${token}` };

            const [levelsRes, progressRes] = await Promise.all([
                axios.get('/api/gamification/levels', { headers }),
                axios.get('/api/gamification/progress', { headers })
            ]);

            if (levelsRes.data.success) {
                setSeasonLevels(levelsRes.data.levels);
            }
            if (progressRes.data.success) {
                setProgress(progressRes.data.progress);
            }
        } catch (error) {
            console.error('Error fetching Battle Pass data:', error);
        } finally {
            setLoading(false);
        }
    };

    // ...

    return (
        <div className="bp-overlay">
            <div className="bp-container">
                <div className="bp-header">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2>BINGO PASS: Season 1</h2>
                            <div className="season-timer flex items-center gap-2 text-yellow-400 text-sm font-bold mt-1">
                                <FaClock /> <span>Termina en: {timeLeft}</span>
                            </div>
                        </div>
                        <button onClick={onClose} className="close-btn"><FaTimes /></button>
                    </div>
                </div>

                {/* Mission Control / Dashboard */}
                <div className="bp-dashboard">
                    <div className="bp-stats">
                        <div className="stat-box">
                            <span className="label">Nivel Actual</span>
                            <span className="value">{progress?.current_level || 1}</span>
                        </div>
                        <div className="stat-box xp-box">
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-300">Progreso de XP</span>
                                <span className="text-yellow-400 font-bold">
                                    {progress?.current_xp || 0} / {progress?.next_level_xp || 100} XP
                                </span>
                            </div>
                            <div className="xp-bar-container">
                                <div
                                    className="xp-bar-fill"
                                    style={{ width: `${Math.min(100, ((progress?.current_xp || 0) / (progress?.next_level_xp || 100)) * 100)}%` }}
                                ></div>
                            </div>
                            <p className="xp-instruction">
                                ¡Juega en las salas de Bingo para ganar XP y subir de nivel!
                            </p>
                        </div>
                    </div>
                    <button className="play-action-btn" onClick={onClose}>
                        ¡JUGAR AHORA! 🚀
                    </button>
                </div>

                <div className="bp-track-container">
                    <div className="bp-track">
                        {loading ? (
                            <div className="text-white p-8">Cargando temporada...</div>
                        ) : seasonLevels.length > 0 ? (
                            seasonLevels.map((lvl) => {
                                const isUnlocked = progress && progress.current_level >= lvl.level;
                                const isCurrent = progress && progress.current_level === lvl.level;

                                return (
                                    <div key={lvl.level} className={`bp-level-node ${isUnlocked ? 'unlocked' : ''} ${isCurrent ? 'current' : ''}`}>
                                        <div className="level-number">{lvl.level}</div>
                                        <div className="reward-icon free">{lvl.freeReward === 'Ticket' ? '🎟️' : '💰'}</div>
                                        <div className="reward-icon premium">👑</div>
                                        {isCurrent && <div className="current-marker">YOU</div>}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-gray-500 p-8">Próximamente...</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BattlePass;
