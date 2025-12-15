import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../styles/CasinoLobby.css';
import '../styles/Countdown.css';
import Countdown from './Countdown';
import { FaClock, FaUsers, FaMoneyBillWave, FaTrophy, FaStar, FaGlassCheers, FaGift, FaHeadset, FaTicketAlt, FaEye, FaEyeSlash, FaMusic, FaVolumeUp, FaVolumeMute, FaUser, FaKey, FaSignOutAlt } from 'react-icons/fa';
import logo from '../assets/logo.png';
import giftIcon from '../assets/Gift_icon.png';
import bronzeIcon from '../assets/bronze_icon.png';
import silverIcon from '../assets/silver_icon.png';
import goldIcon from '../assets/gold_icon.png';
import lobbyBackground from '../assets/lobby-background.jpg';
import audioService from '../services/audioService';

// Precargar todas las imágenes al inicio y mantenerlas en cache
const imageCache = {};
const preloadImages = () => {
  const images = [
    { key: 'logo', src: logo },
    { key: 'gift', src: giftIcon },
    { key: 'bronze', src: bronzeIcon },
    { key: 'silver', src: silverIcon },
    { key: 'gold', src: goldIcon },
    { key: 'background', src: lobbyBackground }
  ];
  
  images.forEach(({ key, src }) => {
    if (!imageCache[key]) {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        imageCache[key] = img;
        console.log(`✅ Imagen precargada: ${key}`);
      };
    }
  });
};

// Ejecutar precarga inmediatamente
if (typeof window !== 'undefined') {
  preloadImages();
}

const getTargetTime = (hour) => {
  const target = new Date();
  target.setHours(hour, 0, 0, 0);
  // Si la hora ya pasó hoy, programarla para mañana
  if (target < new Date()) {
    target.setDate(target.getDate() + 1);
  }
  return target;
};

const roomsData = [
  {
    id: 'starter',
    name: 'Starter',
    path: '/sala/starter',
    status: 'active',
    targetTime: getTargetTime(19),
    description: 'Premios en tickets para canjear en la tienda.',
    price: 'Tickets',
    className: 'room-turquoise',
    iconImage: giftIcon,
    rewards: ['ticket', 'ticket', 'ticket', 'ticket'],
    featured: false,
  },
  {
    id: 'bronze',
    name: 'Bronce',
    path: '/sala/bronce',
    status: 'active',
    targetTime: getTargetTime(20),
    description: 'La sala clásica para empezar a ganar.',
    price: '$500',
    pots: {
      bingo: '$1,500',
      line: '$150',
      pre40: '$300',
    },
    className: 'room-bronze',
    iconImage: bronzeIcon,
    featured: false,
  },
  {
    id: 'silver',
    name: 'Plata',
    path: '/sala/plata',
    status: 'active',
    targetTime: getTargetTime(21),
    description: 'Apuestas más altas, premios más grandes.',
    price: '$1.000',
    pots: {
      bingo: '$8,000',
      line: '$800',
      pre40: '$1,600',
    },
    className: 'room-silver',
    iconImage: silverIcon,
    featured: false,
  },
  {
    id: 'gold',
    name: 'Oro',
    path: '/sala/oro',
    status: 'active',
    targetTime: getTargetTime(22),
    description: 'La experiencia VIP con pozos millonarios.',
    price: '$2.000',
    pots: {
      bingo: '$50,000',
      line: '$5,000',
      pre40: '$10,000',
    },
    className: 'room-gold',
    iconImage: goldIcon,
    featured: true,
  },
];

const fakeWinners = [
  { name: 'Juanito123', amount: '$150', room: 'oro' },
  { name: 'MariaGana', amount: '$75', room: 'plata' },
  { name: 'CarlosElGrande', amount: '$200', room: 'oro' },
  { name: 'SofiaLaIncreible', amount: '$50', room: 'bronce' },
  { name: 'PedroPicaPiedra', amount: '$100', room: 'plata' },
  { name: 'LuisaFernanda', amount: '$300', room: 'oro' },
  { name: 'GamerXtreme', amount: '$20', room: 'bronce' },
  { name: 'QueenOfCards', amount: '$55', room: 'bronce' },
];

const RoomCard = ({ room }) => {
  const statusText = {
    active: 'Habilitada',
    drawing: 'Sorteando',
    soon: 'Próximamente',
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
    <Link to={room.path} className={`room-link ${room.className} ${room.featured ? 'featured' : ''}`}>
      <div className="room-card">
        {room.id === 'starter' && (
          <div className="ribbon-wrapper">
            <div className="ribbon">GRATIS</div>
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
            <div className="rewards-icons">
              {room.rewards.map((reward, index) => (
                <FaGift key={index} className="reward-icon" />
              ))}
            </div>
          </div>
        )}

        <button className="room-enter-btn">Entrar</button>
      </div>
    </Link>
  );
};

const WinnersTicker = () => {
  const duplicatedWinners = [...fakeWinners, ...fakeWinners];

  return (
    <div className="winners-ticker">
      <div className="ticker-label">🏆 GANADORES RECIENTES</div>
      <div className="ticker-content">
        <div className="ticker-track">
          {duplicatedWinners.map((winner, index) => (
            <div key={index} className="ticker-item">
              <span className="winner-name">{winner.name}</span>
              <span className="winner-separator">ganó</span>
              <span className="winner-amount">{winner.amount}</span>
              <span className={`winner-room room-${winner.room}`}>
                {winner.room}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


const CasinoLobby = ({ user, onLogout }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userData, setUserData] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
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
  
  // Estado de audio
  const [audioStatus, setAudioStatus] = useState({
    musicEnabled: audioService.enabled,
    efectosEnabled: audioService.efectosEnabled,
  });

  // Cargar perfil del usuario
  useEffect(() => {
    loadUserProfile();
  }, []);

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
      alert('❌ La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    try {
      const token = localStorage.getItem('playerToken') || localStorage.getItem('token');
      await axios.post('/api/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('✅ Contraseña cambiada exitosamente');
      setShowChangePasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      alert('❌ ' + (error.response?.data?.error || 'Error al cambiar la contraseña'));
    }
  };

  const loadUserProfile = async () => {
    try {
      const token = localStorage.getItem('playerToken') || localStorage.getItem('token');
      const response = await fetch('/api/users/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  // Handlers de audio
  const toggleMusic = () => {
    const newStatus = audioService.toggleMusic();
    setAudioStatus(prev => ({ ...prev, musicEnabled: newStatus }));
  };

  const toggleEfectos = () => {
    const newStatus = audioService.toggleEfectos();
    setAudioStatus(prev => ({ ...prev, efectosEnabled: newStatus }));
  };

  // Actualizar reloj
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Audio del lobby - una sola vez con primer click
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

  return (
    <div className="casino-lobby" style={{ '--lobby-bg-image': `url(${lobbyBackground})` }}>
      {/* Top User Bar */}
      <div className="user-top-bar">
        <div className="user-info-section">
          <span className="user-name">👤 {user?.username || 'Usuario'}</span>
          <div className="user-resources">
            <span className="balance">
              💰 ${userData?.balance ? parseFloat(userData.balance).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : '0'}
            </span>
            <div className="tickets-display">
              <span className="ticket-item">🎴 Bronce: {userData?.tickets?.bronze || 0}</span>
              <span className="ticket-item">🥈 Plata: {userData?.tickets?.silver || 0}</span>
              <span className="ticket-item">🥇 Oro: {userData?.tickets?.gold || 0}</span>
            </div>
          </div>
        </div>
        <div className="user-actions">
          <div className="profile-menu-container">
            <button
              className="btn-profile"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <FaUser />
              <span>Perfil</span>
            </button>
            {showProfileMenu && (
              <div className="profile-dropdown">
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

      {/* Header con Logo */}
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
        <div className="logo-container">
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

      {/* Grid de Salas */}
      <div className="rooms-grid">
        {roomsData.map((room, index) => (
          <RoomCard key={room.id} room={room} style={{ animationDelay: `${index * 100}ms` }} />
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
      </footer>

      <WinnersTicker />

      {/* Modal de Cambiar Contraseña */}
      {showChangePasswordModal && createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-purple-500/50 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-purple-600 to-indigo-600">
              <h3 className="text-2xl font-bold text-white text-center">
                🔑 Cambiar Contraseña
              </h3>
            </div>

            {/* Body */}
            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              <div>
                <label className="block text-gray-300 font-semibold mb-2 text-sm">
                  Contraseña Actual:
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 pr-12 text-white focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="Ingresa tu contraseña actual"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white hover:text-purple-400 transition-colors text-lg"
                  >
                    {showPasswords.current ? '👁' : '🔒'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-2 text-sm">
                  Nueva Contraseña:
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => {
                      const newPwd = e.target.value;
                      setPasswordData({ ...passwordData, newPassword: newPwd });
                      setPasswordStrength(calculatePasswordStrength(newPwd));
                    }}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 pr-12 text-white focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white hover:text-purple-400 transition-colors text-lg"
                  >
                    {showPasswords.new ? '👁' : '🔒'}
                  </button>
                </div>
                {passwordData.newPassword && passwordStrength.level > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-600 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          passwordStrength.level === 1 ? 'bg-red-500 w-1/3' :
                          passwordStrength.level === 2 ? 'bg-yellow-500 w-2/3' :
                          'bg-green-500 w-full'
                        }`}
                      ></div>
                    </div>
                    <span className={`text-sm font-semibold ${passwordStrength.color}`}>
                      {passwordStrength.text}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-2 text-sm">
                  Confirmar Nueva Contraseña:
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 pr-12 text-white focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="Repite la nueva contraseña"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white hover:text-purple-400 transition-colors text-lg"
                  >
                    {showPasswords.confirm ? '👁' : '🔒'}
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePasswordModal(false);
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  className="flex-1 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-bold rounded-xl transition-all"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all"
                >
                  ✓ CAMBIAR
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CasinoLobby;
