import React, { memo } from 'react';
import { FixedSizeList as List } from 'react-window';

/**
 * VirtualizedCardList - Lista virtualizada de cartones de bingo
 * Solo renderiza los cartones visibles en el viewport
 * 
 * @param {Array} cards - Array de cartones
 * @param {number} cardHeight - Altura de cada cartón en px
 * @param {number} containerHeight - Altura del contenedor en px
 * @param {Function} renderCard - Función para renderizar cada cartón
 */
function VirtualizedCardList({
    cards,
    cardHeight = 400,
    containerHeight = 600,
    renderCard
}) {
    // Si hay pocos cartones (<10), no usar virtualización
    if (cards.length < 10) {
        return (
            <div className="cards-list-normal">
                {cards.map((card, index) => renderCard({ data: card, index, style: {} }))}
            </div>
        );
    }

    // Renderizar item individual
    const Row = ({ index, style }) => {
        const card = cards[index];
        return renderCard({ data: card, index, style });
    };

    return (
        <List
            height={containerHeight}
            itemCount={cards.length}
            itemSize={cardHeight}
            width="100%"
            className="virtualized-cards-list"
        >
            {Row}
        </List>
    );
}

export default memo(VirtualizedCardList);
