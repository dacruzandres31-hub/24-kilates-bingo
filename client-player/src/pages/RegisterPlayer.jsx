import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { User, Lock, Eye, EyeOff, UserPlus, ArrowLeft } from 'lucide-react';
import '../styles/LoginPlayer.css'; // Reusing styles for consistency

export default function RegisterPlayer() {
    const navigate = useNavigate();
    const location = useLocation();
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: ''
    });
    const [refCode, setRefCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        // Capturar código de referido de la URL (?ref=CODE)
        const params = new URLSearchParams(location.search);
        const ref = params.get('ref');
        if (ref) {
            setRefCode(ref);
            console.log('🔗 Código de referido detectado:', ref);
        }
    }, [location]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            return setError('Las contraseñas no coinciden');
        }

        if (formData.password.length < 6) {
            return setError('La contraseña debe tener al menos 6 caracteres');
        }

        setLoading(true);

        try {
            const response = await axios.post('/api/auth/register', {
                username: formData.username,
                password: formData.password,
                role: 'jugador',
                ref: refCode
            });

            // Registro exitoso -> Redirigir al login o auto-login
            alert('¡Cuenta creada con éxito! Ahora puedes iniciar sesión.');
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.message || 'Error al registrar usuario');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-wrapper">
                <div className="login-logo-container" onClick={() => navigate('/login')} style={{ cursor: 'pointer' }}>
                    <img src="/logo.png" alt="Bingo 24K" className="login-logo" />
                </div>

                <div className="login-card">
                    <div className="login-header" style={{ textAlign: 'center', marginBottom: '20px' }}>
                        <h2 style={{ color: '#fbbf24', fontSize: '1.5rem', margin: 0 }}>Crear Cuenta</h2>
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Únete a la mejor comunidad de Bingo</p>
                    </div>

                    <form onSubmit={handleSubmit} className="login-form">
                        {error && <div className="error-message"><p>{error}</p></div>}

                        <div className="form-group">
                            <label className="form-label">Nombre de Usuario</label>
                            <div className="input-with-icon" style={{ position: 'relative' }}>
                                <input
                                    name="username"
                                    type="text"
                                    value={formData.username}
                                    onChange={handleChange}
                                    className="form-input"
                                    placeholder="Elige un nombre"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Contraseña</label>
                            <div className="password-container">
                                <input
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="form-input"
                                    placeholder="Mínimo 6 caracteres"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="password-toggle"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Confirmar Contraseña</label>
                            <input
                                name="confirmPassword"
                                type={showPassword ? "text" : "password"}
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="Repite tu contraseña"
                                required
                            />
                        </div>

                        {refCode && (
                            <div className="ref-info-badge" style={{
                                background: 'rgba(251, 191, 36, 0.1)',
                                border: '1px solid rgba(251, 191, 36, 0.3)',
                                padding: '10px',
                                borderRadius: '8px',
                                marginBottom: '15px',
                                fontSize: '0.85rem',
                                color: '#fbbf24',
                                textAlign: 'center'
                            }}>
                                🔗 Código de referido aplicado: <strong>{refCode}</strong>
                            </div>
                        )}

                        <button type="submit" disabled={loading} className="login-button">
                            {loading ? <><span className="spinner"></span> Registrando...</> : 'Registrarse Ahora'}
                        </button>
                    </form>

                    <div className="login-footer">
                        <button
                            className="btn-back-login"
                            onClick={() => navigate('/login')}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                margin: '10px auto'
                            }}
                        >
                            <ArrowLeft size={16} />
                            <span>Volver al Inicio de Sesión</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
