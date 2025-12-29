import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    ClipboardList,
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    User,
    Activity,
    Calendar,
    Info,
    ArrowRight
} from 'lucide-react';
import './AdminAuditLog.css';

const AdminAuditLog = () => {
    const [logs, setLogs] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({
        adminId: '',
        targetUserId: '',
        action: ''
    });
    const limit = 20;

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = {
                page,
                limit,
                ...filters
            };
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/audit-logs`, {
                headers: { Authorization: `Bearer ${token}` },
                params
            });
            setLogs(response.data.data.logs);
            setTotal(response.data.data.total);
        } catch (err) {
            console.error('Error fetching audit logs:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page, filters]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setPage(1);
    };

    const getActionBadgeClass = (action) => {
        if (action.includes('CREATE')) return 'badge-create';
        if (action.includes('ADD') || action.includes('CHARGE')) return 'badge-add';
        if (action.includes('DELETE') || action.includes('REMOVE')) return 'badge-delete';
        if (action.includes('PASSWORD')) return 'badge-security';
        return 'badge-info';
    };

    const formatDetails = (details) => {
        if (!details) return '-';
        try {
            const obj = typeof details === 'string' ? JSON.parse(details) : details;
            return Object.entries(obj).map(([key, val]) => (
                <div key={key} className="detail-item">
                    <span className="detail-key">{key}:</span>
                    <span className="detail-val">{JSON.stringify(val)}</span>
                </div>
            ));
        } catch (e) {
            return String(details);
        }
    };

    return (
        <div className="admin-audit-container">
            <div className="audit-header">
                <div className="header-title">
                    <ClipboardList className="header-icon" />
                    <h2>Log de Auditoría Admin</h2>
                </div>
                <div className="audit-summary">
                    Total: <strong>{total}</strong> acciones registradas
                </div>
            </div>

            <div className="audit-filters glass-card">
                <div className="filter-group">
                    <Search size={18} />
                    <input
                        type="text"
                        name="action"
                        placeholder="Filtrar por acción (ej: ADD_BALANCE)"
                        value={filters.action}
                        onChange={handleFilterChange}
                    />
                </div>
                <div className="filter-group">
                    <User size={18} />
                    <input
                        type="text"
                        name="adminId"
                        placeholder="ID Admin"
                        value={filters.adminId}
                        onChange={handleFilterChange}
                    />
                </div>
                <div className="filter-group">
                    <Filter size={18} />
                    <select name="limit" disabled>
                        <option value="20">20 por página</option>
                    </select>
                </div>
            </div>

            <div className="audit-table-wrapper glass-card">
                <table className="audit-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Admin</th>
                            <th>Acción</th>
                            <th>Destinatario</th>
                            <th>Detalles</th>
                            <th>IP</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" className="table-loading">Cargando logs...</td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan="6" className="table-empty">No se encontraron registros</td></tr>
                        ) : (
                            logs.map(log => (
                                <tr key={log.id} className="audit-row">
                                    <td className="col-date">
                                        <div className="date-main">{new Date(log.created_at).toLocaleDateString()}</div>
                                        <div className="date-sub">{new Date(log.created_at).toLocaleTimeString()}</div>
                                    </td>
                                    <td className="col-admin">
                                        <div className="user-info">
                                            <span className="username">{log.admin_name}</span>
                                            <span className="user-id">ID: {log.admin_id}</span>
                                        </div>
                                    </td>
                                    <td className="col-action">
                                        <span className={`action-badge ${getActionBadgeClass(log.action)}`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="col-target">
                                        {log.target_user_id ? (
                                            <div className="user-info">
                                                <span className="username">{log.target_name}</span>
                                                <span className="user-id">ID: {log.target_user_id}</span>
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td className="col-details">
                                        <div className="details-compact">
                                            {formatDetails(log.details)}
                                        </div>
                                    </td>
                                    <td className="col-ip">
                                        <code className="ip-val">{log.ip_address || 'local'}</code>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="audit-pagination">
                <button
                    disabled={page === 1 || loading}
                    onClick={() => setPage(p => p - 1)}
                    className="pagination-btn"
                >
                    <ChevronLeft size={20} /> Ant.
                </button>
                <div className="page-indicator">
                    Página <strong>{page}</strong> de {Math.max(1, Math.ceil(total / limit))}
                </div>
                <button
                    disabled={page >= Math.ceil(total / limit) || loading}
                    onClick={() => setPage(p => p + 1)}
                    className="pagination-btn"
                >
                    Sig. <ChevronRight size={20} />
                </button>
            </div>
        </div>
    );
};

export default AdminAuditLog;
