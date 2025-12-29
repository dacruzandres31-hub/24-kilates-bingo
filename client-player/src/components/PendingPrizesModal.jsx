import React from 'react';
import '../styles/PendingPrizesModal.css';

export default function PendingPrizesModal({ prizes, onClose }) {
    if (!prizes || prizes.length === 0) return null;

    const totalAmount = prizes.reduce((sum, prize) => sum + prize.prizeAmount, 0);

    const getPrizeIcon = (type) => {
        switch (type) {
            case 'linea':
                return '📏';
            case 'bingo':
                return '🏆';
            case 'bingo_pre40':
                return '🔥';
            case 'pre40':
                return '⚡';
            default:
                return '🎁';
        }
    };

    const getPrizeTitle = (type) => {
        switch (type) {
            case 'linea':
                return 'LÍNEA';
            case 'bingo':
                return 'BINGO';
            case 'bingo_pre40':
                return 'JACKPOT PRE-40';
            case 'pre40':
                return 'PRE-40';
            default:
                return 'PREMIO';
        }
    };

    const getRoomName = (room) => {
        switch (room) {
            case 'bronce':
                return '🥉 Sala Bronce';
            case 'plata':
                return '🥈 Sala Plata';
            case 'oro':
                return '🥇 Sala Oro';
            case 'starter':
                return '🎮 Sala Starter';
            default:
                return room;
        }
    };

    return (
        <div className="pending-prizes-overlay">
            <div className="pending-prizes-modal">
                {/* Header */}
                <div className="pending-prizes-header">
                    <h2 className="pending-prizes-title">
                        🎉 ¡Felicitaciones!
                    </h2>
                    <p className="pending-prizes-subtitle">
                        Ganaste mientras estabas ausente
                    </p>
                </div>

                {/* Total Amount */}
                <div className="pending-prizes-total">
                    <div className="total-label">Total Ganado</div>
                    <div className="total-amount">${totalAmount.toFixed(2)}</div>
                    <div className="total-info">
                        {prizes.length} premio{prizes.length > 1 ? 's' : ''}
                    </div>
                </div>

                {/* Prizes List */}
                <div className="pending-prizes-list">
                    {prizes.map((prize, index) => (
                        <div key={prize.id} className={`prize-card prize-${prize.prizeType}`}>
                            <div className="prize-header">
                                <span className="prize-icon">{getPrizeIcon(prize.prizeType)}</span>
                                <span className="prize-type">{getPrizeTitle(prize.prizeType)}</span>
                            </div>

                            <div className="prize-details">
                                <div className="prize-room">{getRoomName(prize.room)}</div>
                                <div className="prize-amount">${prize.prizeAmount.toFixed(2)}</div>
                                {prize.shareCount > 1 && (
                                    <div className="prize-shared">
                                        Compartido con {prize.shareCount} ganador{prize.shareCount > 1 ? 'es' : ''}
                                    </div>
                                )}
                                <div className="prize-ball">
                                    Bolilla ganadora: <strong>{prize.ballNumber}</strong>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="pending-prizes-footer">
                    <p className="balance-info">
                        💰 Los premios ya fueron acreditados a tu balance
                    </p>
                    <button onClick={onClose} className="close-button">
                        Continuar
                    </button>
                </div>
            </div>
        </div>
    );
}
