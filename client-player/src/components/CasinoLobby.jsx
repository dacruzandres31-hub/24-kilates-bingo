import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/CasinoLobby.css';

export default function CasinoLobby() {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [tickerOffset, setTickerOffset] = useState(0);

  // Actualizar reloj
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Animación del ticker de ganadores
  useEffect(() => {
    const tickerTimer = setInterval(() => {
      setTickerOffset(prev => prev - 1);
    }, 50);
    return () => clearInterval(tickerTimer);
  }, []);

  const winners = [
    { name: 'María G.', amount: '1.200.000', room: 'ORO' },
    { name: 'Carlos R.', amount: '250.000', room: 'PLATA' },
    { name: 'Ana M.', amount: '80.000', room: 'BRONCE' },
    { name: 'Luis F.', amount: '1.200.000', room: 'ORO' },
    { name: 'Patricia S.', amount: '250.000', room: 'PLATA' },
    { name: 'Jorge T.', amount: '80.000', room: 'BRONCE' },
    { name: 'Sofía L.', amount: '1.200.000', room: 'ORO' },
    { name: 'Diego P.', amount: '250.000', room: 'PLATA' }
  ];

  const rooms = [
    {
      id: 'starter',
      name: 'SALA STARTER',
      time: '19:00',
      price: 'GRATIS',
      priceValue: 0,
      pot: null,
      potLabel: 'Skins & Premios',
      color: 'turquoise',
      description: 'Diversión sin costo',
      icon: '🎟️',
      gradient: 'linear-gradient(135deg, #00d4ff 0%, #00ffc8 100%)',
      glow: '0 0 40px rgba(0, 255, 200, 0.6)',
      particles: true,
      status: 'available'
    },
    {
      id: 'bronze',
      name: 'SALA BRONCE',
      time: '20:00',
      price: '$500',
      priceValue: 500,
      pot: 80000,
      potLabel: 'Pozo Acumulado',
      color: 'bronze',
      description: 'Entrada accesible',
      icon: '🥉',
      gradient: 'linear-gradient(135deg, #cd7f32 0%, #b87333 50%, #8b4513 100%)',
      glow: '0 0 40px rgba(205, 127, 50, 0.6)',
      texture: 'radial-gradient(circle at 30% 30%, rgba(255, 165, 0, 0.3), transparent)',
      status: 'available'
    },
    {
      id: 'silver',
      name: 'SALA PLATA',
      time: '21:00',
      price: '$1.000',
      priceValue: 1000,
      pot: 250000,
      potLabel: 'Pozo Acumulado',
      color: 'silver',
      description: 'Premios destacados',
      icon: '🥈',
      gradient: 'linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 50%, #a8a8a8 100%)',
      glow: '0 0 40px rgba(192, 192, 192, 0.8)',
      texture: 'linear-gradient(45deg, rgba(255, 255, 255, 0.2) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.2) 75%)',
      status: 'available'
    },
    {
      id: 'gold',
      name: 'SALA ORO',
      time: '22:00',
      price: '$2.000',
      priceValue: 2000,
      pot: 1200000,
      potLabel: 'POZO MILLONARIO',
      color: 'gold',
      description: 'Evento Principal VIP',
      icon: '🥇',
      gradient: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 50%, #ffaa00 100%)',
      glow: '0 0 60px rgba(255, 215, 0, 0.9)',
      texture: 'radial-gradient(ellipse at 50% 50%, rgba(255, 255, 255, 0.3), transparent)',
      particles: true,
      featured: true,
      status: 'available'
    }
  ];

  const formatPot = (amount) => {
    if (!amount) return null;
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleRoomClick = (room) => {
    if (room.status === 'available') {
      // Navegar a la sala seleccionada
      navigate(`/room/${room.id}`);
    }
  };

  const getTimeStatus = (roomTime) => {
    const current = currentTime.getHours() * 60 + currentTime.getMinutes();
    const [hours, minutes] = roomTime.split(':').map(Number);
    const roomMinutes = hours * 60 + minutes;
    
    if (current < roomMinutes - 30) return 'soon';
    if (current < roomMinutes) return 'opening';
    if (current >= roomMinutes && current < roomMinutes + 60) return 'active';
    return 'closed';
  };

  return (
    <div className="casino-lobby">
      {/* Header con Logo */}
      <header className="lobby-header">
        <div className="logo-container">
          <div className="logo-shine"></div>
          <h1 className="logo-text">
            <span className="logo-bingo">BINGO</span>
            <span className="logo-karat">24 KILATES</span>
          </h1>
          <div className="logo-tagline">El Casino Virtual de Alta Gama</div>
        </div>
        <div className="header-clock">
          <div className="clock-icon">🕐</div>
          <div className="clock-time">{currentTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </header>

      {/* Título de Salas */}
      <div className="lobby-title">
        <h2>Selecciona Tu Sala</h2>
        <p>Cuatro experiencias únicas, un solo destino: LA VICTORIA</p>
      </div>

      {/* Grid de Salas */}
      <div className="rooms-grid">
        {rooms.map((room, index) => {
          const timeStatus = getTimeStatus(room.time);
          
          return (
            <div
              key={room.id}
              className={`room-card room-${room.color} ${room.featured ? 'featured' : ''} ${timeStatus}`}
              onClick={() => handleRoomClick(room)}
              style={{
                background: room.gradient,
                boxShadow: room.glow,
                animationDelay: `${index * 0.1}s`
              }}
            >
              {/* Partículas flotantes para Starter y Gold */}
              {room.particles && (
                <div className="room-particles">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className="particle"
                      style={{
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 3}s`,
                        animationDuration: `${3 + Math.random() * 2}s`
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Textura metálica */}
              {room.texture && (
                <div className="room-texture" style={{ background: room.texture }}></div>
              )}

              {/* Badge de estado */}
              <div className={`room-status-badge ${timeStatus}`}>
                {timeStatus === 'active' && '🔴 EN VIVO'}
                {timeStatus === 'opening' && '⏰ ABRIENDO'}
                {timeStatus === 'soon' && '📅 PRÓXIMAMENTE'}
                {timeStatus === 'closed' && '🔒 CERRADA'}
              </div>

              {/* Icono de la sala */}
              <div className="room-icon">{room.icon}</div>

              {/* Nombre de la sala */}
              <div className="room-name">{room.name}</div>

              {/* Horario */}
              <div className="room-time">
                <span className="time-icon">🕐</span>
                <span>{room.time} hs</span>
              </div>

              {/* Descripción */}
              <div className="room-description">{room.description}</div>

              {/* Separador decorativo */}
              <div className="room-divider"></div>

              {/* Precio */}
              <div className="room-price-section">
                <div className="price-label">Entrada</div>
                <div className="room-price">{room.price}</div>
              </div>

              {/* Pozo */}
              {room.pot !== null ? (
                <div className="room-pot">
                  <div className="pot-label">{room.potLabel}</div>
                  <div className="pot-amount">
                    {formatPot(room.pot)}
                  </div>
                  <div className="pot-odometer">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="odometer-digit">
                        {Math.floor(Math.random() * 10)}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="room-pot starter-rewards">
                  <div className="pot-label">{room.potLabel}</div>
                  <div className="rewards-icons">
                    <span className="reward-icon">🎨</span>
                    <span className="reward-icon">👕</span>
                    <span className="reward-icon">🎁</span>
                    <span className="reward-icon">⭐</span>
                  </div>
                </div>
              )}

              {/* Botón de entrada */}
              <button className="room-enter-btn">
                {timeStatus === 'active' ? '🎮 ENTRAR AHORA' : '🎟️ RESERVAR'}
              </button>

              {/* Efecto de brillo al hover */}
              <div className="room-shine"></div>
            </div>
          );
        })}
      </div>

      {/* Ticker de ganadores */}
      <div className="winners-ticker">
        <div className="ticker-label">🏆 GANADORES RECIENTES</div>
        <div className="ticker-content">
          <div className="ticker-track" style={{ transform: `translateX(${tickerOffset}px)` }}>
            {[...winners, ...winners, ...winners].map((winner, index) => (
              <div key={index} className="ticker-item">
                <span className="winner-name">{winner.name}</span>
                <span className="winner-separator">•</span>
                <span className="winner-amount">${winner.amount}</span>
                <span className="winner-separator">•</span>
                <span className={`winner-room room-${winner.room.toLowerCase()}`}>{winner.room}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer con información */}
      <footer className="lobby-footer">
        <div className="footer-info">
          <div className="info-item">
            <span className="info-icon">🎰</span>
            <span>Juego Responsable</span>
          </div>
          <div className="info-item">
            <span className="info-icon">🔒</span>
            <span>Pagos Seguros</span>
          </div>
          <div className="info-item">
            <span className="info-icon">⚡</span>
            <span>Retiros en 20 min</span>
          </div>
          <div className="info-item">
            <span className="info-icon">👥</span>
            <span>Soporte 24/7</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
