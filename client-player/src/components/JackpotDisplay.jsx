import React from 'react';
import { FaTrophy, FaStar, FaBolt } from 'react-icons/fa';
import '../styles/JackpotDisplay.css';

const JackpotDisplay = ({ pots }) => {
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <div className="jackpot-display-container">
            {/* Pozo Acumulado (Pre-40) - El más grande */}
            <div className="jackpot-item accumulated">
                <div className="jackpot-icon-wrapper">
                    <FaStar className="jackpot-icon" />
                </div>
                <div className="jackpot-info">
                    <span className="jackpot-label">POZO PRE-40</span>
                    <span className="jackpot-amount">{formatCurrency(pots.pre40 || 0)}</span>
                </div>
            </div>

            {/* Pozo Bingo */}
            <div className="jackpot-item bingo">
                <div className="jackpot-icon-wrapper">
                    <FaTrophy className="jackpot-icon" />
                </div>
                <div className="jackpot-info">
                    <span className="jackpot-label">POZO BINGO</span>
                    <span className="jackpot-amount">{formatCurrency(pots.bingo || 0)}</span>
                </div>
            </div>

            {/* Pozo Línea */}
            <div className="jackpot-item linea">
                <div className="jackpot-icon-wrapper">
                    <FaBolt className="jackpot-icon" />
                </div>
                <div className="jackpot-info">
                    <span className="jackpot-label">POZO LÍNEA</span>
                    <span className="jackpot-amount">{formatCurrency(pots.linea || 0)}</span>
                </div>
            </div>
        </div>
    );
};

export default JackpotDisplay;
