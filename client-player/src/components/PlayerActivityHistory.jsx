import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/PlayerActivityHistory.css';

const PlayerActivityHistory = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/activity-history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(response.data.history);
      setError(null);
    } catch (err) {
      console.error('Error cargando historial:', err);
      setError('Error al cargar el historial');
    } finally {
      setLoading(false);
    }
  };

  const loadSessionDetails = async (sessionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/activity-history/session/${sessionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedSession(response.data.session);
    } catch (err) {
      console.error('Error cargando detalle de sesión:', err);
      alert('Error al cargar detalles del sorteo');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getRoomName = (room) => {
    const names = {
      'free_starter': 'Starter Gratis',
      'bronce': 'Bronce',
      'plata': 'Plata',
      'oro': 'Oro'
    };
    return names[room] || room;
  };

  const getStatusBadge = (status) => {
    const badges = {
      'pending': { text: 'Pendiente', class: 'badge-pending' },
      'approved': { text: 'Aprobado', class: 'badge-approved' },
      'paid': { text: 'Pagado', class: 'badge-paid' },
      'rejected': { text: 'Rechazado', class: 'badge-rejected' },
      'cancelled': { text: 'Cancelado', class: 'badge-cancelled' }
    };
    const badge = badges[status] || { text: status, class: 'badge-default' };
    return <span className={`status-badge ${badge.class}`}>{badge.text}</span>;
  };

  const renderCardNumbers = (cardData) => {
    if (!cardData || !Array.isArray(cardData)) return null;
    return (
      <div className="bingo-card-mini">
        {cardData.map((row, i) => (
          <div key={i} className="card-row">
            {row.map((num, j) => (
              <div key={j} className="card-cell">{num}</div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  const renderSummary = () => {
    if (!history?.summary) return null;
    const s = history.summary;
    
    return (
      <div className="summary-section">
        <h3>📊 Resumen de Actividad</h3>
        <div className="summary-grid">
          <div className="summary-card">
            <div className="summary-icon">🎫</div>
            <div className="summary-value">{s.total_ticket_purchases}</div>
            <div className="summary-label">Compras de Tickets</div>
          </div>
          <div className="summary-card">
            <div className="summary-icon">🎴</div>
            <div className="summary-value">{s.total_cards_used}</div>
            <div className="summary-label">Cartones Canjeados</div>
          </div>
          <div className="summary-card">
            <div className="summary-icon">🎮</div>
            <div className="summary-value">{s.sessions_played}</div>
            <div className="summary-label">Sorteos Jugados</div>
          </div>
          <div className="summary-card">
            <div className="summary-icon">🏆</div>
            <div className="summary-value">{s.prizes_won}</div>
            <div className="summary-label">Premios Ganados</div>
          </div>
          <div className="summary-card highlight">
            <div className="summary-icon">💰</div>
            <div className="summary-value">{formatMoney(s.total_prizes_paid)}</div>
            <div className="summary-label">Total Cobrado</div>
          </div>
          <div className="summary-card">
            <div className="summary-icon">📤</div>
            <div className="summary-value">{s.withdrawals_approved}</div>
            <div className="summary-label">Retiros Aprobados</div>
          </div>
        </div>
      </div>
    );
  };

  const renderTicketsMovements = () => {
    if (!history?.ticketsMovements?.length) {
      return <div className="no-data">No hay movimientos de tickets registrados</div>;
    }

    return (
      <div className="movements-list">
        <h3>🎫 Movimientos de Tickets</h3>
        <table className="history-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Sala</th>
              <th>Cantidad</th>
              <th>Descripción</th>
            </tr>
          </thead>
          <tbody>
            {history.ticketsMovements.map((mov) => (
              <tr key={mov.id}>
                <td>{formatDate(mov.created_at)}</td>
                <td>
                  <span className={`movement-type ${mov.movement_type}`}>
                    {mov.movement_type === 'deposit' ? 'Compra' : mov.movement_type}
                  </span>
                </td>
                <td>{getRoomName(mov.room)}</td>
                <td className="quantity">{mov.quantity}</td>
                <td className="description">{mov.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderCardsExchanged = () => {
    if (!history?.cardsExchanged?.length) {
      return <div className="no-data">No hay cartones canjeados</div>;
    }

    return (
      <div className="cards-list">
        <h3>🎴 Cartones Canjeados</h3>
        <div className="cards-grid">
          {history.cardsExchanged.map((card) => (
            <div key={card.id} className="card-item">
              <div className="card-header">
                <span className="card-serial">#{card.serial}</span>
                {card.is_gift ? <span className="gift-badge">PLUS</span> : null}
              </div>
              <div className="card-info">
                <div className="info-row">
                  <span>Sala:</span>
                  <strong>{getRoomName(card.room)}</strong>
                </div>
                <div className="info-row">
                  <span>Fecha:</span>
                  <strong>{formatDate(card.selected_at)}</strong>
                </div>
                {card.session_start && (
                  <div className="info-row">
                    <span>Sorteo:</span>
                    <strong>{formatDate(card.session_start)}</strong>
                  </div>
                )}
              </div>
              {renderCardNumbers(card.card_data)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSessions = () => {
    if (!history?.participatedSessions?.length) {
      return <div className="no-data">No has participado en sorteos aún</div>;
    }

    return (
      <div className="sessions-list">
        <h3>🎮 Sorteos Jugados</h3>
        <div className="sessions-grid">
          {history.participatedSessions.map((session) => (
            <div key={session.history_id} className="session-card">
              <div className="session-header">
                <div className="session-room">{getRoomName(session.room)}</div>
                <div className="session-date">
                  {session.draw_date} {session.draw_time}
                </div>
              </div>
              
              <div className="session-body">
                <div className="session-stat">
                  <span>Mis cartones:</span>
                  <strong>{session.my_cards_count}</strong>
                </div>
                <div className="session-stat">
                  <span>Total participantes:</span>
                  <strong>{session.total_cards} cartones</strong>
                </div>
                
                {session.winner_linea_username && (
                  <div className={`winner-info ${session.is_winner_linea ? 'highlight' : ''}`}>
                    <span>🏁 Línea:</span>
                    <strong>
                      {session.winner_linea_username}
                      {session.is_winner_linea ? ' (¡TÚ!)' : ''}
                    </strong>
                    <small>Bolilla {session.linea_ball_index + 1}: #{session.linea_ball_number}</small>
                  </div>
                )}
                
                {session.winner_bingo_username && (
                  <div className={`winner-info ${session.is_winner_bingo ? 'highlight' : ''}`}>
                    <span>🏆 BINGO:</span>
                    <strong>
                      {session.winner_bingo_username}
                      {session.is_winner_bingo ? ' (¡TÚ!)' : ''}
                    </strong>
                    <small>Bolilla {session.bingo_ball_index + 1}: #{session.bingo_ball_number}</small>
                  </div>
                )}
              </div>

              <button 
                className="btn-details"
                onClick={() => loadSessionDetails(session.game_session_id)}
              >
                Ver Detalles Completos
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPrizes = () => {
    if (!history?.prizesWon?.length) {
      return <div className="no-data">No has ganado premios aún</div>;
    }

    return (
      <div className="prizes-list">
        <h3>🏆 Premios Ganados</h3>
        <table className="history-table">
          <thead>
            <tr>
              <th>Fecha Sorteo</th>
              <th>Sala</th>
              <th>Premio</th>
              <th>Monto</th>
              <th>Cartón</th>
              <th>Reclamado</th>
              <th>Estado</th>
              <th>Pagado</th>
            </tr>
          </thead>
          <tbody>
            {history.prizesWon.map((prize) => (
              <tr key={prize.id}>
                <td>{formatDate(prize.session_date)}</td>
                <td>{getRoomName(prize.room)}</td>
                <td>
                  <span className={`prize-type ${prize.prize_type}`}>
                    {prize.prize_type === 'linea' ? '🏁 LÍNEA' : '🏆 BINGO'}
                  </span>
                </td>
                <td className="amount">{formatMoney(prize.prize_amount)}</td>
                <td className="serial">{prize.card_serial}</td>
                <td>{formatDate(prize.claimed_at)}</td>
                <td>{getStatusBadge(prize.payment_status)}</td>
                <td>{prize.paid_at ? formatDate(prize.paid_at) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderWithdrawals = () => {
    if (!history?.withdrawals?.length) {
      return <div className="no-data">No hay solicitudes de retiro</div>;
    }

    return (
      <div className="withdrawals-list">
        <h3>📤 Solicitudes de Retiro</h3>
        <table className="history-table">
          <thead>
            <tr>
              <th>Fecha Solicitud</th>
              <th>Monto</th>
              <th>Método</th>
              <th>Destino</th>
              <th>Estado</th>
              <th>Procesado</th>
              <th>Notas</th>
            </tr>
          </thead>
          <tbody>
            {history.withdrawals.map((w) => (
              <tr key={w.id}>
                <td>{formatDate(w.created_at)}</td>
                <td className="amount">{formatMoney(w.amount)}</td>
                <td>{w.payment_method}</td>
                <td className="payment-details">
                  {w.payment_details?.account_holder || w.payment_details?.cbu || '-'}
                </td>
                <td>{getStatusBadge(w.status)}</td>
                <td>{w.processed_at ? formatDate(w.processed_at) : '-'}</td>
                <td className="notes">{w.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderBalance = () => {
    if (!history?.balanceMovements?.length) {
      return <div className="no-data">No hay movimientos de balance</div>;
    }

    return (
      <div className="balance-list">
        <h3>💰 Movimientos de Balance</h3>
        <table className="history-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Monto</th>
              <th>Balance Anterior</th>
              <th>Balance Final</th>
              <th>Descripción</th>
            </tr>
          </thead>
          <tbody>
            {history.balanceMovements.map((mov) => (
              <tr key={mov.id}>
                <td>{formatDate(mov.created_at)}</td>
                <td>
                  <span className={`movement-type ${mov.movement_type}`}>
                    {mov.movement_type}
                  </span>
                </td>
                <td className={`amount ${parseFloat(mov.amount) < 0 ? 'negative' : 'positive'}`}>
                  {formatMoney(mov.amount)}
                </td>
                <td>{formatMoney(mov.balance_before)}</td>
                <td>{formatMoney(mov.balance_after)}</td>
                <td className="description">{mov.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderSessionDetailsModal = () => {
    if (!selectedSession) return null;

    return (
      <div className="modal-overlay" onClick={() => setSelectedSession(null)}>
        <div className="session-details-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Detalles del Sorteo</h2>
            <button className="btn-close" onClick={() => setSelectedSession(null)}>×</button>
          </div>
          
          <div className="modal-body">
            <div className="session-info-grid">
              <div className="info-item">
                <label>Sala:</label>
                <span>{getRoomName(selectedSession.room)}</span>
              </div>
              <div className="info-item">
                <label>Fecha:</label>
                <span>{selectedSession.draw_date} {selectedSession.draw_time}</span>
              </div>
              <div className="info-item">
                <label>Mis cartones:</label>
                <span>{selectedSession.my_cards?.length || 0}</span>
              </div>
            </div>

            <div className="balls-sequence">
              <h4>📊 Secuencia de Bolillas ({selectedSession.ball_sequence?.length || 0})</h4>
              <div className="balls-grid">
                {selectedSession.ball_sequence?.map((ball, idx) => (
                  <div key={idx} className="ball-item">
                    <div className="ball-number">{ball}</div>
                    <div className="ball-index">#{idx + 1}</div>
                  </div>
                ))}
              </div>
            </div>

            {selectedSession.my_cards?.length > 0 && (
              <div className="my-cards-section">
                <h4>🎴 Mis Cartones en este Sorteo</h4>
                <div className="cards-grid">
                  {selectedSession.my_cards.map((card) => (
                    <div key={card.id} className="card-item">
                      <div className="card-serial">#{card.serial}</div>
                      {card.is_gift && <span className="gift-badge">PLUS</span>}
                      {renderCardNumbers(card.card_data)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedSession.my_prizes?.length > 0 && (
              <div className="prizes-section">
                <h4>🏆 Mis Premios en este Sorteo</h4>
                {selectedSession.my_prizes.map((prize, idx) => (
                  <div key={idx} className="prize-won-item">
                    <span className={`prize-type ${prize.prize_type}`}>
                      {prize.prize_type === 'linea' ? '🏁 LÍNEA' : '🏆 BINGO'}
                    </span>
                    <span className="prize-amount">{formatMoney(prize.prize_amount)}</span>
                    <span>{getStatusBadge(prize.payment_status)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="activity-history-modal">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Cargando historial...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="activity-history-modal">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={loadHistory}>Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="activity-history-modal">
        <div className="modal-header">
          <h2>📋 Mi Historial de Actividad</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            📊 Resumen
          </button>
          <button 
            className={`tab ${activeTab === 'tickets' ? 'active' : ''}`}
            onClick={() => setActiveTab('tickets')}
          >
            🎫 Tickets
          </button>
          <button 
            className={`tab ${activeTab === 'cards' ? 'active' : ''}`}
            onClick={() => setActiveTab('cards')}
          >
            🎴 Cartones
          </button>
          <button 
            className={`tab ${activeTab === 'sessions' ? 'active' : ''}`}
            onClick={() => setActiveTab('sessions')}
          >
            🎮 Sorteos
          </button>
          <button 
            className={`tab ${activeTab === 'prizes' ? 'active' : ''}`}
            onClick={() => setActiveTab('prizes')}
          >
            🏆 Premios
          </button>
          <button 
            className={`tab ${activeTab === 'withdrawals' ? 'active' : ''}`}
            onClick={() => setActiveTab('withdrawals')}
          >
            📤 Retiros
          </button>
          <button 
            className={`tab ${activeTab === 'balance' ? 'active' : ''}`}
            onClick={() => setActiveTab('balance')}
          >
            💰 Balance
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'summary' && renderSummary()}
          {activeTab === 'tickets' && renderTicketsMovements()}
          {activeTab === 'cards' && renderCardsExchanged()}
          {activeTab === 'sessions' && renderSessions()}
          {activeTab === 'prizes' && renderPrizes()}
          {activeTab === 'withdrawals' && renderWithdrawals()}
          {activeTab === 'balance' && renderBalance()}
        </div>
      </div>

      {renderSessionDetailsModal()}
    </>
  );
};

export default PlayerActivityHistory;
