/**
 * ShopScreen.jsx
 * 
 * Pantalla de tienda: Comprar cartones con opción de Tickets o Dinero
 * 
 * Versión: 1.3.0
 */

import React, { useState, useEffect } from 'react';
import '../styles/ShopScreen.css';

export default function ShopScreen() {
  const [roomType, setRoomType] = useState('bronce');
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('automatic'); // 'automatic' = decide automáticamente
  const [userTickets, setUserTickets] = useState([]);
  const [userBalance, setUserBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success', 'error', 'warning'
  const [rooms, setRooms] = useState([]);

  // Cargar datos iniciales
  useEffect(() => {
    loadTickets();
    loadUserBalance();
    loadRooms();
  }, []);

  const loadTickets = async () => {
    try {
      const response = await fetch('/api/shop/my-tickets', {
        headers: { Authorization: `Bearer ${localStorage.getItem('playerToken') || localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setUserTickets(data.tickets);
      }
    } catch (error) {
      console.error('Error cargando tickets:', error);
    }
  };

  const loadUserBalance = async () => {
    try {
      const response = await fetch('/api/users/profile', {
        headers: { Authorization: `Bearer ${localStorage.getItem('playerToken') || localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setUserBalance(data.user.balance);
      }
    } catch (error) {
      console.error('Error cargando balance:', error);
    }
  };

  const loadRooms = async () => {
    try {
      const response = await fetch('/api/game/sessions', {
        headers: { Authorization: `Bearer ${localStorage.getItem('playerToken') || localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setRooms(data.sessions);
      }
    } catch (error) {
      console.error('Error cargando salas:', error);
    }
  };

  // Obtener información de la sala
  const getRoomInfo = (room) => {
    const roomData = rooms.find(r => r.room === room);
    return roomData ? { name: roomData.name, cost: roomData.cost } : { name: room, cost: 0 };
  };

  // Obtener tickets disponibles para una sala
  const getTicketsForRoom = (room) => {
    const ticketMap = { bronce: 'bronce', plata: 'plata', oro: 'oro' };
    const ticketType = ticketMap[room];
    return userTickets.filter(t => t.ticket_room === ticketType);
  };

  // Determinar si puede usar ticket
  const canUseTicket = () => {
    if (roomType !== 'bronce') return false;
    const bronzeTickets = getTicketsForRoom('bronce');
    return bronzeTickets.length > 0 && bronzeTickets[0].quantity > 0;
  };

  // Determinar método de pago automáticamente
  const getPaymentMethod = () => {
    if (paymentMethod !== 'automatic') return paymentMethod;
    if (canUseTicket()) return 'ticket';
    return 'cash';
  };

  // Calcular costo total
  const getRoomInfo_cost = () => {
    const roomData = rooms.find(r => r.room === roomType);
    return roomData ? parseFloat(roomData.cost) : 0;
  };

  const totalCost = getRoomInfo_cost() * quantity;

  // Comprar cartón
  const handleBuyCard = async () => {
    if (!roomType || quantity < 1) {
      setMessage('Selecciona una sala y cantidad válida');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const paymentType = getPaymentMethod();

      const response = await fetch('/api/shop/buy-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('playerToken') || localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          roomType,
          quantity,
          paymentMethod: paymentType
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage(data.message);
        setMessageType('success');

        // Recargar datos
        loadTickets();
        loadUserBalance();

        // Limpiar formulario
        setTimeout(() => {
          setQuantity(1);
          setMessage('');
        }, 2000);
      } else {
        setMessage(data.message);
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error comprando cartón:', error);
      setMessage('Error al procesar la compra');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const roomInfo = getRoomInfo(roomType);
  const paymentType = getPaymentMethod();
  const hasEnoughBalance = userBalance >= totalCost;
  const canBuy = canUseTicket() || hasEnoughBalance;

  return (
    <div className="shop-container">
      <div className="shop-header">
        <h1>🛍️ Tienda de Cartones</h1>
        <div className="user-stats">
          <div className="stat">
            <span className="stat-label">Balance</span>
            <span className="stat-value">${userBalance.toFixed(2)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Tickets</span>
            <span className="stat-value">{userTickets.reduce((sum, t) => sum + t.quantity, 0)}</span>
          </div>
        </div>
      </div>

      {/* Mensaje */}
      {message && (
        <div className={`message-banner message-${messageType}`}>
          {message}
        </div>
      )}

      <div className="shop-content">
        {/* Selector de Sala */}
        <div className="shop-section">
          <h2>1. Elige una Sala</h2>
          <div className="room-selector">
            {['bronce', 'plata', 'oro'].map(room => (
              <button
                key={room}
                className={`room-button ${roomType === room ? 'active' : ''}`}
                onClick={() => setRoomType(room)}
              >
                <span className={`room-icon room-${room}`}>💰</span>
                <span className="room-name">{room.toUpperCase()}</span>
                <span className="room-price">
                  ${rooms.find(r => r.room === room)?.cost || '0'}/cartón
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Selector de Cantidad */}
        <div className="shop-section">
          <h2>2. Cantidad de Cartones</h2>
          <div className="quantity-selector">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
            <input
              type="number"
              min="1"
              max="10"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            />
            <button onClick={() => setQuantity(Math.min(10, quantity + 1))}>+</button>
          </div>
        </div>

        {/* Selector de Método de Pago */}
        <div className="shop-section">
          <h2>3. Método de Pago</h2>
          <div className="payment-methods">
            {/* Opción de Ticket (Solo Bronce) */}
            {roomType === 'bronce' && canUseTicket() && (
              <label className="payment-option">
                <input
                  type="radio"
                  value="ticket"
                  checked={paymentMethod === 'ticket'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <div className="payment-content">
                  <span className="payment-icon">🎫</span>
                  <div className="payment-info">
                    <span className="payment-title">Usar Ticket</span>
                    <span className="payment-details">
                      GRATIS - {getTicketsForRoom('bronce')[0]?.quantity || 0} disponibles
                    </span>
                  </div>
                </div>
              </label>
            )}

            {/* Opción de Dinero (Todas las salas) */}
            <label className="payment-option">
              <input
                type="radio"
                value="cash"
                checked={paymentMethod === 'cash'}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <div className="payment-content">
                <span className="payment-icon">💰</span>
                <div className="payment-info">
                  <span className="payment-title">Pagar con Balance</span>
                  <span className="payment-details">
                    ${totalCost.toFixed(2)} (Balance disponible: ${userBalance.toFixed(2)})
                  </span>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Resumen de Compra */}
        <div className="shop-section shop-summary">
          <h2>Resumen</h2>
          <div className="summary-item">
            <span>Sala</span>
            <span className="summary-value">{roomType.toUpperCase()}</span>
          </div>
          <div className="summary-item">
            <span>Cantidad</span>
            <span className="summary-value">{quantity} {quantity !== 1 ? 'cartones' : 'cartón'}</span>
          </div>
          <div className="summary-item">
            <span>Precio Unitario</span>
            <span className="summary-value">${getRoomInfo_cost().toFixed(2)}</span>
          </div>
          <div className="summary-item">
            <span>Método de Pago</span>
            <span className="summary-value">
              {paymentType === 'ticket' ? '🎫 Ticket' : '💳 Dinero'}
            </span>
          </div>
          {paymentType === 'cash' && (
            <div className="summary-item total">
              <span>Total</span>
              <span className={`summary-value ${!hasEnoughBalance ? 'error' : ''}`}>
                ${totalCost.toFixed(2)}
              </span>
            </div>
          )}
          {!hasEnoughBalance && paymentType === 'cash' && (
            <div className="warning">
              ⚠️ Balance insuficiente. Te faltan ${(totalCost - userBalance).toFixed(2)}
            </div>
          )}
        </div>

        {/* Botón Comprar */}
        <button
          className="buy-button"
          onClick={handleBuyCard}
          disabled={loading || !canBuy}
        >
          {loading ? 'Procesando...' : `Comprar ${quantity} ${quantity !== 1 ? 'Cartones' : 'Cartón'}`}
        </button>

        {/* Información Adicional */}
        <div className="shop-info">
          <h3>ℹ️ Información</h3>
          <ul>
            <li>Sala <strong>Bronce</strong>: Premios de $1 a $50</li>
            <li>Sala <strong>Plata</strong>: Premios de $50 a $200</li>
            <li>Sala <strong>Oro</strong>: Premios de $200+</li>
            <li>🎫 Los tickets se pueden usar solo en Sala Bronce</li>
            <li>💰 Usa parte de tus premios ganados para comprar más cartones</li>
            <li>💳 Solicita depósitos a tu agente para recargar balance</li>
            <li>Máximo 10 cartones por compra</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
