import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import '../styles/BingoCard.css';

/**
 * BingoCard - Cartón de Bingo con soporte para skins cosméticos
 * Props:
 *   - gridNumbers: Array 5x5 de números
 *   - cardNumber: Número serie del cartón
 *   - isSelected: Si está seleccionado
 *   - onSelect: Callback al seleccionar
 *   - equippedSkin: Objeto con asset_url, color_hex, animation_class
 */

const BingoCard = forwardRef((props, ref) => {
  const { gridNumbers, cardNumber, isSelected, onSelect, equippedSkin } = props;
  
  const [markedNumbers, setMarkedNumbers] = useState(new Set());

  // Método público para marcar números
  useImperativeHandle(ref, () => ({
    markNumber: (number) => {
      setMarkedNumbers(prev => new Set(prev).add(number));
    },
    getMarkedNumbers: () => markedNumbers,
    gridNumbers: gridNumbers
  }));

  // Determinar si hay ganancia (línea o bingo)
  const checkWin = () => {
    if (!gridNumbers || gridNumbers.length === 0) return null;

    // Convertir a array plano para validación
    const allNumbers = gridNumbers.flat();
    
    // Check BINGO (todas menos la celda FREE)
    const totalMarked = Array.from(markedNumbers).filter(n => 
      n !== 0 && allNumbers.includes(n)
    ).length;
    
    if (totalMarked === 24) { // 25 - 1 (FREE) = 24
      return 'bingo';
    }

    // Check LÍNEA horizontal (5 números)
    for (let row = 0; row < 5; row++) {
      let lineMarked = 0;
      for (let col = 0; col < 5; col++) {
        const num = gridNumbers[col][row];
        if (num === 0 || markedNumbers.has(num)) {
          lineMarked++;
        }
      }
      if (lineMarked === 5) {
        return 'linea';
      }
    }

    return null;
  };

  const winStatus = checkWin();
  const isBingo = winStatus === 'bingo';
  const isLinea = winStatus === 'linea';

  // Estilos dinámicos basados en skin
  const cardStyles = equippedSkin ? {
    '--card-primary-color': equippedSkin.color_hex || '#22D3EE',
    '--card-animation-class': equippedSkin.animation_class || 'none'
  } : {};

  // Clase dinámica del skin
  const skinClass = equippedSkin ? equippedSkin.animation_class : '';

  return (
    <div
      className={`bingo-card ${isSelected ? 'selected' : ''} ${isBingo ? 'bingo' : ''} ${isLinea ? 'linea' : ''} ${skinClass}`}
      style={cardStyles}
      onClick={() => onSelect && onSelect(gridNumbers)}
    >
      {/* Etiqueta de ganancia */}
      {isBingo && <div className="win-badge bingo-badge">🎉 ¡BINGO!</div>}
      {isLinea && <div className="win-badge linea-badge">⭐ LÍNEA</div>}

      {/* Número de serie */}
      <div className="card-number">#{cardNumber}</div>

      {/* Grilla */}
      <div className="card-grid">
        {gridNumbers.map((col, colIdx) => (
          <div key={`col-${colIdx}`} className="column">
            {col.map((number, rowIdx) => {
              const isMarked = markedNumbers.has(number);
              const isFree = number === 0;
              
              return (
                <div
                  key={`${colIdx}-${rowIdx}`}
                  className={`cell ${isMarked ? 'marked' : ''} ${isFree ? 'free' : ''}`}
                >
                  {isFree ? '★' : number}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Indicador equipado */}
      {equippedSkin && (
        <div className="skin-indicator" title={equippedSkin.name}>
          ✨ {equippedSkin.name.substring(0, 8)}...
        </div>
      )}
    </div>
  );
});

BingoCard.displayName = 'BingoCard';

export default BingoCard;
