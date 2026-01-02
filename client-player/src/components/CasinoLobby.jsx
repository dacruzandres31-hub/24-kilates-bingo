import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/CasinoLobby.css';
import '../styles/Countdown.css';
import '../styles/LiveDrawBadge.css';
import '../styles/LobbyCompact.css';
import Countdown from './Countdown';
import PlayerActivityHistory from './PlayerActivityHistory';
import { FaClock, FaUsers, FaMoneyBillWave, FaTrophy, FaStar, FaGlassCheers, FaGift, FaHeadset, FaTicketAlt, FaEye, FaEyeSlash, FaMusic, FaVolumeUp, FaVolumeMute, FaUser, FaKey, FaSignOutAlt, FaMapMarkedAlt, FaShoppingCart, FaCrown, FaGem } from 'react-icons/fa';

import logo from '../assets/logo.png';
import giftIcon from '../assets/Gift_icon.png';
import bronzeIcon from '../assets/bronze_icon.png';
import silverIcon from '../assets/silver_icon.png';
import goldIcon from '../assets/gold_icon.png';
import lobbyBackground from '../assets/lobby-background.jpg';

import audioService from '../services/audioService';
import BattlePass from './Gamification/BattlePass';
import ChatWidget from './Gamification/ChatWidget';
import LeaderboardWidget from './Gamification/LeaderboardWidget';
import WinnersTicker from './WinnersTicker';
import SupportModal from './Support/SupportModal';
import CustomTour from './CustomTour';
import WithdrawalModal from './Withdrawal/WithdrawalModal';
import FortuneWheel from './Gamification/FortuneWheel';
import useSocket from '../hooks/useSocket';
import uiHelper from '../helpers/uiHelper';
import HotPotNotification from './Notifications/HotPotNotification';
import CardPurchaseCalculator from './CardPurchaseCalculator';
import ReferralDashboard from './Referral/ReferralDashboard';
import { FaShareAlt, FaCheck } from 'react-icons/fa';

const getTargetTime = (hour) => {
  const target = new Date();
  target.setHours(hour, 0, 0, 0);
  if (target < new Date()) {
    target.setDate(target.getDate() + 1);
  }
  return target;
};

const RoomCard = ({ room }) => {
  const statusText = {
    active: 'Habilitada',
    playing: 'Sorteando',
    closed: 'Cerrada',
  };

  const renderParticles = () => {
    return Array.from({ length: 10 }).map((_, i) => (
      <div
        key={i}
        className="particle"
        style={{
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 8}s`,
          width: `${Math.random() * 3 + 1}px`,
          height: `${Math.random() * 3 + 1}px`,
        }}
      />
    ));
  };

  return (
    <Link to={room.path} className={`room-link ${room.className} ${room.featured ? 'featured' : ''}`} id={room.id === 'starter' ? 'btn-room-starter' : undefined}>
      <div className="room-card">
        {room.id === 'starter' && (
          <div className="ribbon-wrapper">
            <div className="ribbon">GRATIS</div>
          </div>
        )}

        {room.isLive && (
          <div className="live-draw-badge">
            <span className="live-dot"></span>
            EN VIVO
          </div>
        )}

        <div className="room-particles">{renderParticles()}</div>
        <div className="room-texture"></div>
        <div className="room-shine"></div>

        {room.status && (
          <div className={`room-status-badge ${room.status}`}>
            {statusText[room.status]}
          </div>
        )}

        <div className="room-icon">
          <img
            src={room.iconImage}
            alt={room.name}
            className="room-icon-img"
            loading="eager"
            decoding="async"
            fetchpriority="high"
            style={{ imageRendering: 'crisp-edges' }}
          />
        </div>
        <h3 className="room-name">{room.name}</h3>
        <div className="room-time">
          <Countdown targetDate={room.targetTime} />
        </div>
        <p className="room-description">{room.description}</p>

        <div className="room-divider"></div>

        <div className="room-price-section">
          <div className="price-label">Cartón</div>
          <div className="room-price">{room.price}</div>
        </div>

        {room.pots ? (
          <div className="room-pots-container">
            <div className="pot-main">
              <div className="pot-label">Pozo Bingo</div>
              <div className="pot-amount">{room.pots.bingo}</div>
            </div>
            <div className="pots-secondary">
              <div className="pot-secondary">
                <FaTrophy className="pot-secondary-icon" />
                <div className="pot-secondary-info">
                  <div className="pot-secondary-label">Línea</div>
                  <div className="pot-secondary-amount">{room.pots.line}</div>
                </div>
              </div>
              <div className="pot-secondary">
                <FaStar className="pot-secondary-icon" />
                <div className="pot-secondary-info">
                  <div className="pot-secondary-label">Pre-40</div>
                  <div className="pot-secondary-amount">{room.pots.pre40}</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="starter-rewards">
            <div className="price-label">Premios</div>
            {room.prizes ? (
              <div className="rewards-details">
                <div className="reward-item">
                  <span className="reward-label">Línea:</span>
                  <span className="reward-value">
                    {room.prizes.line.quantity}x 🎫 {room.prizes.line.room === 'bronce' ? '🥉' : room.prizes.line.room === 'plata' ? '🥈' : '🥇'}
                  </span>
                </div>
                <div className="reward-item">
                  <span className="reward-label">Bingo:</span>
                  <span className="reward-value">
                    {room.prizes.bingo.quantity}x 🎫 {room.prizes.bingo.room === 'bronce' ? '🥉' : room.prizes.bingo.room === 'plata' ? '🥈' : '🥇'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="rewards-icons">
                {room.rewards.map((reward, index) => (
                  <FaGift key={index} className="reward-icon" />
                ))}
              </div>
            )}
          </div>
        )}

        <button className="room-enter-btn">Entrar</button>
      </div>
    </Link>
  );
};

const CasinoLobby = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userData, setUserData] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showActivityHistory, setShowActivityHistory] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
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
  const [passwordStrength, setPasswordStrength] = useState({ level: 0, text: '', color: '' });
  const [showBattlePass, setShowBattlePass] = useState(false);
  const [showWheel, setShowWheel] = useState(false);
  const [runTour, setRunTour] = useState(false);
  const [activeHotPot, setActiveHotPot] = useState(null);
  const [showReferralDashboard, setShowReferralDashboard] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [showCardPurchase, setShowCardPurchase] = useState(false);
  const [showTicketsDropdown, setShowTicketsDropdown] = useState(false);

  // Estado de audio
  const [audioStatus, setAudioStatus] = useState({
    musicEnabled: audioService.enabled,
    efectosEnabled: audioService.efectosEnabled,
  });

  // NUEVO: Estado para datos dinámicos del lobby
  const [lobbyData, setLobbyData] = useState(null);
  const [loadingLobby, setLoadingLobby] = useState(true);
  const [wheelReady, setWheelReady] = useState(false);

  // Sockets y lógica
  const socket = useSocket();

  // Estado para rastrear sorteos en vivo por sala
  const [liveDraws, setLiveDraws] = useState({
    starter: false,
    bronce: false,
    plata: false,
    oro: false
  });

  // Cargar perfil
  useEffect(() => {
    loadUserProfile();
  }, []);

  // Socket Listeners
  useEffect(() => {
    if (!socket) return;

    const handleResourcesUpdated = (data) => {
      setUserData(prev => {
        if (!prev) return prev;
        const updated = { ...prev };
        if (data.balance !== undefined) updated.balance = data.balance;
        if (data.cartones || data.tickets) {
          const c = data.cartones || data.tickets;
          updated.tickets = {
            bronze: c.bronce ?? c.bronze ?? prev.tickets?.bronze ?? 0,
            silver: c.plata ?? c.silver ?? prev.tickets?.silver ?? 0,
            gold: c.oro ?? c.gold ?? prev.tickets?.gold ?? 0
          };
        }
        return updated;
      });
    };

    socket.on('resources_updated', handleResourcesUpdated);
    socket.on('pots_updated', (data) => {
      setLobbyData(prev => {
        if (!prev || !prev[data.room]) return prev;
        return {
          ...prev,
          [data.room]: {
            ...prev[data.room],
            pots: {
              bingo: data.pots.jackpot_bingo,
              line: data.pots.jackpot_linea,
              pre40: data.pots.jackpot_pre40
            }
          }
        };
      });
    });
    socket.on('hot_pot_alert', setActiveHotPot);

    return () => {
      socket.off('resources_updated', handleResourcesUpdated);
      socket.off('pots_updated');
      socket.off('hot_pot_alert');
    };
  }, [socket]);

  // Load Lobby Data
  useEffect(() => {
    loadLobbyData();
    const interval = setInterval(loadLobbyData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadLobbyData = async () => {
    try {
      const token = localStorage.getItem('playerToken') || localStorage.getItem('token');
      const response = await axios.get('/api/game/lobby-data', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) setLobbyData(response.data.data);
    } catch (error) {
      console.error('Error loading lobby data', error);
    } finally {
      setLoadingLobby(false);
    }
  };

  // Wheel Status
  const checkWheelStatus = async () => {
    try {
      const token = localStorage.getItem('playerToken') || localStorage.getItem('token');
      const response = await axios.get('/api/gamification/wheel/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWheelReady(response.data.canSpin);
    } catch (error) {
      console.error('Error checking wheel status', error);
    }
  };

  useEffect(() => {
    checkWheelStatus();
    const interval = setInterval(checkWheelStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSpinComplete = () => {
    localStorage.setItem('last_wheel_spin', Date.now().toString());
    setWheelReady(false);
  };

  const handleTourEnd = () => {
    setRunTour(false);
    localStorage.setItem('tutorial_seen', 'true');
  };

  const handleRestartTour = () => {
    setRunTour(true);
    setShowProfileMenu(false);
  };

  const copyReferralLink = () => {
    if (!userData?.referral_code) return;
    const link = `${window.location.origin}/register?ref=${userData.referral_code}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Rooms Data Construction
  const getRoomsData = () => {
    const baseRooms = [
      {
        id: 'starter', backendId: 'starter', name: 'Starter', path: '/sala/starter',
        status: 'active', targetTime: getTargetTime(19), description: 'Premios en tickets.',
        className: 'room-turquoise', iconImage: giftIcon, rewards: ['ticket', 'ticket', 'ticket', 'ticket'], featured: false,
      },
      {
        id: 'bronze', backendId: 'bronce', name: 'Bronce', path: '/sala/bronce',
        status: 'active', targetTime: getTargetTime(20), description: 'Sala clásica.',
        className: 'room-bronze', iconImage: bronzeIcon, featured: false,
      },
      {
        id: 'silver', backendId: 'plata', name: 'Plata', path: '/sala/plata',
        status: 'active', targetTime: getTargetTime(21), description: 'Apuestas altas.',
        className: 'room-silver', iconImage: silverIcon, featured: false,
      },
      {
        id: 'gold', backendId: 'oro', name: 'Oro', path: '/sala/oro',
        status: 'active', targetTime: getTargetTime(22), description: 'Experiencia VIP.',
        className: 'room-gold', iconImage: goldIcon, featured: true,
      },
    ];

    if (!lobbyData) return baseRooms.map(room => ({
      ...room,
      price: room.id === 'starter' ? 'Tickets' : '$...',
      pots: room.id !== 'starter' ? { bingo: '$...', line: '$...', pre40: '$...' } : undefined
    }));

    return baseRooms.map(room => {
      const roomData = lobbyData[room.backendId];
      if (!roomData) return {
        ...room,
        price: room.id === 'starter' ? 'Tickets' : '$...',
        pots: room.id !== 'starter' ? { bingo: '$...', line: '$...', pre40: '$...' } : undefined
      };

      return {
        ...room,
        path: roomData.sessionId ? `${room.path}/${roomData.sessionId}` : room.path,
        targetTime: roomData.nextSession ? new Date(roomData.nextSession) : room.targetTime,
        status: roomData.status || 'no_session',
        price: room.id === 'starter' ? 'Tickets' : uiHelper.formatCurrency(roomData.price),
        prizes: room.id === 'starter' ? roomData.prizes : undefined,
        pots: room.id !== 'starter' ? {
          bingo: uiHelper.formatCurrency(roomData.pots.bingo),
          line: uiHelper.formatCurrency(roomData.pots.line),
          pre40: uiHelper.formatCurrency(roomData.pots.pre40),
        } : undefined
      };
    });
  };

  const roomsData = getRoomsData();

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    if (strength <= 2) return { level: 1, text: 'Débil', color: 'text-red-500' };
    if (strength <= 3) return { level: 2, text: 'Media', color: 'text-yellow-500' };
    return { level: 3, text: 'Fuerte', color: 'text-green-500' };
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('❌ Las contraseñas no coinciden');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      alert('❌ Mínimo 6 caracteres');
      return;
    }
    try {
      const token = localStorage.getItem('playerToken') || localStorage.getItem('token');
      await axios.post('/api/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      }, { headers: { Authorization: `Bearer ${token}` } });
      alert('✅ Contraseña cambiada');
      setShowChangePasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      alert('❌ ' + (error.response?.data?.error || 'Error'));
    }
  };

  const loadUserProfile = async () => {
    try {
      const token = localStorage.getItem('playerToken') || localStorage.getItem('token');
      if (!token) return;
      const response = await axios.get('/api/users/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setUserData(response.data);
    } catch (error) {
      console.error('Error loading profile', error);
    }
  };

  // Audio Handlers
  const toggleMusic = () => {
    const newStatus = audioService.toggleMusic();
    setAudioStatus(prev => ({ ...prev, musicEnabled: newStatus }));
  };
  const toggleEfectos = () => {
    const newStatus = audioService.toggleEfectos();
    setAudioStatus(prev => ({ ...prev, efectosEnabled: newStatus }));
  };

  // Reloj
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Audio click lobby
  useEffect(() => {
    let activated = false;
    const handleClick = () => {
      if (!activated) {
        activated = true;
        audioService.playForRoom('lobby');
        document.removeEventListener('click', handleClick);
      }
    };
    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  const renderVIPBadge = () => {
    if (!userData?.plan) return null;
    const planName = userData.plan.name.toLowerCase();

    let badgeClass = '';
    let badgeText = '';
    let icon = null;

    if (planName.includes('bronce')) {
      badgeClass = 'bronze';
      badgeText = 'BRONCE';
      icon = <FaStar />;
    } else if (planName.includes('plata')) {
      badgeClass = 'silver';
      badgeText = 'PLATA';
      icon = <FaGem />;
    } else if (planName.includes('oro')) {
      badgeClass = 'gold';
      badgeText = 'ORO';
      icon = <FaCrown />;
    } else if (planName.includes('embajador')) {
      badgeClass = 'ambassador';
      badgeText = 'EMBAJADOR';
      icon = <FaCrown />;
    } else {
      return null;
    }

    return (
      <div className={`vip-badge ${badgeClass}`}>
        {icon} {badgeText}
      </div>
    );
  };

  return (
    <div className={`casino-lobby ${showWheel ? 'wheel-open' : ''}`} style={{ '--lobby-bg-image': `url(${lobbyBackground})` }}>
      {/* ... existing code ... */}
      <div className="user-top-bar" id="user-main-bar">
        <div className="user-info-section">
          <span className="user-name">👤 {user?.username || 'Usuario'}</span>
          {renderVIPBadge()}
          <div className="user-resources">
            <span className="balance">
              💰 {uiHelper.formatCurrencyFlexible(userData?.balance)}
            </span>

            <div className="profile-menu-container">
              <button
                id="cartones-dropdown-btn"
                className="btn-profile"
                onClick={() => setShowTicketsDropdown(!showTicketsDropdown)}
              >
                <span style={{ fontSize: '1.2rem' }}>🎴</span>
                <span>Cartones</span>
              </button>

              {showTicketsDropdown && (
                <div className="profile-dropdown" style={{ minWidth: '150px', left: 0, right: 'auto' }}>
                  <div className="dropdown-item" style={{ cursor: 'default' }}>
                    <span>🥉 Bronce: {userData?.tickets?.bronze || 0}</span>
                  </div>
                  <div className="dropdown-item" style={{ cursor: 'default' }}>
                    <span>🥈 Plata: {userData?.tickets?.silver || 0}</span>
                  </div>
                  <div className="dropdown-item" style={{ cursor: 'default' }}>
                    <span>🥇 Oro: {userData?.tickets?.gold || 0}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="user-actions">
          <button
            id="btn-history"
            className="btn-profile btn-history"
            onClick={() => setShowActivityHistory(true)}
          >
            <FaStar />

            <span>Mi Historial</span>

          </button>

          <button
            id="btn-support"
            className="btn-profile btn-support"
            style={{
              background: 'linear-gradient(45deg, #4f46e5, #4338ca)',
              color: 'white',
              fontWeight: 'bold',
              border: '2px solid rgba(255,255,255,0.2)',
              marginRight: '8px'
            }}
            onClick={() => setShowSupport(true)}
            title="Soporte Técnico"
          >
            <FaHeadset />
          </button>

          <button
            id="withdraw-btn"
            className="btn-profile btn-withdrawal"
            style={{
              background: 'linear-gradient(45deg, #10B981, #059669)',
              color: 'white',
              fontWeight: 'bold',
              border: '2px solid rgba(255,255,255,0.2)',
              marginRight: '8px'
            }}
            onClick={() => setShowWithdrawal(true)}
            title="Retirar Premios"
          >
            <FaMoneyBillWave />
            <span style={{ marginLeft: '5px' }}>Retirar</span>
          </button>

          <button
            id="battlepass-btn"
            className="btn-profile btn-battlepass"
            style={{
              background: 'linear-gradient(45deg, #FFD700, #FFA500)',
              color: 'black',
              fontWeight: 'bold',
              border: '2px solid #FFF'
            }}
            onClick={() => setShowBattlePass(true)}
          >
            <FaTrophy />
            <span>BINGO PASS</span>
          </button>

          <button
            id="club-vip-btn"
            className="btn-profile btn-vip"
            onClick={() => navigate('/membresia')}
          >
            <FaCrown className="vip-icon" />
            <span>CLUB VIP</span>
          </button>

          <button
            id="referrals-btn"
            className="btn-profile btn-referral"
            style={{
              background: 'linear-gradient(45deg, #8b5cf6, #6366f1)',
              color: 'white',
              fontWeight: 'bold',
              border: '2px solid rgba(255,255,255,0.2)',
              marginRight: '8px'
            }}
            onClick={() => setShowReferralDashboard(true)}
          >
            <FaUsers />
            <span>REFERIDOS</span>
          </button>

          <button
            id="invite-btn"
            className={`btn-profile btn-invite ${copiedLink ? 'bg-emerald-600' : ''}`}
            style={{
              background: copiedLink ? '#10b981' : 'linear-gradient(45deg, #f59e0b, #d97706)',
              color: 'white',
              fontWeight: 'bold',
              border: '2px solid rgba(255,255,255,0.2)',
              marginRight: '8px'
            }}
            onClick={copyReferralLink}
          >
            {copiedLink ? <FaCheck /> : <FaShareAlt />}
            <span>{copiedLink ? 'COPIADO' : 'INVITAR'}</span>
          </button>

          <button
            id="wheel-btn"
            className={`btn-profile btn-wheel ${wheelReady ? 'glow-active' : ''}`}
            style={{
              background: 'linear-gradient(45deg, #e1b12c, #fbc531)',
              color: 'black',
              fontWeight: 'bold',
              border: wheelReady ? '2px solid #fff' : '2px solid #FFF',
              marginRight: '8px',
              boxShadow: wheelReady ? '0 0 20px #ffd700, 0 0 40px #ffea00' : 'none',
              animation: wheelReady ? 'pulse-gold 1.5s infinite' : 'none'
            }}
            onClick={() => setShowWheel(true)}
          >
            <FaStar className={wheelReady ? "animate-spin-fast" : "animate-spin-slow"} style={{ animationDuration: wheelReady ? '1s' : '3s' }} />
            <span>FORTUNA</span>
          </button>

          <button
            className="btn-profile btn-purchase"
            style={{
              background: 'linear-gradient(45deg, #10b981, #059669)',
              color: 'white',
              fontWeight: 'bold',
              border: '2px solid #FFF',
              marginRight: '8px'
            }}
            onClick={() => setShowCardPurchase(true)}
            id="btn-purchase"
          >
            <FaShoppingCart />
            <span>COMPRAR</span>
          </button>

          <div className="profile-menu-container" id="profile-section">
            <button
              className="btn-profile"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <FaUser />
              <span>Perfil</span>
            </button>
            {showProfileMenu && (
              <div className="profile-dropdown">
                <button className="dropdown-item" onClick={handleRestartTour}>
                  <FaMapMarkedAlt />
                  <span>Tour por la Página</span>
                </button>
                <button className="dropdown-item" onClick={() => {
                  setShowProfileMenu(false);
                  setShowChangePasswordModal(true);
                }}>
                  <FaKey />
                  <span>Cambiar Contraseña</span>
                </button>
                <button className="dropdown-item logout" onClick={() => {
                  onLogout();
                }}>
                  <FaSignOutAlt />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <CustomTour runTour={runTour} onTourEnd={handleTourEnd} />

      {/* Header con Logo - Oculto si la rueda o el dashboard de referidos están abiertos */}
      {!showWheel && !showReferralDashboard && (
        <header className="lobby-header">
          {/* Stats Izquierda */}
          <div className="header-stats left">
            <div className="stat-card">
              <FaUsers className="stat-icon" />
              <div className="stat-content">
                <div className="stat-value">2,847</div>
                <div className="stat-label">Jugadores Online</div>
              </div>
            </div>
            <div className="stat-card">
              <FaClock className="stat-icon" />
              <div className="stat-content">
                <div className="stat-value">{currentTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</div>
                <div className="stat-label">Hora Argentina</div>
              </div>
            </div>
          </div>

          {/* Logo Central */}
          <div className="logo-container" id="lobby-header-logo">
            <div className="logo-shine"></div>
            <div className="logo-shine"></div>
            <img
              src={logo}
              alt="Bingo 24 Kilates"
              className="logo-image"
              loading="eager"
              decoding="async"
              fetchpriority="high"
              style={{ imageRendering: 'crisp-edges' }}
            />
            <div className="logo-tagline">El Bingo Virtual de Alta Gama</div>
          </div>

          {/* Stats Derecha */}
          <div className="header-stats right">
            <div className="stat-card">
              <FaTrophy className="stat-icon" />
              <div className="stat-content">
                <div className="stat-value">$284,500</div>
                <div className="stat-label">Pagado Hoy</div>
              </div>
            </div>
            <div className="stat-card">
              <FaStar className="stat-icon" />
              <div className="stat-content">
                <div className="stat-value">4/4</div>
                <div className="stat-label">Salas Activas</div>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Grid de Salas */}
      <div className="rooms-grid" id="rooms-grid">
        {roomsData.map((room, index) => (
          <RoomCard
            key={room.id}
            room={{
              ...room,
              isLive: liveDraws[room.backendId] || false
            }}
            style={{ animationDelay: `${index * 100}ms` }}
          />
        ))}
      </div>

      <footer className="lobby-footer">
        <div className="footer-info">
          <div className="info-item">
            <FaUsers className="info-icon" />
            <span>+5,000 Jugadores Activos</span>
          </div>
          <div className="info-item">
            <FaMoneyBillWave className="info-icon" />
            <span>+$150,000 Pagados Hoy</span>
          </div>
          <div className="info-item">
            <FaGlassCheers className="info-icon" />
            <span>Salas VIP Exclusivas</span>
          </div>
        </div>

        <WinnersTicker />

        <div className="container mx-auto px-4 mt-6 mb-2 relative z-10">
          <div className="flex justify-center" id="leaderboard-widget">
            <LeaderboardWidget />
          </div>
        </div>
      </footer>

      {/* MODALS */}
      <SupportModal isOpen={showSupport} onClose={() => setShowSupport(false)} />

      {
        showWithdrawal && (
          <WithdrawalModal onClose={() => setShowWithdrawal(false)} />
        )
      }


      {
        showChangePasswordModal && createPortal(
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
              border: '2px solid rgba(147, 51, 234, 0.5)',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              width: '100%',
              maxWidth: '28rem',
              margin: '0 1rem',
              overflow: 'hidden'
            }}>
              {/* Header */}
              <div style={{
                padding: '1.5rem',
                background: 'linear-gradient(to right, rgb(147, 51, 234), rgb(79, 70, 229))',
                textAlign: 'center'
              }}>
                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: 'white',
                  margin: 0
                }}>
                  🔑 Cambiar Contraseña
                </h3>
              </div>

              {/* Body */}
              <form onSubmit={handleChangePassword} style={{ padding: '1.5rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    color: '#d1d5db',
                    fontWeight: '600',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem'
                  }}>
                    Contraseña Actual:
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPasswords.current ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      style={{
                        width: '100%',
                        backgroundColor: 'rgba(55, 65, 81, 0.5)',
                        border: '1px solid rgb(75, 85, 99)',
                        borderRadius: '0.5rem',
                        padding: '0.75rem 3rem 0.75rem 1rem',
                        color: 'white',
                        outline: 'none'
                      }}
                      placeholder="Ingresa tu contraseña actual"
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
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '1.125rem'
                      }}
                    >
                      {showPasswords.current ? '👁' : '🔒'}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    color: '#d1d5db',
                    fontWeight: '600',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem'
                  }}>
                    Nueva Contraseña:
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPasswords.new ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) => {
                        const newPwd = e.target.value;
                        setPasswordData({ ...passwordData, newPassword: newPwd });
                        setPasswordStrength(calculatePasswordStrength(newPwd));
                      }}
                      style={{
                        width: '100%',
                        backgroundColor: 'rgba(55, 65, 81, 0.5)',
                        border: '1px solid rgb(75, 85, 99)',
                        borderRadius: '0.5rem',
                        padding: '0.75rem 3rem 0.75rem 1rem',
                        color: 'white',
                        outline: 'none'
                      }}
                      placeholder="Mínimo 6 caracteres"
                      required
                      minLength={6}
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
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '1.125rem'
                      }}
                    >
                      {showPasswords.new ? '👁' : '🔒'}
                    </button>
                  </div>
                  {passwordData.newPassword && passwordStrength.level > 0 && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ flex: 1, height: '0.5rem', backgroundColor: 'rgb(75, 85, 99)', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          transition: 'all 0.3s',
                          backgroundColor: passwordStrength.level === 1 ? 'rgb(239, 68, 68)' : passwordStrength.level === 2 ? 'rgb(234, 179, 8)' : 'rgb(34, 197, 94)',
                          width: passwordStrength.level === 1 ? '33.33%' : passwordStrength.level === 2 ? '66.66%' : '100%'
                        }}></div>
                      </div>
                      <span style={{
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: passwordStrength.level === 1 ? 'rgb(239, 68, 68)' : passwordStrength.level === 2 ? 'rgb(234, 179, 8)' : 'rgb(34, 197, 94)'
                      }}>
                        {passwordStrength.text}
                      </span>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    color: '#d1d5db',
                    fontWeight: '600',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem'
                  }}>
                    Confirmar Nueva Contraseña:
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPasswords.confirm ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      style={{
                        width: '100%',
                        backgroundColor: 'rgba(55, 65, 81, 0.5)',
                        border: '1px solid rgb(75, 85, 99)',
                        borderRadius: '0.5rem',
                        padding: '0.75rem 3rem 0.75rem 1rem',
                        color: 'white',
                        outline: 'none'
                      }}
                      placeholder="Repite la nueva contraseña"
                      required
                      minLength={6}
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
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '1.125rem'
                      }}
                    >
                      {showPasswords.confirm ? '👁' : '🔒'}
                    </button>
                  </div>
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowChangePasswordModal(false);
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    }}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      background: 'linear-gradient(to right, rgb(75, 85, 99), rgb(55, 65, 81))',
                      color: 'white',
                      fontWeight: 'bold',
                      borderRadius: '0.75rem',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.background = 'linear-gradient(to right, rgb(107, 114, 128), rgb(75, 85, 99))'}
                    onMouseOut={(e) => e.target.style.background = 'linear-gradient(to right, rgb(75, 85, 99), rgb(55, 65, 81))'}
                  >
                    CANCELAR
                  </button>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      background: 'linear-gradient(to right, rgb(147, 51, 234), rgb(79, 70, 229))',
                      color: 'white',
                      fontWeight: 'bold',
                      borderRadius: '0.75rem',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.background = 'linear-gradient(to right, rgb(168, 85, 247), rgb(99, 102, 241))'}
                    onMouseOut={(e) => e.target.style.background = 'linear-gradient(to right, rgb(147, 51, 234), rgb(79, 70, 229))'}
                  >
                    ✓ CAMBIAR
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )
      }

      {/* Activity History Modal */}
      {
        showActivityHistory && (
          <PlayerActivityHistory onClose={() => setShowActivityHistory(false)} />
        )
      }
      {/* Modal de Battle Pass */}
      {
        showBattlePass && createPortal(
          <BattlePass onClose={() => setShowBattlePass(false)} />,
          document.body
        )
      }

      {/* Modal de Rueda de la Fortuna */}
      {
        showWheel && createPortal(
          <FortuneWheel
            isOpen={true}
            onClose={() => setShowWheel(false)}
            onSpinComplete={handleSpinComplete}
            onPrizeClaimed={() => loadUserProfile()}
          />,
          document.body
        )
      }
      {/* Modal de Retiro */}
      {
        showWithdrawal && (
          <WithdrawalModal
            isOpen={showWithdrawal}
            onClose={() => setShowWithdrawal(false)}
            onWithdrawalSuccess={() => {
              loadUserProfile(); // Refresh balance
            }}
          />
        )
      }

      {/* Modal de Compra de Cartones */}
      {
        showCardPurchase && (
          <CardPurchaseCalculator
            isOpen={showCardPurchase}
            onClose={() => setShowCardPurchase(false)}
          />
        )
      }

      {/* Alerta de Pozo Caliente */}
      {/* Referral Dashboard Modal */}
      {showReferralDashboard && createPortal(
        <ReferralDashboard onClose={() => setShowReferralDashboard(false)} />,
        document.body
      )}

      {/* Tour */}
      <CustomTour runTour={runTour} onTourEnd={() => setRunTour(false)} />
    </div>
  );
};

export default CasinoLobby;
