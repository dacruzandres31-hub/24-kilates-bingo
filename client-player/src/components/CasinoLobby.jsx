import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/CasinoLobby.css';
import '../styles/Countdown.css';
import Countdown from './Countdown';
import { FaClock, FaUsers, FaMoneyBillWave, FaTrophy, FaStar, FaGlassCheers, FaGift, FaHeadset, FaTicketAlt, FaEye, FaEyeSlash } from 'react-icons/fa';
import logo from '../assets/logo.png';
import giftIcon from '../assets/Gift_icon.png';
import bronzeIcon from '../assets/bronze_icon.png';
import silverIcon from '../assets/silver_icon.png';
import goldIcon from '../assets/gold_icon.png';
import lobbyBackground from '../assets/lobby-background.jpg';
import audioService from '../services/audioService';

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
          <img src={room.iconImage} alt={room.name} className="room-icon-img" />
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
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [showAudioPrompt, setShowAudioPrompt] = useState(true); // Mostrar prompt de audio

  // Actualizar reloj
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Función para activar audio manualmente
  const handleActivateAudio = async () => {
    try {
      console.log('🎵 Activando audio del lobby...');
      await audioService.initialize('lobby');
      await audioService.startBackgroundMusic();
      setAudioInitialized(true);
      setShowAudioPrompt(false);
      console.log('✅ Audio del lobby activado');
    } catch (error) {
      console.error('❌ Error activando audio:', error);
    }
  };

  // Inicializar audio del lobby al montar
  useEffect(() => {
    const initLobbyAudio = async () => {
      try {
        console.log('🎵 Inicializando audio del lobby...');
        await audioService.initialize('lobby');
        await audioService.startBackgroundMusic();
        setAudioInitialized(true);
        setShowAudioPrompt(false);
        console.log('✅ Audio del lobby inicializado automáticamente');
      } catch (error) {
        console.warn('⚠️ No se pudo iniciar audio automáticamente:', error.message);
        // Mantener showAudioPrompt=true para que el usuario lo active manualmente
      }
    };
    
    // Si volvemos de una sala, el audio ya puede estar inicializado
    if (audioService.initialized) {
      console.log('🔄 Audio ya inicializado, cambiando a música del lobby');
      initLobbyAudio();
    } else {
      // Primera vez - intentar iniciar con primer click
      const handleFirstClick = () => {
        if (!audioInitialized) {
          initLobbyAudio();
        }
        document.removeEventListener('click', handleFirstClick);
      };
      
      document.addEventListener('click', handleFirstClick);
      
      return () => {
        document.removeEventListener('click', handleFirstClick);
      };
    }
  }, [audioInitialized]);

  return (
    <div className="casino-lobby" style={{ '--lobby-bg-image': `url(${lobbyBackground})` }}>
      {/* Prompt de Audio Flotante */}
      {showAudioPrompt && !audioInitialized && (
        <div 
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '15px 25px',
            borderRadius: '12px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
            cursor: 'pointer',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            animation: 'pulse 2s infinite',
            fontWeight: 'bold'
          }}
          onClick={handleActivateAudio}
        >
          <span style={{ fontSize: '24px' }}>🔊</span>
          <span>Haz click para activar el audio</span>
        </div>
      )}
      
      {/* Barra de Información del Jugador */}
      <div className="player-info-bar">
        <div className="player-info-content">
          <div className="player-info-item player-username">
            <span className="info-label">Usuario:</span>
            <span className="info-value">JugadorPro24</span>
          </div>
          
          <div className="player-info-item player-balance" onClick={() => setShowBalance(!showBalance)}>
            <img src={bronzeIcon} alt="Saldo" className="balance-icon" />
            <span className="info-label">Saldo:</span>
            {showBalance ? (
              <span className="info-value balance-amount">$12,500</span>
            ) : (
              <div className="balance-hidden">
                <span className="hidden-dots">•••••</span>
              </div>
            )}
            <button className="balance-toggle" onClick={(e) => { e.stopPropagation(); setShowBalance(!showBalance); }}>
              {showBalance ? <FaEye /> : <FaEyeSlash />}
            </button>
          </div>
          
          <div className="player-info-separator"></div>
          
          <div className="player-info-item player-tickets">
            <FaTicketAlt className="info-icon" />
            <span className="info-label">Mis Cartones:</span>
          </div>
          
          <div className="player-info-item ticket-count">
            <span className="ticket-label">Starter:</span>
            <span className="ticket-value">3</span>
          </div>
          
          <div className="player-info-item ticket-count">
            <span className="ticket-label">Bronce:</span>
            <span className="ticket-value">5</span>
          </div>
          
          <div className="player-info-item ticket-count">
            <span className="ticket-label">Plata:</span>
            <span className="ticket-value">2</span>
          </div>
          
          <div className="player-info-item ticket-count">
            <span className="ticket-label">Oro:</span>
            <span className="ticket-value">1</span>
          </div>
          
          <div className="player-info-separator"></div>
          
          <button className="support-button" title="Contactar Soporte Técnico">
            <FaHeadset className="support-icon" />
            <span>Soporte</span>
          </button>
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
          <img src={logo} alt="Bingo 24 Kilates" className="logo-image" />
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
