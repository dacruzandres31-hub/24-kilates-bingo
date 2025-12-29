import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Activity,
    Cpu,
    Database,
    Server,
    Clock,
    Users,
    HardDrive,
    RefreshCcw,
    ShieldAlert,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import './SystemHealthPanel.css';

const SystemHealthPanel = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const fetchHealth = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/system/health`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats(response.data.data);
            setLastUpdated(new Date());
            setError(null);
        } catch (err) {
            console.error('Error fetching system health:', err);
            setError('No se pudo cargar la salud del sistema');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHealth();
        const interval = setInterval(fetchHealth, 30000); // 30s auto-refresh
        return () => clearInterval(interval);
    }, []);

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatUptime = (seconds) => {
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor((seconds % (3600 * 24)) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${d}d ${h}h ${m}m`;
    };

    if (loading && !stats) return <div className="health-loading">Cargando métricas...</div>;

    const memoryPercent = stats?.process?.memory?.heapUsed && stats?.process?.memory?.heapTotal
        ? Math.round((stats.process.memory.heapUsed / stats.process.memory.heapTotal) * 100)
        : 0;

    return (
        <div className="system-health-container">
            <div className="health-header">
                <div className="header-title">
                    <Activity className="status-icon pulse-green" />
                    <h2>Salud del Sistema</h2>
                </div>
                <div className="header-actions">
                    <span className="last-updated">Actualizado: {lastUpdated.toLocaleTimeString()}</span>
                    <button className="refresh-btn" onClick={fetchHealth} disabled={loading}>
                        <RefreshCcw className={loading ? 'spinning' : ''} size={18} />
                    </button>
                </div>
            </div>

            {error && (
                <div className="health-error-banner">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}

            <div className="health-grid">
                {/* Server Overview */}
                <div className="health-card glass-card">
                    <div className="card-icon blue">
                        <Server size={24} />
                    </div>
                    <div className="card-info">
                        <h3>Servidor Node.js</h3>
                        <p className="status-badge online">OPERATIVO</p>
                        <div className="stat-row">
                            <Clock size={14} />
                            <span>Uptime: {formatUptime(stats?.uptimeSeconds || 0)}</span>
                        </div>
                        <div className="stat-row">
                            <Activity size={14} />
                            <span>Conexiones: {stats?.activeConnections || 0}</span>
                        </div>
                    </div>
                </div>

                {/* CPU Usage */}
                <div className="health-card glass-card">
                    <div className="card-icon purple">
                        <Cpu size={24} />
                    </div>
                    <div className="card-info">
                        <h3>CPU & Carga</h3>
                        <div className="cpu-stat">
                            <span className="large-val">{stats?.system?.cpus || '--'} Cores</span>
                            <span className="sub-val">{stats?.system?.arch || '--'} Arch</span>
                        </div>
                        <div className="load-meter">
                            <div className="load-label">Carga (1/5/15 min)</div>
                            <div className="load-values">
                                {stats?.system?.loadAvg?.map(l => l.toFixed(2)).join(' / ') || '--'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Memory Usage */}
                <div className="health-card glass-card">
                    <div className="card-icon orange">
                        <HardDrive size={24} />
                    </div>
                    <div className="card-info">
                        <h3>Memoria (Heap)</h3>
                        <div className="memory-progress-container">
                            <div className="progress-bg">
                                <div
                                    className={`progress-fill ${memoryPercent > 80 ? 'danger' : memoryPercent > 60 ? 'warning' : 'good'}`}
                                    style={{ width: `${memoryPercent}%` }}
                                />
                            </div>
                            <span className="percent-label">{memoryPercent}%</span>
                        </div>
                        <div className="mem-details">
                            <div className="mem-row">
                                <span>Usado:</span>
                                <span>{formatBytes(stats?.process?.memory?.heapUsed || 0)}</span>
                            </div>
                            <div className="mem-row">
                                <span>Total:</span>
                                <span>{formatBytes(stats?.process?.memory?.heapTotal || 0)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Database Health */}
                <div className="health-card glass-card">
                    <div className="card-icon green">
                        <Database size={24} />
                    </div>
                    <div className="card-info">
                        <h3>Base de Datos</h3>
                        <p className="status-badge online">CONECTADO</p>
                        <div className="db-stats">
                            <div className="stat-item">
                                <CheckCircle2 size={16} className="text-green" />
                                <span>Pool activo</span>
                            </div>
                            <div className="stat-item">
                                <ShieldAlert size={16} className="text-blue" />
                                <span>Latencia: OK</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Log Section */}
            {stats?.errors && stats.errors.length > 0 && (
                <div className="error-log-section glass-card">
                    <div className="section-header">
                        <ShieldAlert size={20} className="text-red" />
                        <h3>Errores Recientes (Últimos 50)</h3>
                    </div>
                    <div className="error-table-wrapper">
                        <table className="error-table">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>Contexto</th>
                                    <th>Mensaje</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.errors.map((err, i) => (
                                    <tr key={i}>
                                        <td className="time-col">{new Date(err.timestamp).toLocaleString()}</td>
                                        <td className="ctx-col"><code>{err.context}</code></td>
                                        <td className="msg-col">{err.message}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SystemHealthPanel;
