import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/LoginPlayer.css';
import BlockedUserModal from '../components/BlockedUserModal';

export default function LoginPlayer({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [blockedUserRole, setBlockedUserRole] = useState('');

  // Debug: Monitorear cambios en showBlockedModal
  useEffect(() => {
    console.log('🔍 [MODAL-STATE] showBlockedModal cambió a:', showBlockedModal);
    console.log('🔍 [MODAL-STATE] blockedUserRole:', blockedUserRole);
  }, [showBlockedModal, blockedUserRole]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/login', {
        username,
        password
      });

      const { token, user, gamification } = response.data.data;

      // Verificar que sea jugador
      if (user.role !== 'jugador') {
        setError('Este acceso es solo para jugadores. Administradores deben usar el panel de administración.');
        setLoading(false);
        return;
      }

      // Guardar información del usuario
      localStorage.setItem('playerToken', token);
      localStorage.setItem('playerUser', JSON.stringify(user));

      onLogin(token, user, gamification);
    } catch (err) {
      console.log('🚫 Error en login:', err.response?.status, err.response?.data);
      // Verificar si el usuario está bloqueado
      if (err.response?.status === 403 && err.response?.data?.blocked) {
        console.log('🔒 Usuario bloqueado detectado:', err.response.data);
        setBlockedUserRole(err.response.data.role || 'jugador');
        setShowBlockedModal(true);
        setPassword(''); // Limpiar contraseña
        console.log('🔓 Estado modal:', { showBlockedModal: true, blockedUserRole: err.response.data.role });
      } else {
        setError(err.response?.data?.message || 'Error de autenticación');
      }
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        {/* Logo */}
        <div className="login-logo-container">
          <img
            src="/logo.png"
            alt="Bingo 24K"
            className="login-logo"
          />
        </div>

        {/* Formulario de Login */}
        <div className="login-card">
          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="error-message">
                <p>{error}</p>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                Nombre de Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-input"
                placeholder="Nombre de Usuario"
                required
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Contraseña
              </label>
              <div className="password-container">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                  tabIndex="-1"
                >
                  {showPassword ? (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="login-button"
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          <div className="login-footer">
            <p className="no-account-text">
              ¿No tienes cuenta?
            </p>
            <p className="agent-contact-text">
              Contacta a tu agente para registrarte
            </p>
          </div>
        </div>
      </div>

      {/* Modal de Usuario Bloqueado */}
      {showBlockedModal && (
        <BlockedUserModal
          isOpen={showBlockedModal}
          role={blockedUserRole}
          onClose={() => {
            setShowBlockedModal(false);
            setPassword(''); // Limpiar contraseña al cerrar
          }}
        />
      )}
    </div>
  );
}
