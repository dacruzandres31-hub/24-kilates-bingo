import React from 'react';
import { FaTimes } from 'react-icons/fa';
import '../styles/CardDetailModal.css';

/**
 * Modal para mostrar un cartón de bingo en tamaño grande con colores de sala
 */
const CardDetailModal = ({ card, room, onClose }) => {
  if (!card) return null;

  // Mapear nombres de sala
  const roomMap = {
    'bronze': 'bronce',
    'silver': 'plata', 
    'gold': 'oro',
    'starter': 'starter'
  };
  
  const mappedRoom = roomMap[room] || room;
  
  // Colores por sala
  const roomColors = {
    starter: {
      primary: '#00BCD4',
      light: '#B2EBF2',
      dark: '#00838F',
      border: '#00ACC1',
      text: '#004D40',
      name: 'SALA STARTER'
    },
    bronce: {
      primary: '#CD7F32',
      light: '#FFE0B2',
      dark: '#8D5524',
      border: '#BF6E2C',
      text: '#4E2A0F',
      name: 'SALA BRONCE'
    },
    plata: {
      primary: '#C0C0C0',
      light: '#F5F5F5',
      dark: '#808080',
      border: '#A9A9A9',
      text: '#424242',
      name: 'SALA PLATA'
    },
    oro: {
      primary: '#FFD700',
      light: '#FFF9C4',
      dark: '#F57F17',
      border: '#FBC02D',
      text: '#795548',
      name: 'SALA ORO'
    }
  };

  const colors = roomColors[mappedRoom] || roomColors.starter;

  return (
    <div className="card-detail-overlay" onClick={onClose}>
      <div className="card-detail-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>
          <FaTimes />
        </button>
        
        <div 
          className="modal-card-container"
          style={{
            border: `4px solid ${colors.border}`,
            boxShadow: `0 0 30px ${colors.primary}`
          }}
        >
          {/* Header con nombre de sala */}
          <div 
            className="modal-card-header"
            style={{ 
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.dark})`,
              color: 'white'
            }}
          >
            <div className="sala-name">{colors.name}</div>
            <div className="card-serial">{card.card_serial}</div>
          </div>
          
          {/* Grid del cartón */}
          <div className="modal-card-grid">
            {card.numbers.map((row, rowIdx) => (
              <div key={rowIdx} className="modal-card-row">
                {row.map((num, colIdx) => (
                  <div
                    key={colIdx}
                    className={`modal-card-cell ${num === null ? 'empty' : 'filled'}`}
                    style={{
                      backgroundColor: num === null ? colors.dark : colors.light,
                      color: num === null ? 'transparent' : colors.text,
                      borderColor: colors.border
                    }}
                  >
                    {num !== null && <span className="modal-cell-number">{num}</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
          
          {/* Footer */}
          <div 
            className="modal-card-footer"
            style={{ 
              background: `linear-gradient(135deg, ${colors.dark}, ${colors.primary})`,
              color: 'white'
            }}
          >
            BINGO 24K
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardDetailModal;
