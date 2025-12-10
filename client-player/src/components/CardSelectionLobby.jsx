import React, { useState, useEffect } from 'react';
import { FaTicketAlt, FaLock, FaCheck, FaTimes, FaClock, FaUsers, FaArrowLeft } from 'react-icons/fa';
import '../styles/CardSelectionLobby.css';

const CardSelectionLobby = ({ 
  sessionId, 
  onCardsSelected, 
  onCancel,
  maxCards = 20,
  currentCards = 0, // Cartones ya seleccionados
  timeWindow = 'open', // 'open', 'closed', 'drawing'
  roomTheme = 'starter' // 'starter', 'bronze', 'silver', 'gold'
}) => {
  const [availableCards, setAvailableCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playersOnline, setPlayersOnline] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null);

  useEffect(() => {
    loadAvailableCards();
    
    // Actualizar cada 5 segundos
    const interval = setInterval(loadAvailableCards, 5000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const loadAvailableCards = async () => {
    try {
      const response = await fetch(`/api/game/starter/available-cards/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (!response.ok) throw new Error('Error cargando cartones');
      
      const data = await response.json();
      setAvailableCards(data.cards || []);
      setPlayersOnline(data.playersOnline || 0);
      setTimeRemaining(data.timeRemaining || null);
    } catch (error) {
      console.error('Error loading cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardToggle = (card) => {
    if (card.status === 'reserved') return; // Ya reservado por otro jugador

    const isSelected = selectedCards.find(c => c.id === card.id);
    
    if (isSelected) {
      // Deseleccionar
      setSelectedCards(selectedCards.filter(c => c.id !== card.id));
    } else {
      // Seleccionar (máximo 20)
      if (selectedCards.length >= maxCards) {
        alert(`⚠️ Solo puedes seleccionar hasta ${maxCards} cartones`);
        return;
      }
      setSelectedCards([...selectedCards, card]);
    }
  };

  const handleConfirmSelection = async () => {
    if (selectedCards.length === 0) {
      alert('⚠️ Debes seleccionar al menos 1 cartón');
      return;
    }

    try {
      const response = await fetch(`/api/game/starter/reserve-cards`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          cardIds: selectedCards.map(c => c.id)
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error reservando cartones');
      }

      const data = await response.json();
      onCardsSelected(data.reservedCards);
    } catch (error) {
      console.error('Error reserving cards:', error);
      alert(`❌ ${error.message}`);
      // Recargar lista por si algunos cartones ya fueron tomados
      loadAvailableCards();
    }
  };

  const isCardSelected = (card) => {
    return selectedCards.find(c => c.id === card.id) !== undefined;
  };

  const getCardStatusColor = (status) => {
    switch(status) {
      case 'available': return 'available';
      case 'reserved': return 'reserved';
      case 'selected': return 'selected';
      default: return 'available';
    }
  };

  const formatTimeRemaining = (seconds) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (timeWindow === 'closed') {
    return (
      <div className={`card-selection-lobby closed theme-${roomTheme}`}>
        <div className="closed-message">
          <FaLock className="closed-icon" />
          <h2>Selección Cerrada</h2>
          <p>La selección de cartones está cerrada durante el sorteo.</p>
          <p className="closed-info">
            Podrás elegir cartones 5 minutos antes del próximo sorteo.
          </p>
          <button className="btn-back" onClick={onCancel}>
            <FaArrowLeft /> Regresar a la Sala
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`card-selection-lobby loading theme-${roomTheme}`}>
        <div className="spinner"></div>
        <p>Cargando cartones disponibles...</p>
      </div>
    );
  }

  return (
    <div className={`card-selection-lobby theme-${roomTheme}`}>
      {/* Header */}
      <div className="selection-header">
        <div className="header-content">
          <div className="header-left">
            <FaTicketAlt className="header-icon" />
            <div className="header-info">
              <h2 className="header-title">Sala de Selección de Cartones</h2>
              <p className="header-subtitle">
                {currentCards > 0 
                  ? `Tienes ${currentCards} cartones. Selecciona hasta ${maxCards} más (Total: ${currentCards + maxCards} / 20)`
                  : `Elige hasta ${maxCards} cartones para jugar gratis`
                }
              </p>
            </div>
          </div>
          
          <div className="header-stats">
            <div className="stat-item">
              <FaUsers className="stat-icon" />
              <span className="stat-value">{playersOnline}</span>
              <span className="stat-label">Jugadores</span>
            </div>
            
            {timeRemaining && (
              <div className="stat-item time">
                <FaClock className="stat-icon" />
                <span className="stat-value">{formatTimeRemaining(timeRemaining)}</span>
                <span className="stat-label">Para iniciar</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Contador de selección */}
        <div className="selection-counter">
          <div className="counter-content">
            <span className="counter-label">Seleccionados:</span>
            <span className="counter-value">
              {selectedCards.length} / {maxCards}
            </span>
          </div>
          <div className="counter-bar">
            <div 
              className="counter-fill" 
              style={{ width: `${(selectedCards.length / maxCards) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Grid de Cartones */}
      <div className="cards-grid">
        {availableCards.map((card) => {
          const selected = isCardSelected(card);
          const reserved = card.status === 'reserved';
          
          return (
            <div
              key={card.id}
              className={`card-preview ${getCardStatusColor(card.status)} ${selected ? 'selected' : ''} ${reserved ? 'reserved' : ''}`}
              onClick={() => !reserved && handleCardToggle(card)}
            >
              {/* Header del cartón */}
              <div className="card-preview-header">
                <span className="card-serial">{card.serial}</span>
                {selected && (
                  <div className="card-check">
                    <FaCheck />
                  </div>
                )}
                {reserved && (
                  <div className="card-lock">
                    <FaLock />
                  </div>
                )}
              </div>

              {/* Grid 3x9 del cartón */}
              <div className="card-preview-grid">
                {card.numbers.map((row, rowIdx) => (
                  <div key={rowIdx} className="card-preview-row">
                    {row.map((num, colIdx) => (
                      <div
                        key={colIdx}
                        className={`card-preview-cell ${num === null ? 'empty' : 'filled'}`}
                      >
                        {num !== null && <span className="cell-num">{num}</span>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Footer con indicador */}
              <div className="card-preview-footer">
                {selected && <span className="status-text selected">✓ Seleccionado</span>}
                {reserved && <span className="status-text reserved">🔒 Reservado</span>}
                {!selected && !reserved && <span className="status-text available">Disponible</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer con acciones */}
      <div className="selection-footer">
        <button 
          className="btn-back" 
          onClick={onCancel}
          title="Regresar a la sala sin seleccionar cartones"
        >
          <FaArrowLeft /> Regresar a la Sala
        </button>
        
        <div className="selection-info">
          <span className="info-text">
            {selectedCards.length > 0 
              ? `${selectedCards.length} cartón${selectedCards.length > 1 ? 'es' : ''} seleccionado${selectedCards.length > 1 ? 's' : ''}`
              : 'Selecciona cartones o regresa a la sala'}
          </span>
        </div>
        
        <button 
          className="btn-confirm" 
          onClick={handleConfirmSelection}
          disabled={selectedCards.length === 0}
        >
          <FaCheck /> Confirmar Selección ({selectedCards.length})
        </button>
      </div>
    </div>
  );
};

export default CardSelectionLobby;
