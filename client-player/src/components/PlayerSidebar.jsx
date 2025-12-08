import React, { useState, useEffect } from 'react';
import { FaUser, FaWallet, FaTicketAlt, FaHeadset, FaTimes, FaBars, FaEye, FaEyeSlash, FaHome } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../styles/PlayerSidebar.css';
import bronzeIcon from '../assets/bronze_icon.png';

const PlayerSidebar = ({ isOpen, onToggle }) => {
  const navigate = useNavigate();
  const [showBalance, setShowBalance] = useState(false);
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
    // Aquí iría la llamada a la API para obtener datos del usuario
    // const fetchUserData = async () => {
    //   const response = await fetch('/api/user/profile');
    //   const data = await response.json();
    //   setUserData(data);
    // };
    // fetchUserData();
  }, []);

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
      >
        <FaBars />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div className="sidebar-overlay" onClick={onToggle}></div>
      )}

      {/* Sidebar */}
      <aside className={`player-sidebar ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          <h3 className="sidebar-title">Mi Perfil</h3>
          <button className="sidebar-close-btn" onClick={onToggle}>
            <FaTimes />
          </button>
        </div>

        {/* Usuario */}
        <div className="sidebar-section">
          <div className="sidebar-item user-info">
            <FaUser className="sidebar-icon user-icon" />
            <div className="sidebar-item-content">
              <span className="sidebar-label">Usuario</span>
              <span className="sidebar-value username">{userData.username}</span>
            </div>
          </div>
        </div>

        {/* Saldo */}
        <div className="sidebar-section">
          <div className="sidebar-item balance-info" onClick={() => setShowBalance(!showBalance)}>
            <img src={bronzeIcon} alt="Saldo" className="sidebar-balance-icon" />
            <div className="sidebar-item-content">
              <span className="sidebar-label">Saldo</span>
              {showBalance ? (
                <span className="sidebar-value balance">{formatCurrency(userData.balance)}</span>
              ) : (
                <span className="sidebar-value balance hidden">•••••••</span>
              )}
            </div>
            <button 
              className="balance-toggle-btn" 
              onClick={(e) => { e.stopPropagation(); setShowBalance(!showBalance); }}
            >
              {showBalance ? <FaEye /> : <FaEyeSlash />}
            </button>
          </div>
        </div>

        {/* Mis Cartones */}
        <div className="sidebar-section">
          <div className="sidebar-section-header">
            <FaTicketAlt className="section-icon" />
            <h4 className="section-title">Mis Cartones</h4>
          </div>
          
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
        </div>

        {/* Botones de Acción */}
        <div className="sidebar-actions">
          <button className="sidebar-action-btn lobby-btn" onClick={handleGoToLobby}>
            <FaHome className="action-icon" />
            <span>Volver al Lobby</span>
          </button>
          
          <button className="sidebar-action-btn support-btn" onClick={handleSupport}>
            <FaHeadset className="action-icon" />
            <span>Soporte Técnico</span>
          </button>
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
