import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Trophy, DollarSign, X, Sparkles } from 'lucide-react';
import ConfettiEffect from './ConfettiEffect';
import ParticleEffect from './ParticleEffect';
import BingoCardPreview from './BingoCardPreview';
import '../styles/WinnerNotifications.css';

/**
 * WinnerNotifications - Notificaciones flotantes de ganadores en tiempo real
 * 
 * Escucha eventos Socket.IO:
 * - line_winner: Ganador de línea
 * - bingo_winner: Ganador de BINGO
 * - show_payment_forms: Mostrar formulario de retiro
 * 
 * Features:
 * - Stack de notificaciones auto-dismiss
 * - Animaciones de entrada/salida
 * - Diferentes estilos por tipo de premio
 * - Formulario de retiro modal
 * - Confetti en BINGO wins
 * - Partículas en line wins
 */

export default function WinnerNotifications({ socket, currentUser }) {
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [winnerInfo, setWinnerInfo] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [particleLineType, setParticleLineType] = useState('horizontal');
  const [showLineInfoModal, setShowLineInfoModal] = useState(false);
  const [lineWinnerData, setLineWinnerData] = useState(null);
  const notificationIdRef = useRef(0);

  // Detectar la sala actual desde la URL
  const getCurrentRoom = () => {
    const pathname = location.pathname;
    if (pathname.includes('/starter')) return 'starter';
    if (pathname.includes('/bronze')) return 'bronze';
    if (pathname.includes('/silver')) return 'silver';
    if (pathname.includes('/gold')) return 'gold';
    return 'starter'; // default
  };

  useEffect(() => {
    if (!socket) return;

    // Escuchar ganador de línea
    socket.on('line_winner', (data) => {
      console.log('[WinnerNotifications] Line winner:', data);
      
      const isMe = currentUser && data.username === currentUser.username;
      
      addNotification({
        type: 'line',
        username: data.username || data.winner?.username,
        prize: data.prizeAmount,
        lineType: data.lineType,
        isMe: isMe
      });

      // Si soy yo, efectos especiales
      if (isMe) {
        // Vibrar dispositivo
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
        
        // Mostrar partículas
        setParticleLineType(data.lineType || 'horizontal');
        setShowParticles(true);
        setTimeout(() => setShowParticles(false), 1600);
      } else {
        // Si NO soy yo, mostrar modal informativo con cartón ganador
        setLineWinnerData({
          username: data.username || data.winner?.username,
          lineType: data.lineType,
          winningCard: data.winningCard, // { numbers: [[...]], winningNumbers: [...], serial }
          room: getCurrentRoom() // Detectar sala actual para colores correctos
        });
        setShowLineInfoModal(true);
        
        // Auto-cerrar después de 6 segundos (más tiempo para ver el cartón)
        setTimeout(() => {
          setShowLineInfoModal(false);
        }, 6000);
      }
    });

    // Escuchar ganador de BINGO
    socket.on('bingo_winner', (data) => {
      console.log('[WinnerNotifications] BINGO winner:', data);
      addNotification({
        type: 'bingo',
        username: data.username,
        prize: data.prizeAmount,
        isMe: currentUser && data.username === currentUser.username
      });

      // Si soy yo, efectos especiales intensos
      if (currentUser && data.username === currentUser.username) {
        // Vibrar intenso
        if ('vibrate' in navigator) {
          navigator.vibrate([300, 100, 300, 100, 300]);
        }
        
        // Mostrar confetti
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3100);
      }
    });

    // Escuchar show payment forms
    socket.on('show_payment_forms', (data) => {
      console.log('[WinnerNotifications] Show payment forms:', data);
      
      // Verificar si soy uno de los ganadores
      if (currentUser && data.winners) {
        const myWin = data.winners.find(w => w.userId === currentUser.userId || w.username === currentUser.username);
        if (myWin) {
          setWinnerInfo({
            ...myWin,
            gameSessionId: data.gameSessionId
          });
          setShowPaymentForm(true);
        }
      }
    });

    return () => {
      socket.off('line_winner');
      socket.off('bingo_winner');
      socket.off('show_payment_forms');
    };
  }, [socket, currentUser]);

  const addNotification = (notification) => {
    const id = notificationIdRef.current++;
    const newNotif = {
      id,
      ...notification,
      timestamp: Date.now()
    };

    setNotifications(prev => [...prev, newNotif]);

    // Auto-remove después de 5 segundos
    setTimeout(() => {
      removeNotification(id);
    }, 5000);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleSubmitWithdrawal = async (formData) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/finance/withdrawal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('playerToken') || localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          amount: winnerInfo.prizeAmount,
          game_session_id: winnerInfo.gameSessionId,
          winner_type: winnerInfo.type, // 'line' | 'bingo'
          ...formData
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al procesar retiro');
      }

      const data = await response.json();
      console.log('[WinnerNotifications] Withdrawal submitted:', data);

      // Mostrar notificación de éxito
      addNotification({
        type: 'success',
        message: '¡Retiro solicitado! Procesaremos tu pago en 20 minutos.',
        isMe: true
      });

      setShowPaymentForm(false);
      setWinnerInfo(null);

    } catch (error) {
      console.error('[WinnerNotifications] Error submitting withdrawal:', error);
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <>
      {/* Efectos visuales */}
      <ConfettiEffect 
        isActive={showConfetti} 
        duration={3000}
        onComplete={() => setShowConfetti(false)}
      />
      
      <ParticleEffect 
        isActive={showParticles}
        lineType={particleLineType}
        duration={1500}
        onComplete={() => setShowParticles(false)}
      />

      {/* Stack de notificaciones */}
      <div className="winner-notifications-stack">
        {notifications.map((notif, index) => (
          <NotificationCard
            key={notif.id}
            notification={notif}
            index={index}
            onClose={() => removeNotification(notif.id)}
          />
        ))}
      </div>

      {/* Modal de formulario de retiro */}
      {showPaymentForm && winnerInfo && (
        <PaymentFormModal
          winnerInfo={winnerInfo}
          onClose={() => {
            setShowPaymentForm(false);
            setWinnerInfo(null);
          }}
          onSubmit={handleSubmitWithdrawal}
        />
      )}

      {/* Modal informativo de línea ganada (para NO ganadores) */}
      {showLineInfoModal && lineWinnerData && (
        <LineWinnerInfoModal
          winnerData={lineWinnerData}
          onClose={() => setShowLineInfoModal(false)}
        />
      )}
    </>
  );
}

// Componente: Tarjeta de notificación individual
function NotificationCard({ notification, index, onClose }) {
  const { type, username, prize, lineType, isMe, message } = notification;

  const getIcon = () => {
    if (type === 'bingo') return <Trophy size={24} />;
    if (type === 'line') return <Sparkles size={24} />;
    if (type === 'success') return <DollarSign size={24} />;
    return null;
  };

  const getTitle = () => {
    if (type === 'success') return message;
    if (type === 'bingo') return isMe ? '🎉 ¡GANASTE BINGO!' : `${username} ganó BINGO`;
    if (type === 'line') {
      const lineName = lineType ? ` (${lineType})` : '';
      return isMe ? `🎯 ¡Ganaste Línea${lineName}!` : `${username} ganó Línea${lineName}`;
    }
    return '';
  };

  const getPrizeText = () => {
    if (!prize) return '';
    return `+$${prize.toLocaleString()}`;
  };

  return (
    <div 
      className={`notification-card ${type} ${isMe ? 'is-me' : ''}`}
      style={{ 
        transform: `translateY(${index * -110}%)`,
        zIndex: 1000 - index
      }}
    >
      <div className="notification-icon">
        {getIcon()}
      </div>

      <div className="notification-content">
        <p className="notification-title">{getTitle()}</p>
        {prize && (
          <p className="notification-prize">{getPrizeText()}</p>
        )}
      </div>

      <button 
        className="notification-close"
        onClick={onClose}
      >
        <X size={16} />
      </button>
    </div>
  );
}

// Componente: Modal de formulario de retiro
function PaymentFormModal({ winnerInfo, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    payment_method: 'mercadopago',
    mercadopago_alias: '',
    mercadopago_cvu: '',
    bank_name: '',
    bank_account: '',
    bank_cbu: '',
    comments: ''
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validaciones
    if (formData.payment_method === 'mercadopago') {
      if (!formData.mercadopago_alias && !formData.mercadopago_cvu) {
        alert('Ingresa tu Alias o CVU de Mercado Pago');
        return;
      }
      // Validar CVU si tiene valor (debe ser 22 dígitos)
      if (formData.mercadopago_cvu && formData.mercadopago_cvu.replace(/\D/g, '').length !== 22) {
        alert('El CVU debe tener exactamente 22 dígitos numéricos');
        return;
      }
    } else if (formData.payment_method === 'bank_transfer') {
      if (!formData.bank_name || !formData.bank_cbu) {
        alert('Completa los datos bancarios');
        return;
      }
      // Validar CBU (debe ser 22 dígitos)
      if (formData.bank_cbu.replace(/\D/g, '').length !== 22) {
        alert('El CBU debe tener exactamente 22 dígitos numéricos');
        return;
      }
    }

    setSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="payment-form-modal-overlay" onClick={onClose}>
      <div className="payment-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🎊 ¡Felicitaciones, Ganaste!</h2>
          <button className="btn-close-modal" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          <div className="prize-display">
            <p className="prize-label">Premio:</p>
            <p className="prize-amount">${winnerInfo.prizeAmount?.toLocaleString()}</p>
            <p className="prize-type">
              {winnerInfo.type === 'bingo' ? 'BINGO' : `Línea ${winnerInfo.lineType || ''}`}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="payment-form">
            <div className="form-group">
              <label>Método de Pago</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                required
              >
                <option value="mercadopago">Mercado Pago</option>
                <option value="bank_transfer">Transferencia Bancaria</option>
              </select>
            </div>

            {formData.payment_method === 'mercadopago' && (
              <>
                <div className="form-group">
                  <label>Alias de Mercado Pago</label>
                  <input
                    type="text"
                    value={formData.mercadopago_alias}
                    onChange={(e) => setFormData({ ...formData, mercadopago_alias: e.target.value })}
                    placeholder="ej: TU.ALIAS.MP"
                  />
                </div>

                <div className="form-group">
                  <label>CVU (opcional - 22 dígitos)</label>
                  <input
                    type="text"
                    value={formData.mercadopago_cvu}
                    onChange={(e) => setFormData({ ...formData, mercadopago_cvu: e.target.value.replace(/\D/g, '').slice(0, 22) })}
                    placeholder="0000003100000000000000"
                    maxLength={22}
                  />
                  {formData.mercadopago_cvu && formData.mercadopago_cvu.length !== 22 && (
                    <span style={{color: '#f59e0b', fontSize: '0.75rem'}}>{formData.mercadopago_cvu.length}/22 dígitos</span>
                  )}
                </div>
              </>
            )}

            {formData.payment_method === 'bank_transfer' && (
              <>
                <div className="form-group">
                  <label>Banco</label>
                  <input
                    type="text"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    placeholder="ej: Banco Nación"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>CBU (22 dígitos)</label>
                  <input
                    type="text"
                    value={formData.bank_cbu}
                    onChange={(e) => setFormData({ ...formData, bank_cbu: e.target.value.replace(/\D/g, '').slice(0, 22) })}
                    placeholder="0000000000000000000000"
                    maxLength={22}
                    required
                  />
                  {formData.bank_cbu && formData.bank_cbu.length !== 22 && (
                    <span style={{color: '#f59e0b', fontSize: '0.75rem'}}>{formData.bank_cbu.length}/22 dígitos</span>
                  )}
                </div>

                <div className="form-group">
                  <label>Número de Cuenta</label>
                  <input
                    type="text"
                    value={formData.bank_account}
                    onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label>Comentarios (opcional)</label>
              <textarea
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                placeholder="Cualquier información adicional..."
                rows={3}
              />
            </div>

            <button 
              type="submit" 
              className="btn-submit"
              disabled={submitting}
            >
              {submitting ? 'Procesando...' : 'Solicitar Retiro'}
            </button>

            <p className="processing-time">
              ⏱️ Tu pago será procesado en 20 minutos
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

// Componente: Modal informativo de línea ganada (para jugadores que NO ganaron)
function LineWinnerInfoModal({ winnerData, onClose }) {
  const { username, lineType, winningCard, room = 'starter' } = winnerData;
  
  const getLineTypeText = () => {
    if (!lineType) return 'Línea';
    if (lineType.includes('horizontal')) return 'Horizontal';
    if (lineType.includes('vertical')) return 'Vertical';
    if (lineType.includes('diagonal')) return 'Diagonal';
    return lineType;
  };

  // Determinar qué filas son ganadoras según el tipo de línea
  const getWinningLines = () => {
    if (!lineType) return [];
    
    // Para líneas horizontales, extraer el índice de la fila
    if (lineType.includes('horizontal')) {
      const match = lineType.match(/horizontal_(\d+)/);
      if (match) return [parseInt(match[1])];
    }
    
    // Para líneas verticales, devolvemos todas las filas (resaltaremos la columna con CSS)
    if (lineType.includes('vertical')) {
      return []; // Manejado con clase especial
    }
    
    // Para diagonales, devolvemos todas las filas
    if (lineType.includes('diagonal')) {
      return []; // Manejado con clase especial
    }
    
    return [];
  };

  // Renderizar el cartón ganador usando BingoCardPreview
  const renderWinningCard = () => {
    if (!winningCard || !winningCard.numbers) {
      console.error('[LineWinnerInfoModal] ERROR: No hay datos del cartón');
      console.log('  - winningCard:', winningCard);
      return null;
    }

    const { numbers, winningNumbers = [], serial } = winningCard;
    
    console.log('[LineWinnerInfoModal] 🃏 Renderizando cartón ganador:');
    console.log('  ✅ numbers:', numbers);
    console.log('  ✅ numbers type:', typeof numbers, 'isArray:', Array.isArray(numbers));
    console.log('  ✅ winningNumbers:', winningNumbers);
    console.log('  ✅ lineType:', lineType);
    console.log('  ✅ room:', room);
    console.log('  ✅ serial:', serial);
    
    // Validar estructura del cartón
    if (!Array.isArray(numbers)) {
      console.error('[LineWinnerInfoModal] ERROR: numbers no es un array');
      return null;
    }
    
    if (numbers.length !== 3) {
      console.error('[LineWinnerInfoModal] ERROR: numbers debe tener 3 filas, tiene:', numbers.length);
    }
    
    // Preparar datos del cartón para BingoCardPreview
    const cardData = {
      card_serial: serial || 'LÍNEA-GANADORA',
      numbers: numbers
    };

    return (
      <div className="winning-card-container-line">
        <BingoCardPreview
          card={cardData}
          room={room}
          selected={false}
          onClick={null}
          showSerial={true}
          drawnNumbers={[]} // NO marcar números - dejar fondo claro para mejor visualización
          winningLines={getWinningLines()} // Filas ganadoras
          lineType={lineType} // Tipo de línea para resaltar
        />
      </div>
    );
  };

  return (
    <div className="line-winner-info-overlay" onClick={onClose}>
      <div className="line-winner-info-modal" onClick={(e) => e.stopPropagation()}>
        <button className="btn-close-modal" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="line-winner-content">
          <div className="line-winner-icon">
            <Sparkles size={48} className="icon-sparkles" />
          </div>

          <h2 className="line-winner-title">¡Línea Ganada!</h2>

          <div className="line-winner-details">
            <p className="winner-username">{username}</p>
            <p className="winner-description">ganó la línea {getLineTypeText()}</p>
          </div>

          {/* Mostrar cartón ganador con formato de sala */}
          {renderWinningCard()}

          <div className="continue-message">
            <p>Continuamos a <strong>BINGO</strong></p>
          </div>

          <button className="btn-continue" onClick={onClose}>
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
