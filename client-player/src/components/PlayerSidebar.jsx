import React, { useState, useEffect } from 'react';
import { FaUser, FaWallet, FaTicketAlt, FaHeadset, FaTimes, FaBars, FaEye, FaEyeSlash, FaHome, FaMusic, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../styles/PlayerSidebar.css';
import bronzeIcon from '../assets/bronze_icon.png';
import audioService from '../services/audioService';

const PlayerSidebar = ({ isOpen, onToggle, themeColor = '#00ffff', accentColor = '#ff00ff' }) => {
  const navigate = useNavigate();
  const [showBalance, setShowBalance] = useState(false);
  const [audioStatus, setAudioStatus] = useState({ musicEnabled: true, efectosEnabled: true });
  const [ticketsExpanded, setTicketsExpanded] = useState(false); // Colapsable cartones
  const [audioExpanded, setAudioExpanded] = useState(false); // Colapsable audio
  const [showChangePassword, setShowChangePassword] = useState(false); // Modal cambiar contraseña
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
  const [userData, setUserData] = useState({
    username: 'JugadorPro24',
    balance: 12500,
    tickets: {
      starter: 3,
      bronze: 5,
      silver: 2,
      gold: 1
    }
  });

  // TODO: Cargar datos reales del usuario desde API
  useEffect(() => {
    // Actualizar estado inicial del audio
    setAudioStatus(audioService.getStatus());
    
    // Aquí iría la llamada a la API para obtener datos del usuario
    // const fetchUserData = async () => {
    //   const response = await fetch('/api/user/profile');
    //   const data = await response.json();
    //   setUserData(data);
    // };
    // fetchUserData();
  }, []);
  
  const toggleMusic = () => {
    const newState = audioService.toggleMusic();
    setAudioStatus(audioService.getStatus());
    console.log(`🎵 Música ${newState ? 'activada' : 'desactivada'}`);
  };
  
  const toggleEfectos = () => {
    const newState = audioService.toggleEfectos();
    setAudioStatus(audioService.getStatus());
    console.log(`🔊 Efectos ${newState ? 'activados' : 'desactivados'}`);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleGoToLobby = () => {
    navigate('/lobby');
  };

  const handleSupport = () => {
    // TODO: Abrir modal de soporte o redirigir
    console.log('Abrir soporte');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('❌ Las contraseñas no coinciden');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      alert('❌ La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    try {
      const token = localStorage.getItem('playerToken');
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });
      
      if (response.ok) {
        alert('✅ Contraseña cambiada exitosamente');
        setShowChangePassword(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const data = await response.json();
        alert('❌ ' + (data.error || 'Error al cambiar la contraseña'));
      }
    } catch (error) {
      alert('❌ Error al cambiar la contraseña');
    }
  };

  return (
    <>
      {/* Botón flotante para abrir sidebar */}
      <button 
        className={`sidebar-toggle-btn ${isOpen ? 'hidden' : ''}`}
        onClick={onToggle}
        title="Abrir menú"
        style={{ backgroundColor: themeColor, borderColor: themeColor }}
      >
        <FaBars style={{ color: '#1a1310' }} />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div className="sidebar-overlay" onClick={onToggle}></div>
      )}

      {/* Sidebar */}
      <aside className={`player-sidebar ${isOpen ? 'open' : ''}`} style={{
        '--theme-color': themeColor,
        '--accent-color': accentColor,
        borderLeft: `3px solid ${themeColor}`,
        boxShadow: `-5px 0 20px ${themeColor}40`
      }}>
        {/* Header */}
        <div className="sidebar-header" style={{
          borderBottom: `2px solid ${themeColor}`
        }}>
          <h3 className="sidebar-title" style={{ color: themeColor }}>Mi Perfil</h3>
          <button className="sidebar-close-btn" onClick={onToggle} style={{
            color: themeColor,
            borderColor: themeColor
          }}>
            <FaTimes />
          </button>
        </div>

        {/* Usuario */}
        <div className="sidebar-section" style={{ borderBottom: `1px solid ${themeColor}30` }}>
          <div className="sidebar-item user-info">
            <FaUser className="sidebar-icon user-icon" style={{ color: themeColor }} />
            <div className="sidebar-item-content">
              <span className="sidebar-label">Usuario</span>
              <span className="sidebar-value username" style={{ color: accentColor }}>{userData.username}</span>
            </div>
          </div>
          
          {/* Botón Cambiar Contraseña */}
          <button 
            className="change-password-btn" 
            onClick={() => setShowChangePassword(true)}
            style={{ 
              color: themeColor,
              borderColor: `${themeColor}50`,
              marginTop: '10px',
              width: '100%',
              padding: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = `${themeColor}20`;
              e.target.style.borderColor = themeColor;
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.05)';
              e.target.style.borderColor = `${themeColor}50`;
            }}
          >
            🔑 Cambiar Contraseña
          </button>
        </div>

        {/* Saldo */}
        <div className="sidebar-section" style={{ borderBottom: `1px solid ${themeColor}30` }}>
          <div className="sidebar-item balance-info" onClick={() => setShowBalance(!showBalance)}>
            <img src={bronzeIcon} alt="Saldo" className="sidebar-balance-icon" style={{ filter: 'sepia(1) saturate(3) hue-rotate(10deg) brightness(0.9)' }} />
            <div className="sidebar-item-content">
              <span className="sidebar-label">Saldo</span>
              {showBalance ? (
                <span className="sidebar-value balance" style={{ color: accentColor }}>{formatCurrency(userData.balance)}</span>
              ) : (
                <span className="sidebar-value balance hidden">•••••••</span>
              )}
            </div>
            <button 
              className="balance-toggle-btn" 
              onClick={(e) => { e.stopPropagation(); setShowBalance(!showBalance); }}
              style={{ color: themeColor, borderColor: themeColor }}
            >
              {showBalance ? <FaEye /> : <FaEyeSlash />}
            </button>
          </div>
        </div>

        {/* Mis Cartones - Colapsable */}
        <div className="sidebar-section" style={{ borderBottom: `1px solid ${themeColor}30` }}>
          <div 
            className="sidebar-section-header collapsible" 
            onClick={() => setTicketsExpanded(!ticketsExpanded)}
          >
            <FaTicketAlt className="section-icon" style={{ color: themeColor }} />
            <h4 className="section-title" style={{ color: accentColor }}>Mis Cartones</h4>
            <span className={`expand-icon ${ticketsExpanded ? 'expanded' : ''}`} style={{ color: themeColor }}>▼</span>
          </div>
          
          {ticketsExpanded && (
            <div className="tickets-list">
              <div className="ticket-item starter">
                <span className="ticket-room">Starter</span>
                <span className="ticket-count">{userData.tickets.starter}</span>
              </div>
              <div className="ticket-item bronze">
                <span className="ticket-room">Bronce</span>
                <span className="ticket-count">{userData.tickets.bronze}</span>
              </div>
              <div className="ticket-item silver">
                <span className="ticket-room">Plata</span>
                <span className="ticket-count">{userData.tickets.silver}</span>
              </div>
              <div className="ticket-item gold">
                <span className="ticket-room">Oro</span>
                <span className="ticket-count">{userData.tickets.gold}</span>
              </div>
            </div>
          )}
        </div>

        {/* Botones de Acción */}
        <div className="sidebar-actions">
          <button className="sidebar-action-btn lobby-btn" onClick={handleGoToLobby} style={{ borderColor: themeColor }}>
            <FaHome className="action-icon" style={{ color: themeColor }} />
            <span>Volver al Lobby</span>
          </button>
          
          <button className="sidebar-action-btn support-btn" onClick={handleSupport} style={{ borderColor: themeColor }}>
            <FaHeadset className="action-icon" style={{ color: themeColor }} />
            <span>Soporte Técnico</span>
          </button>
        </div>
        
        {/* Controles de Audio - Colapsable */}
        <div className="sidebar-section audio-controls-section" style={{ borderBottom: `1px solid ${themeColor}30` }}>
          <div 
            className="sidebar-section-header collapsible"
            onClick={() => setAudioExpanded(!audioExpanded)}
          >
            <h4 className="section-title" style={{ color: accentColor }}>Audio</h4>
            <span className={`expand-icon ${audioExpanded ? 'expanded' : ''}`} style={{ color: themeColor }}>▼</span>
          </div>
          
          {audioExpanded && (
            <div className="audio-controls">
              <button 
                className={`audio-control-btn ${audioStatus.musicEnabled ? 'active' : ''}`}
                onClick={toggleMusic}
                title={audioStatus.musicEnabled ? 'Desactivar música' : 'Activar música'}
                style={audioStatus.musicEnabled ? { backgroundColor: `${themeColor}30`, borderColor: themeColor, color: accentColor } : { borderColor: `${themeColor}50` }}
              >
                {audioStatus.musicEnabled ? <FaMusic style={{ color: themeColor }} /> : <FaVolumeMute />}
                <span>{audioStatus.musicEnabled ? 'Música ON' : 'Música OFF'}</span>
              </button>
              
              <button 
                className={`audio-control-btn ${audioStatus.efectosEnabled ? 'active' : ''}`}
                onClick={toggleEfectos}
                title={audioStatus.efectosEnabled ? 'Desactivar efectos' : 'Activar efectos'}
                style={audioStatus.efectosEnabled ? { backgroundColor: `${themeColor}30`, borderColor: themeColor, color: accentColor } : { borderColor: `${themeColor}50` }}
              >
                {audioStatus.efectosEnabled ? <FaVolumeUp style={{ color: themeColor }} /> : <FaVolumeMute />}
                <span>{audioStatus.efectosEnabled ? 'Efectos ON' : 'Efectos OFF'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <span className="sidebar-version">v1.3.0</span>
        </div>
      </aside>

      {/* Modal de Cambiar Contraseña */}
      {showChangePassword && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem'
          }}
          onClick={() => setShowChangePassword(false)}
        >
          <div 
            style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              borderRadius: '1rem',
              padding: '2rem',
              maxWidth: '400px',
              width: '100%',
              border: `2px solid ${themeColor}`,
              boxShadow: `0 0 30px ${themeColor}50`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ 
              color: themeColor, 
              marginBottom: '1.5rem', 
              textAlign: 'center',
              fontSize: '1.5rem',
              fontWeight: 'bold'
            }}>
              🔑 Cambiar Contraseña
            </h3>

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Contraseña Actual */}
              <div>
                <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  Contraseña Actual:
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem 2.5rem 0.75rem 1rem',
                      background: '#0f172a',
                      border: '1px solid #475569',
                      borderRadius: '0.5rem',
                      color: 'white',
                      fontSize: '1rem'
                    }}
                    placeholder="Tu contraseña actual"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '1.2rem'
                    }}
                  >
                    {showPasswords.current ? '👁' : '🔒'}
                  </button>
                </div>
              </div>

              {/* Nueva Contraseña */}
              <div>
                <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  Nueva Contraseña:
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem 2.5rem 0.75rem 1rem',
                      background: '#0f172a',
                      border: '1px solid #475569',
                      borderRadius: '0.5rem',
                      color: 'white',
                      fontSize: '1rem'
                    }}
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '1.2rem'
                    }}
                  >
                    {showPasswords.new ? '👁' : '🔒'}
                  </button>
                </div>
              </div>

              {/* Confirmar Contraseña */}
              <div>
                <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  Confirmar Nueva Contraseña:
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem 2.5rem 0.75rem 1rem',
                      background: '#0f172a',
                      border: '1px solid #475569',
                      borderRadius: '0.5rem',
                      color: 'white',
                      fontSize: '1rem'
                    }}
                    placeholder="Confirma tu nueva contraseña"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '1.2rem'
                    }}
                  >
                    {showPasswords.confirm ? '👁' : '🔒'}
                  </button>
                </div>
              </div>

              {/* Botones */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePassword(false);
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: '#374151',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: `linear-gradient(135deg, ${themeColor} 0%, ${accentColor} 100%)`,
                    color: '#0f172a',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    boxShadow: `0 4px 15px ${themeColor}40`
                  }}
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default PlayerSidebar;

