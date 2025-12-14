import React, { useState } from 'react';
import { FaTimes, FaEye, FaEyeSlash, FaKey, FaSignOutAlt, FaUser } from 'react-icons/fa';
import axios from 'axios';

const ProfileModal = ({ isOpen, onClose, user, onLogout }) => {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    // Validaciones
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Todos los campos son obligatorios' });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas nuevas no coinciden' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'La nueva contraseña debe tener al menos 6 caracteres' });
      return;
    }

    setIsProcessing(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setMessage({ type: 'success', text: '¡Contraseña cambiada exitosamente!' });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => {
          setShowChangePassword(false);
          setMessage({ type: '', text: '' });
        }, 2000);
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Error al cambiar la contraseña' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('¿Estás seguro que deseas cerrar sesión?')) {
      onLogout();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        borderRadius: '20px',
        padding: '30px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        border: '2px solid rgba(255, 215, 0, 0.3)',
        position: 'relative',
        animation: 'slideInDown 0.3s ease-out'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '25px',
          paddingBottom: '15px',
          borderBottom: '2px solid rgba(255, 215, 0, 0.3)'
        }}>
          <h2 style={{
            margin: 0,
            color: '#ffd700',
            fontSize: '1.8rem',
            fontWeight: 'bold',
            textShadow: '0 2px 10px rgba(255, 215, 0, 0.5)'
          }}>
            👤 Mi Perfil
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '5px',
              display: 'flex',
              alignItems: 'center',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'scale(1.2)'}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          >
            <FaTimes />
          </button>
        </div>

        {!showChangePassword ? (
          <>
            {/* Usuario */}
            <div style={{
              padding: '20px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              marginBottom: '20px',
              border: '1px solid rgba(255, 215, 0, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                <FaUser style={{ color: '#ffd700', fontSize: '1.5rem' }} />
                <div>
                  <p style={{ margin: 0, color: '#aaa', fontSize: '0.85rem' }}>Usuario</p>
                  <p style={{ margin: 0, color: '#fff', fontSize: '1.2rem', fontWeight: 'bold' }}>
                    {user?.username || 'Jugador'}
                  </p>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <button
                onClick={() => setShowChangePassword(true)}
                style={{
                  background: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '15px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(76, 175, 80, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 15px rgba(76, 175, 80, 0.3)';
                }}
              >
                <FaKey /> Cambiar Contraseña
              </button>

              <button
                onClick={handleLogout}
                style={{
                  background: 'linear-gradient(135deg, #f44336 0%, #c62828 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '15px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 4px 15px rgba(244, 67, 54, 0.3)',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(244, 67, 54, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 15px rgba(244, 67, 54, 0.3)';
                }}
              >
                <FaSignOutAlt /> Cerrar Sesión
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Formulario de cambio de contraseña */}
            <button
              onClick={() => {
                setShowChangePassword(false);
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setMessage({ type: '', text: '' });
              }}
              style={{
                background: 'transparent',
                color: '#ffd700',
                border: 'none',
                cursor: 'pointer',
                marginBottom: '20px',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              ← Volver
            </button>

            <form onSubmit={handleChangePassword}>
              {/* Contraseña actual */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#aaa', marginBottom: '8px', fontSize: '0.9rem' }}>
                  Contraseña Actual
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      paddingRight: '45px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 215, 0, 0.3)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '1rem'
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: '#ffd700',
                      cursor: 'pointer',
                      fontSize: '1.2rem'
                    }}
                  >
                    {showPasswords.current ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              {/* Nueva contraseña */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#aaa', marginBottom: '8px', fontSize: '0.9rem' }}>
                  Nueva Contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      paddingRight: '45px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 215, 0, 0.3)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '1rem'
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: '#ffd700',
                      cursor: 'pointer',
                      fontSize: '1.2rem'
                    }}
                  >
                    {showPasswords.new ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              {/* Confirmar contraseña */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#aaa', marginBottom: '8px', fontSize: '0.9rem' }}>
                  Confirmar Nueva Contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      paddingRight: '45px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 215, 0, 0.3)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '1rem'
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: '#ffd700',
                      cursor: 'pointer',
                      fontSize: '1.2rem'
                    }}
                  >
                    {showPasswords.confirm ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              {/* Mensaje */}
              {message.text && (
                <div style={{
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '15px',
                  background: message.type === 'success' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                  border: `1px solid ${message.type === 'success' ? '#4CAF50' : '#f44336'}`,
                  color: message.type === 'success' ? '#4CAF50' : '#f44336',
                  fontSize: '0.9rem'
                }}>
                  {message.text}
                </div>
              )}

              {/* Botón de envío */}
              <button
                type="submit"
                disabled={isProcessing}
                style={{
                  width: '100%',
                  background: isProcessing ? '#666' : 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '15px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
                  transition: 'all 0.3s'
                }}
              >
                {isProcessing ? 'Procesando...' : 'Cambiar Contraseña'}
              </button>
            </form>
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default ProfileModal;
