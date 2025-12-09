import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/CasinoLobby.css';
import '../styles/Countdown.css';
import Countdown from './Countdown';
import { FaClock, FaUsers, FaMoneyBillWave, FaTrophy, FaStar, FaGlassCheers, FaGift, FaHeadset, FaTicketAlt, FaEye, FaEyeSlash, FaMusic, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';
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
    path: '/sala/bronze',
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
    path: '/sala/silver',
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
    path: '/sala/gold',
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


const CasinoLobby = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showBalance, setShowBalance] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Estado de audio
  const [audioStatus, setAudioStatus] = useState({
    musicEnabled: audioService.enabled,
    efectosEnabled: audioService.efectosEnabled,
  });
  const [ticketsExpanded, setTicketsExpanded] = useState(false);
  const [audioExpanded, setAudioExpanded] = useState(false);

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
      {/* Botón Toggle Sidebar */}
      <button 
        className="sidebar-toggle-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        title="Abrir Menú"
      >
        <div className="hamburger-icon">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </button>

      {/* Overlay oscuro cuando sidebar está abierto */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Lateral Izquierda */}
      <div className={`lobby-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">Menú Principal</h2>
          <button 
            className="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
          >
            ×
          </button>
        </div>

        <div className="sidebar-content">
          {/* Información del Jugador */}
          <div className="sidebar-section player-section">
            <div className="section-header">
              <FaUsers className="section-icon" />
              <h3>Usuario</h3>
            </div>
            <div className="player-info">
              <span className="player-name">JugadorPro24</span>
            </div>
          </div>

          {/* Saldo */}
          <div className="sidebar-section balance-section">
            <div className="section-header">
              <FaMoneyBillWave className="section-icon" />
              <h3>Saldo</h3>
            </div>
            <div className="balance-info" onClick={() => setShowBalance(!showBalance)}>
              <img src={bronzeIcon} alt="Saldo" className="balance-icon-sidebar" />
              {showBalance ? (
                <span className="balance-amount-sidebar">$12,500</span>
              ) : (
                <span className="balance-hidden-sidebar">•••••</span>
              )}
              <button className="balance-toggle-sidebar">
                {showBalance ? <FaEye /> : <FaEyeSlash />}
              </button>
            </div>
          </div>

          {/* Mis Cartones - Colapsable */}
          <div className="sidebar-section tickets-section">
            <div 
              className="section-header collapsible"
              onClick={() => setTicketsExpanded(!ticketsExpanded)}
            >
              <FaTicketAlt className="section-icon" />
              <h3>Mis Cartones</h3>
              <span className={`expand-icon ${ticketsExpanded ? 'expanded' : ''}`}>▼</span>
            </div>
            {ticketsExpanded && (
              <div className="tickets-list">
                <div className="ticket-item">
                  <span className="ticket-room-name">Starter</span>
                  <span className="ticket-count-badge">3</span>
                </div>
                <div className="ticket-item">
                  <span className="ticket-room-name">Bronce</span>
                  <span className="ticket-count-badge">5</span>
                </div>
                <div className="ticket-item">
                  <span className="ticket-room-name">Plata</span>
                  <span className="ticket-count-badge">2</span>
                </div>
                <div className="ticket-item">
                  <span className="ticket-room-name">Oro</span>
                  <span className="ticket-count-badge">1</span>
                </div>
              </div>
            )}
          </div>

          {/* Controles de Audio - Colapsable */}
          <div className="sidebar-section audio-controls-section">
            <div 
              className="section-header collapsible"
              onClick={() => setAudioExpanded(!audioExpanded)}
            >
              <h3>Audio</h3>
              <span className={`expand-icon ${audioExpanded ? 'expanded' : ''}`}>▼</span>
            </div>
            {audioExpanded && (
              <div className="audio-controls">
                <button 
                  className={`audio-control-btn ${audioStatus.musicEnabled ? 'active' : ''}`}
                  onClick={toggleMusic}
                  title={audioStatus.musicEnabled ? 'Desactivar música' : 'Activar música'}
                >
                  {audioStatus.musicEnabled ? <FaMusic /> : <FaVolumeMute />}
                  <span>{audioStatus.musicEnabled ? 'Música ON' : 'Música OFF'}</span>
                </button>
                
                <button 
                  className={`audio-control-btn ${audioStatus.efectosEnabled ? 'active' : ''}`}
                  onClick={toggleEfectos}
                  title={audioStatus.efectosEnabled ? 'Desactivar efectos' : 'Activar efectos'}
                >
                  {audioStatus.efectosEnabled ? <FaVolumeUp /> : <FaVolumeMute />}
                  <span>{audioStatus.efectosEnabled ? 'Efectos ON' : 'Efectos OFF'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Botón Soporte */}
          <div className="sidebar-section support-section">
            <button className="support-button-sidebar">
              <FaHeadset className="support-icon" />
              <span>Contactar Soporte</span>
            </button>
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
    </div>
  );
};

export default CasinoLobby;
