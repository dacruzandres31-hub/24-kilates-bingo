import React, { useState, useEffect, useCallback } from 'react';
import { FaTicketAlt, FaLock, FaCheck, FaTimes, FaClock, FaUsers, FaArrowLeft } from 'react-icons/fa';
import BingoCardPreview from './BingoCardPreview';
import PackageSelectionModal from './PackageSelectionModal';
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [purchasedCount, setPurchasedCount] = useState(0);
  const [showInsufficientFundsModal, setShowInsufficientFundsModal] = useState(false);
  const [fundsError, setFundsError] = useState(null);
  
  // Estados para el sistema de paquetes con yapas
  const [showPackageModal, setShowPackageModal] = useState(roomTheme === 'starter'); // Solo mostrar en Starter
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [giftCards, setGiftCards] = useState([]); // Gift cards de yapa

  // Manejar selección de paquete
  const handlePackageSelection = async (pkg) => {
    console.log('[CardSelection] Paquete seleccionado:', pkg);
    setSelectedPackage(pkg);
    setShowPackageModal(false);
    
    // Limpiar gift cards (ya no se cargan automáticamente)
    setGiftCards([]);
    
    // El jugador debe seleccionar TODOS los cartones manualmente
    if (pkg.total > 0) {
      // Paquete con cantidad específica (ej: 10+4 = 14 total)
      setMaxCards(pkg.total);
      console.log(`[CardSelection] Paquete ${pkg.id}: debe seleccionar ${pkg.total} cartones (${pkg.buy} para comprar + ${pkg.bonus} yapas)`);
    } else {
      // Paquete "sin yapa" - libre hasta 20
      const maxAllowed = Math.min(20, 20 - currentCards);
      setMaxCards(maxAllowed);
      console.log(`[CardSelection] Paquete sin yapa: puede elegir hasta ${maxAllowed} cartones`);
    }
  };

  const loadAvailableCards = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('playerToken') || localStorage.getItem('token');
      const response = await axios.get(`/api/cards/available/${roomTheme}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('[CardSelection] Cartones recibidos:', response.data.cards);
      console.log('[CardSelection] Primer cartón:', response.data.cards[0]);
      console.log('[CardSelection] Length:', response.data.cards?.length);
      
      setAvailableCards(response.data.cards || []);
      
      // Solo ajustar maxCards si NO hay paquete seleccionado
      // Si hay paquete, mantener el total del paquete
      if (!selectedPackage || selectedPackage.total === 0) {
        const maxAllowed = Math.min(response.data.maxSelection || 20, 20 - currentCards);
        setMaxCards(maxAllowed);
      }
      
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
  }, [roomTheme, currentCards, selectedPackage]);

  // Ejecutar carga de cartones según tipo de sala
  useEffect(() => {
    console.log('[CardSelection] useEffect ejecutado - roomTheme:', roomTheme, 'showPackageModal:', showPackageModal, 'selectedPackage:', selectedPackage);
    
    if (roomTheme !== 'starter') {
      // Salas pagas: cargar inmediatamente
      console.log('[CardSelection] Sala paga detected - loading cards');
      loadAvailableCards();
    } else if (roomTheme === 'starter' && !showPackageModal && selectedPackage) {
      // Starter: cargar DESPUÉS de seleccionar paquete
      console.log('[CardSelection] Starter con paquete seleccionado - loading cards');
      loadAvailableCards();
    } else if (roomTheme === 'starter' && showPackageModal) {
      // Starter con modal abierto: pre-cargar para tener listos cuando cierre modal
      console.log('[CardSelection] Starter con modal abierto - pre-loading cards');
      loadAvailableCards();
    }
  }, [roomTheme, showPackageModal, selectedPackage, loadAvailableCards]);

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
        
        // Actualizar cartones disponibles
        setAvailableCards(response.data.cards || []);
        
        // Solo ajustar maxCards si NO hay paquete seleccionado
        if (!selectedPackage || selectedPackage.total === 0) {
          const maxAllowed = Math.min(response.data.maxSelection || 20, 20 - currentCards);
          setMaxCards(maxAllowed);
        }
        
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

    // Validar cantidad EXACTA según paquete seleccionado
    if (selectedPackage && selectedPackage.total > 0) {
      if (selectedCards.length !== selectedPackage.total) {
        alert(`⚠️ Debes seleccionar exactamente ${selectedPackage.total} cartones\n(${selectedPackage.buy} para comprar + ${selectedPackage.bonus} yapas)\n\nActualmente tienes: ${selectedCards.length}`);
        return;
      }
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

      // Enviar TODOS los IDs de cartones juntos
      // El backend usará packageInfo para determinar cuáles son gift
      const allCardIds = selectedCards.map(c => c.id);
      
      console.log('[CardSelection] Confirmando selección:', {
        total: allCardIds.length,
        roomTheme,
        roomDB,
        selectedPackage,
        allCardIds
      });

      const token = localStorage.getItem('playerToken') || localStorage.getItem('token');
      const response = await axios.post('/api/cards/select', 
        {
          cardIds: allCardIds,         // TODOS los cartones
          room: roomDB,
          packageInfo: selectedPackage ? {
            id: selectedPackage.id,
            buy: selectedPackage.buy,
            bonus: selectedPackage.bonus,
            total: selectedPackage.total
          } : null
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Mostrar modal de éxito con total (comprados + yapas)
      setPurchasedCount(allCardIds.length);
      setShowSuccessModal(true);

      // Después de 3 segundos, cerrar modal y redirigir a sala
      setTimeout(() => {
        setShowSuccessModal(false);
        onCardsSelected(response.data.cards, response.data.remainingTickets);
      }, 3000);
    } catch (error) {
      console.error('Error reserving cards:', error);
      console.error('Error details:', error.response?.data);
      
      // Error 402: Fondos insuficientes - mostrar modal especial
      if (error.response?.status === 402) {
        setFundsError(error.response.data);
        setShowInsufficientFundsModal(true);
      } else {
        const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Error seleccionando cartones';
        alert(`❌ ${errorMsg}`);
      }
      
      // Recargar lista por si algunos cartones ya fueron tomados
      loadAvailableCards();
    }
  };

  // Manejar salida con advertencia si hay cartones reservados
  const handleExit = () => {
    // Siempre mostrar advertencia si hay cartones seleccionados
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
  
  // Mostrar modal de paquetes al inicio (sin early return)
  if (showPackageModal) {
    return (
      <div className="package-modal-wrapper">
        <PackageSelectionModal
          onSelectPackage={handlePackageSelection}
          onClose={() => setShowPackageModal(false)}
          roomTheme={roomTheme}
        />
      </div>
    );
  }

  // Mostrar loading si está cargando Y no hay cartones
  if (loading && availableCards.length === 0) {
    return (
      <div className={`card-selection-lobby theme-${roomTheme}`}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Cargando cartones disponibles...</p>
        </div>
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
                {selectedPackage && selectedPackage.bonus > 0 ? (
                  <>
                    Paquete: <strong>{selectedPackage.buy} para comprar + {selectedPackage.bonus} yapas gratis</strong> 
                    {currentCards > 0 && ` (Ya tienes ${currentCards} en sala)`}
                  </>
                ) : currentCards > 0 ? (
                  `Tienes ${currentCards} cartones. Selecciona hasta ${maxCards} más (Total: ${currentCards + maxCards} / 20)`
                ) : (
                  `Elige hasta ${maxCards} cartones para jugar gratis`
                )}
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
            <span className="counter-label">
              {selectedPackage && selectedPackage.bonus > 0 
                ? `Selecciona ${selectedPackage.total} cartones (${selectedPackage.buy} para comprar + ${selectedPackage.bonus} yapas):` 
                : 'Cartones seleccionados:'}
            </span>
            <span className="counter-value">
              {selectedCards.length} / {maxCards}
            </span>
            {selectedPackage && selectedPackage.bonus > 0 && selectedCards.length > selectedPackage.buy && (
              <span className="counter-bonus">+ {selectedCards.length - selectedPackage.buy} yapas elegidas 🎁</span>
            )}
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
          className={`refresh-cards-btn refresh-cards-btn-${roomTheme}`}
          onClick={handleRefreshCards}
          disabled={refreshing || loading}
        >
          {refreshing ? '🔄 Actualizando...' : '💾 Reservar cartones seleccionados y Mostrar nuevos'}
        </button>
        <span className="total-available-text">
          Mostrando 5 de {totalAvailable} cartones disponibles
        </span>
      </div>

      {/* Grid de Cartones */}
      <div className="cards-grid">
        {/* Cartones normales disponibles para seleccionar */}
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

      {/* Modal de éxito */}
      {showSuccessModal && (
        <div className="success-modal-overlay">
          <div className={`success-modal success-modal-${roomTheme}`}>
            <div className="success-icon">✅</div>
            <h2>¡Compra Exitosa!</h2>
            {selectedPackage && selectedPackage.bonus > 0 ? (
              <>
                <p className="success-count">
                  {selectedPackage.buy} cartón{selectedPackage.buy > 1 ? 'es' : ''} comprado{selectedPackage.buy > 1 ? 's' : ''}
                </p>
                <p className="success-bonus">
                  🎁 + {selectedPackage.bonus} yapa{selectedPackage.bonus > 1 ? 's' : ''} gratis
                </p>
                <p className="success-total">
                  Total: {purchasedCount} cartones
                </p>
              </>
            ) : (
              <p className="success-count">
                {purchasedCount} cartón{purchasedCount > 1 ? 'es' : ''} confirmado{purchasedCount > 1 ? 's' : ''}
              </p>
            )}
            <p className="success-message">Redirigiendo a la sala...</p>
            <div className="success-spinner"></div>
          </div>
        </div>
      )}

      {/* Modal de fondos insuficientes */}
      {showInsufficientFundsModal && (
        <div className="exit-warning-modal-overlay">
          <div className="exit-warning-modal" style={{ maxWidth: '500px' }}>
            <div className="warning-icon" style={{ fontSize: '3rem' }}>💰</div>
            <h2>Fondos Insuficientes</h2>
            <p style={{ marginBottom: '15px' }}>
              No tienes suficientes tickets ni balance para seleccionar <strong>{fundsError?.cardsRequested || 0} cartones</strong>.
            </p>
            <div style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.1)', 
              padding: '15px', 
              borderRadius: '10px',
              marginBottom: '15px',
              textAlign: 'left'
            }}>
              <p style={{ margin: '5px 0' }}>
                💵 <strong>Costo por cartón:</strong> ${fundsError?.cardCost?.toLocaleString('es-CO') || 0}
              </p>
              <p style={{ margin: '5px 0' }}>
                📊 <strong>Total necesario:</strong> ${fundsError?.required?.toLocaleString('es-CO') || 0}
              </p>
              <p style={{ margin: '5px 0' }}>
                💰 <strong>Tu balance:</strong> ${fundsError?.balance?.toLocaleString('es-CO') || 0}
              </p>
            </div>
            <p style={{ fontSize: '0.95rem', color: '#ffd700' }}>
              📞 Por favor contacta a tu agente para recargar tu balance
            </p>
            <div className="warning-actions">
              <button 
                className="btn-confirm-exit" 
                onClick={() => setShowInsufficientFundsModal(false)}
                style={{ width: '100%' }}
              >
                <FaCheck /> Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardSelectionLobby;
