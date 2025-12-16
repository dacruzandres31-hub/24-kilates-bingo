import React, { useState, useEffect } from 'react';
import { FaTicketAlt, FaLock, FaCheck, FaTimes, FaClock, FaUsers, FaArrowLeft } from 'react-icons/fa';
import BingoCardPreview from './BingoCardPreview';
import axios from 'axios';
import '../styles/CardSelectionLobby.css';

const CardSelectionLobby = ({ 
  sessionId, 
  onCardsSelected, 
  onCancel,
  currentCards = 0, // Cartones ya seleccionados
  timeWindow = 'open', // 'open', 'closed', 'drawing'
  roomTheme = 'starter' // 'starter', 'bronze', 'silver', 'gold'
}) => {
  const [availableCards, setAvailableCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [maxCards, setMaxCards] = useState(20);
  const [loading, setLoading] = useState(true);
  const [playersOnline, setPlayersOnline] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [showExitWarning, setShowExitWarning] = useState(false);

  useEffect(() => {
    loadAvailableCards();
  }, [roomTheme]);

  const loadAvailableCards = async () => {
    try {
      const token = localStorage.getItem('playerToken') || localStorage.getItem('token');
      const response = await axios.get(`/api/cards/available/${roomTheme}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('[CardSelection] Cartones recibidos:', response.data.cards);
      console.log('[CardSelection] Primer cartón:', response.data.cards[0]);
      console.log('[CardSelection] Length:', response.data.cards?.length);
      
      setAvailableCards(response.data.cards || []);
      setMaxCards(response.data.maxSelection || 20);
      setTotalAvailable(response.data.totalAvailable || 0);
      
      console.log('[CardSelection] Estado actualizado - availableCards length:', response.data.cards?.length);
      console.log('[CardSelection] Total disponibles en pool:', response.data.totalAvailable);
    } catch (error) {
      console.error('Error loading cards:', error);
      if (error.response?.status === 400) {
        alert(error.response.data.error || 'No tienes tickets disponibles');
      }
    } finally {
      setLoading(false);
    }
  };

  // Función para actualizar y mostrar otros 5 cartones manteniendo los seleccionados
  const handleRefreshCards = async () => {
    if (selectedCards.length === 0) {
      // Si no hay selección, solo recarga
      setRefreshing(true);
      await loadAvailableCards();
      setRefreshing(false);
    } else {
      // Si hay cartones seleccionados, mostrar nuevos cartones SIN perder selección
      setRefreshing(true);
      
      try {
        const token = localStorage.getItem('playerToken') || localStorage.getItem('token');
        const response = await axios.get(`/api/cards/available/${roomTheme}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        // Actualizar cartones disponibles Y maxCards basado en tickets
        setAvailableCards(response.data.cards || []);
        setMaxCards(response.data.maxSelection || 20);
        setTotalAvailable(response.data.totalAvailable || 0);
        
        console.log('[CardSelection] Cartones actualizados. Seleccionados mantenidos:', selectedCards.length);
        console.log('[CardSelection] Máximo de cartones permitido:', response.data.maxSelection);
      } catch (error) {
        console.error('Error loading new cards:', error);
      } finally {
        setRefreshing(false);
      }
    }
  };

  const handleCardToggle = async (card) => {
    if (card.status === 'reserved') return; // Ya reservado por otro jugador

    const isSelected = selectedCards.find(c => c.id === card.id);
    
    // Mapear nombre de sala a español para backend
    const roomMap = {
      'bronze': 'bronce',
      'silver': 'plata',
      'gold': 'oro',
      'starter': 'starter'
    };
    const roomDB = roomMap[roomTheme] || roomTheme;

    if (isSelected) {
      // Deseleccionar - liberar reserva en backend
      try {
        const token = localStorage.getItem('playerToken') || localStorage.getItem('token');
        await axios.post('/api/cards/unreserve', 
          { cardId: card.id, room: roomDB },
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        
        setSelectedCards(selectedCards.filter(c => c.id !== card.id));
        console.log('[CardSelection] Cartón liberado:', card.id);
      } catch (error) {
        console.error('Error liberando cartón:', error);
        // Aún así quitar de la lista local
        setSelectedCards(selectedCards.filter(c => c.id !== card.id));
      }
    } else {
      // Seleccionar (máximo 20)
      if (selectedCards.length >= maxCards) {
        alert(`⚠️ Solo puedes seleccionar hasta ${maxCards} cartones`);
        return;
      }

      // Reservar en backend ANTES de agregar a la lista
      try {
        const token = localStorage.getItem('playerToken') || localStorage.getItem('token');
        const response = await axios.post('/api/cards/reserve', 
          { cardId: card.id, room: roomDB },
          { headers: { 'Authorization': `Bearer ${token}` } }
        );

        if (response.data.success) {
          setSelectedCards([...selectedCards, card]);
          console.log('[CardSelection] Cartón reservado:', card.id);
        }
      } catch (error) {
        console.error('Error reservando cartón:', error);
        const errorMsg = error.response?.data?.error || 'Error al reservar el cartón';
        alert(`❌ ${errorMsg}`);
        // Recargar cartones para actualizar estado
        loadAvailableCards();
      }
    }
  };

  const handleConfirmSelection = async () => {
    if (selectedCards.length === 0) {
      alert('⚠️ Debes seleccionar al menos 1 cartón');
      return;
    }

    try {
      // Mapear nombre de sala a español para backend
      const roomMap = {
        'bronze': 'bronce',
        'silver': 'plata',
        'gold': 'oro',
        'starter': 'starter'
      };
      const roomDB = roomMap[roomTheme] || roomTheme;

      console.log('[CardSelection] Confirmando selección:', {
        cartones: selectedCards.length,
        roomTheme,
        roomDB,
        cardIds: selectedCards.map(c => c.id)
      });

      const token = localStorage.getItem('playerToken') || localStorage.getItem('token');
      const response = await axios.post('/api/cards/select', 
        {
          cardIds: selectedCards.map(c => c.id),
          room: roomDB  // Enviar nombre en español
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      alert(`✅ ${response.data.message}`);
      onCardsSelected(response.data.cards);
    } catch (error) {
      console.error('Error reserving cards:', error);
      console.error('Error details:', error.response?.data);
      const errorMsg = error.response?.data?.error || 'Error seleccionando cartones';
      alert(`❌ ${errorMsg}`);
      // Recargar lista por si algunos cartones ya fueron tomados
      loadAvailableCards();
    }
  };

  // Manejar salida con advertencia si hay cartones reservados
  const handleExit = () => {
    if (selectedCards.length > 0) {
      setShowExitWarning(true);
    } else {
      onCancel();
    }
  };

  // Confirmar salida y liberar reservas
  const handleConfirmExit = async () => {
    // Liberar todas las reservas
    const roomMap = {
      'bronze': 'bronce',
      'silver': 'plata',
      'gold': 'oro',
      'starter': 'starter'
    };
    const roomDB = roomMap[roomTheme] || roomTheme;
    const token = localStorage.getItem('playerToken') || localStorage.getItem('token');

    console.log('[CardSelection] Liberando reservas al salir:', selectedCards.length);

    // Liberar cada cartón reservado
    for (const card of selectedCards) {
      try {
        await axios.post('/api/cards/unreserve', 
          { cardId: card.id, room: roomDB },
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
      } catch (error) {
        console.error('Error liberando cartón:', card.id, error);
      }
    }

    setShowExitWarning(false);
    setSelectedCards([]);
    onCancel();
  };

  // Cancelar salida
  const handleCancelExit = () => {
    setShowExitWarning(false);
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
          <button className="btn-back" onClick={handleExit}>
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

  console.log('[CardSelection] RENDER - availableCards:', availableCards);
  console.log('[CardSelection] RENDER - availableCards.length:', availableCards.length);
  console.log('[CardSelection] RENDER - loading:', loading);
  
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

      {/* Botón para actualizar cartones */}
      <div className="refresh-cards-container">
        <button 
          className="refresh-cards-btn"
          onClick={handleRefreshCards}
          disabled={refreshing || loading}
        >
          {refreshing ? '🔄 Actualizando...' : '🔄 Ver otros cartones'}
        </button>
        <span className="total-available-text">
          Mostrando 5 de {totalAvailable} cartones disponibles
        </span>
      </div>

      {/* Grid de Cartones */}
      <div className="cards-grid">
        {availableCards.map((card) => {
          console.log('[CardSelection] Rendering card:', card.id, 'serial:', card.serial, 'numbers:', card.numbers);
          const selected = isCardSelected(card);
          
          // Parsear números si vienen como string JSON
          let parsedNumbers = card.numbers;
          if (typeof card.numbers === 'string') {
            try {
              parsedNumbers = JSON.parse(card.numbers);
              console.log('[CardSelection] Números parseados:', parsedNumbers);
            } catch (e) {
              console.error('[CardSelection] Error parseando números:', e);
              parsedNumbers = []; // Fallback a array vacío
            }
          }
          
          return (
            <BingoCardPreview
              key={card.id}
              card={{
                card_serial: card.serial,
                numbers: parsedNumbers
              }}
              room={roomTheme}
              selected={selected}
              onClick={() => handleCardToggle(card)}
              showSerial={true}
            />
          );
        })}
      </div>

      {/* Footer con acciones */}
      <div className="selection-footer">
        <button 
          className="btn-back" 
          onClick={handleExit}
          title="Regresar a la sala"
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

      {/* Modal de advertencia al salir */}
      {showExitWarning && (
        <div className="exit-warning-modal-overlay">
          <div className="exit-warning-modal">
            <div className="warning-icon">⚠️</div>
            <h2>¿Salir sin confirmar?</h2>
            <p>
              Tienes <strong>{selectedCards.length} cartón{selectedCards.length > 1 ? 'es' : ''} reservado{selectedCards.length > 1 ? 's' : ''}</strong>.
            </p>
            <p>
              Si sales sin confirmar, perderás la reserva de estos cartones y otros jugadores podrán tomarlos.
            </p>
            <div className="warning-actions">
              <button className="btn-cancel-exit" onClick={handleCancelExit}>
                <FaTimes /> Cancelar
              </button>
              <button className="btn-confirm-exit" onClick={handleConfirmExit}>
                <FaCheck /> Salir de todas formas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardSelectionLobby;
