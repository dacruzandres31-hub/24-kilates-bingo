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
    </>
  );
};

export default PlayerSidebar;
