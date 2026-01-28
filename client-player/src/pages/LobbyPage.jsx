import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, LogOut, Settings, User, Key, FileText } from 'lucide-react';
import PlayerActivityHistory from '../components/PlayerActivityHistory';
import NotificationBell from '../components/NotificationBell';
import '../styles/LobbyPage.css';

export default function LobbyPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [freeRewards, setFreeRewards] = useState(0);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showActivityHistory, setShowActivityHistory] = useState(false);

  useEffect(() => {
    // Obtener usuario actual
    const token = localStorage.getItem('playerToken') || localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser(payload);
      } catch (error) {
        console.error('Error parsing token:', error);
        navigate('/login');
      }
    }

    // Actualizar hora cada segundo
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    // Cargar salas disponibles
    loadRooms();
    loadUserProfile();

    return () => clearInterval(timer);
  }, [navigate]);

  const loadUserProfile = async () => {
    try {
      const response = await fetch('/api/users/profile', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('playerToken') || localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadRooms = async () => {
    try {
      const response = await fetch('/api/game/available-rooms', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('playerToken') || localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Error cargando salas');
      
      const data = await response.json();
      setRooms(data.rooms || []);

      // Contar premios NFT de esta semana
      const freeWinsResponse = await fetch('/api/inventory?type=free_week_count', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('playerToken') || localStorage.getItem('token')}` }
      });
      if (freeWinsResponse.ok) {
        const freeData = await freeWinsResponse.json();
        setFreeRewards(freeData.freeRewardsThisWeek || 0);
      }
    } catch (error) {
      console.error('Error loading rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const isStarterTime = currentTime.getHours() === 19;

  const handlePlayRoom = (roomType) => {
    // Validar si es Sala Starter y está fuera de horario
    if (roomType === 'starter' && !isStarterTime) {
      alert('❌ Sala Starter solo está disponible a las 19:00 hs');
      return;
    }

    navigate(`/game/${roomType}`);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('es-AR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="lobby-container loading">
        <div className="spinner"></div>
        <p>Cargando salas...</p>
      </div>
    );
  }

  return (
    <div className="lobby-container">
      {/* Top User Bar - NUEVA */}
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
          {/* Campana de Notificaciones */}
          <NotificationBell />
          
          <button
            className="btn-profile btn-history"
            onClick={() => setShowActivityHistory(true)}
            title="Ver mi historial de actividad"
          >
            <FileText size={20} />
            <span>Mi Historial</span>
          </button>
          <div className="profile-menu-container">
            <button
              className="btn-profile"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <User size={20} />
              <span>Perfil</span>
            </button>
            {showProfileMenu && (
              <div className="profile-dropdown">
                <button className="dropdown-item" onClick={() => {
                  setShowProfileMenu(false);
                  // TODO: Abrir modal cambiar contraseña
                  alert('Función de cambio de contraseña próximamente');
                }}>
                  <Key size={16} />
                  <span>Cambiar Contraseña</span>
                </button>
                <button className="dropdown-item logout" onClick={() => {
                  localStorage.removeItem('token');
                  navigate('/login');
                }}>
                  <LogOut size={16} />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="lobby-header">
        <div className="header-left">
          <h1>🎰 24K BINGO HALL</h1>
          <p className="subtitle">Elige tu sala de juego</p>
        </div>
        <div className="header-right">
          <div className="time-display">
            <span className="time">{formatTime(currentTime)}</span>
            <span className="date">{currentTime.toLocaleDateString('es-AR')}</span>
          </div>
          <div className="user-menu">
            {user && <span className="username">👤 {user.username}</span>}
            <button
              className="btn-icon"
              onClick={() => navigate('/inventory')}
              title="Mi Inventario"
            >
              🎁
            </button>
            <button
              className="btn-icon"
              onClick={() => navigate('/settings')}
              title="Configuración"
            >
              <Settings size={20} />
            </button>
            <button
              className="btn-logout"
              onClick={() => {
                localStorage.removeItem('token');
                navigate('/login');
              }}
              title="Cerrar Sesión"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Starter Room - FEATURED */}
      {isStarterTime && (
        <div className="starter-featured">
          <div className="starter-badge">
            ⭐ PROMOCIÓN ESPECIAL
          </div>
          <h2>🎁 SALA STARTER - GRATIS</h2>
          <p className="starter-description">
            Juega gratis a las 19:00 hs y gana cosméticos NFT exclusivos
          </p>
          <div className="starter-stats">
            <div className="stat">
              <span className="icon">💰</span>
              <span>Costo: GRATIS</span>
            </div>
            <div className="stat">
              <span className="icon">🎴</span>
              <span>Cartones: 20</span>
            </div>
            <div className="stat">
              <span className="icon">🏆</span>
              <span>Premios: NFTs</span>
            </div>
            <div className="stat">
              <span className="icon">📊</span>
              <span>Esta semana: +{freeRewards}</span>
            </div>
          </div>
          <button 
            className="btn-play btn-starter"
            onClick={() => handlePlayRoom('starter')}
          >
            ▶ JUGAR AHORA - GRATIS
          </button>
        </div>
      )}

      {/* Available Rooms Grid */}
      <div className="rooms-section">
        <h2>Salas Disponibles</h2>
        <div className="rooms-grid">
          {rooms && rooms.length > 0 ? (
            rooms.map((room) => {
              const isStarter = room.room_type === 'free_starter';
              const starterDisabled = isStarter && !isStarterTime;

              return (
                <div
                  key={room.id}
                  className={`room-card ${isStarter ? 'starter' : ''} ${starterDisabled ? 'disabled' : ''}`}
                >
                  {/* Header */}
                  <div className="room-header">
                    <span className="room-icon">
                      {isStarter ? '🎁' : '💎'}
                    </span>
                    <span className="room-type">
                      {isStarter ? 'SALA STARTER' : room.room_type?.toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="room-info">
                    <div className="info-row">
                      <span className="label">Entrada:</span>
                      <span className="value">
                        {isStarter ? '🎁 GRATIS' : `$${room.cost}`}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="label">Cartones:</span>
                      <span className="value">{room.available_cards} disps.</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Premios:</span>
                      <span className="value">
                        {isStarter 
                          ? '🏅 NFTs' 
                          : `💰 $${(room.current_pot_bingo + room.current_pot_linea).toFixed(2)}`
                        }
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="label">Jugadores:</span>
                      <span className="value">{room.player_count || 0} en línea</span>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="room-status">
                    <span className={`status-badge ${room.status}`}>
                      {room.status === 'pending' 
                        ? '⏳ Próxima'
                        : room.status === 'in_progress'
                        ? '🔴 En Juego'
                        : '✅ Finalizada'
                      }
                    </span>
                  </div>

                  {/* Availability Note */}
                  {isStarter && starterDisabled && (
                    <div className="availability-note">
                      ⏰ Disponible solo a las 19:00 hs
                      <br />
                      <small>Reabre en {String(23 - currentTime.getHours()).padStart(2, '0')}h</small>
                    </div>
                  )}

                  {/* Button */}
                  <button
                    className={`btn-play ${starterDisabled ? 'disabled' : ''}`}
                    onClick={() => handlePlayRoom(room.room_type)}
                    disabled={starterDisabled}
                  >
                    {starterDisabled 
                      ? '🔒 No disponible' 
                      : room.status === 'pending'
                      ? '▶ Entrar'
                      : '👁️ Observar'
                    }
                  </button>
                </div>
              );
            })
          ) : (
            <div className="no-rooms">
              <p>😴 Sin salas disponibles en este momento</p>
              <p className="hint">Vuelve más tarde para jugar</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <div className="stat-card">
          <span className="stat-icon">👤</span>
          <div className="stat-content">
            <span className="stat-label">Usuario</span>
            <span className="stat-value">{user?.username || 'Anónimo'}</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">💰</span>
          <div className="stat-content">
            <span className="stat-label">Balance</span>
            <span className="stat-value">${user?.balance?.toFixed(2) || '0.00'}</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🏅</span>
          <div className="stat-content">
            <span className="stat-label">Nivel</span>
            <span className="stat-value">Lv. {user?.level || 1}</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🎁</span>
          <div className="stat-content">
            <span className="stat-label">Cosméticos</span>
            <span className="stat-value">+{freeRewards} esta semana</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="lobby-footer">
        <p>🎰 24K Bingo - Plataforma oficial de bingo online</p>
        <p className="small">Juega responsablemente | Términos y condiciones</p>
      </div>

      {/* Activity History Modal */}
      {showActivityHistory && (
        <PlayerActivityHistory onClose={() => setShowActivityHistory(false)} />
      )}
    </div>
  );
}
