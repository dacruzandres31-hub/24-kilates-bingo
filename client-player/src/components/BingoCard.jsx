import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { analyzeCardProbability } from '../utils/probabilityUtils';
import '../styles/BingoCard.css';

/**
 * BingoCard - Cartón de Bingo 90 con soporte para skins cosméticos
 * Props:
 *   - gridNumbers: Array 3x9 de números (incluye nulls para espacios vacíos)
 *   - cardNumber: Número serie del cartón
 *   - isSelected: Si está seleccionado
 *   - onSelect: Callback al seleccionar
 *   - equippedSkin: Objeto con asset_url, color_hex, animation_class
 */

const BingoCard = forwardRef((props, ref) => {
  const {
    gridNumbers,
    cardNumber,
    isSelected,
    onSelect,
    equippedSkin,
    missingNumbers = [],
    markedNumbers: propMarkedNumbers
  } = props;

  const [internalMarkedNumbers, setInternalMarkedNumbers] = useState(new Set());

  // Usar marcado de props si existe, sino el interno
  const currentMarkedNumbers = propMarkedNumbers || internalMarkedNumbers;

  // Método público para marcar números
  useImperativeHandle(ref, () => ({
    markNumber: (number) => {
      if (propMarkedNumbers) {
        console.warn('BingoCard: Usando markedNumbers reactivo desde props, ignore markNumber interno');
      }
      setInternalMarkedNumbers(prev => new Set(prev).add(number));
    },
    getMarkedNumbers: () => currentMarkedNumbers,
    gridNumbers: gridNumbers
  }));

  // Determinar si hay ganancia (línea o bingo)
  const checkWin = () => {
    if (!gridNumbers || gridNumbers.length === 0) return null;

    const rows = gridNumbers.length;
    const cols = gridNumbers[0].length;

    // Convertir a array plano para validación (solo números, no nulls)
    // Check BINGO: todos los números marcados
    let totalMarked = 0;
    gridNumbers.flat().forEach(n => {
      if (n !== null && n !== 0) {
        if (n === 'FREE' || currentMarkedNumbers.has(n)) {
          totalMarked++;
        }
      }
    });

    if (totalMarked === gridNumbers.flat().filter(n => n !== null && n !== 0).length) {
      return 'bingo';
    }

    // Check LÍNEA horizontal
    for (let row = 0; row < rows; row++) {
      let lineMarked = 0;
      let lineTotal = 0;

      for (let col = 0; col < cols; col++) {
        const num = gridNumbers[row][col];

        if (num !== null && num !== 0) {
          lineTotal++;
          if (num === 'FREE' || currentMarkedNumbers.has(num)) {
            lineMarked++;
          }
        }
      }

      if (lineMarked === lineTotal && lineTotal > 0) {
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

  // Propriedades de skin
  const skinClass = equippedSkin ? equippedSkin.animation_class : '';

  // Análisis de probabilidad
  const probability = analyzeCardProbability(gridNumbers, currentMarkedNumbers);

  return (
    <div
      className={`bingo-card bingo-card-90 ${isSelected ? 'selected' : ''} ${isBingo ? 'bingo' : ''} ${isLinea ? 'linea' : ''} ${skinClass}`}
      style={cardStyles}
      onClick={() => onSelect && onSelect(gridNumbers)}
    >
      {/* Etiqueta de ganancia */}
      {isBingo && <div className="win-badge bingo-badge">🎉 ¡BINGO!</div>}
      {isLinea && <div className="win-badge linea-badge">⭐ LÍNEA</div>}

      {/* Probability Badge */}
      {!isBingo && probability && (
        <div
          className="probability-badge"
          style={{ backgroundColor: probability.line.color }}
        >
          {probability.line.icon} {probability.line.label} ({probability.line.percentage}%)
        </div>
      )}

      {/* Número de serie */}
      <div className="card-number">#{cardNumber}</div>

      {/* Grilla dinámica */}
      <div className={`card-grid ${gridNumbers.length === 5 ? 'card-grid-75' : 'card-grid-90'}`}>
        {gridNumbers.map((row, rowIdx) => (
          <div key={`row-${rowIdx}`} className="card-row">
            {row.map((number, colIdx) => {
              const isFree = number === 'FREE' || (gridNumbers.length === 5 && rowIdx === 2 && colIdx === 2);
              const isMarked = isFree || (number !== null && number !== 0 && currentMarkedNumbers.has(number));
              const isEmpty = !isFree && (number === null || number === undefined || number === 0);
              const isMissing = !isEmpty && !isMarked && missingNumbers.includes(number);

              return (
                <div
                  key={`${rowIdx}-${colIdx}`}
                  className={`cell ${isMarked ? 'marked' : ''} ${isEmpty ? 'empty' : ''} ${isMissing ? 'missing-for-win' : ''} ${isFree ? 'free' : ''}`}
                >
                  {isFree ? '★' : (isEmpty ? '' : number)}
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
