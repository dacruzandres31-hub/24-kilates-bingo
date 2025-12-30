import React, { useMemo } from 'react';
import '../styles/Animations.css';

/**
 * ProgressBar - Barra de progreso animada para cartones
 * Muestra el porcentaje de completitud con colores dinámicos
 * Optimizado con React.memo para evitar re-renders innecesarios
 * 
 * @param {number} progress - Porcentaje de progreso (0-100)
 * @param {boolean} showPercentage - Mostrar número de porcentaje
 * @param {boolean} shimmer - Activar efecto shimmer
 */
function ProgressBar({ progress = 0, showPercentage = true, shimmer = false }) {
    // Memoizar clase de progreso para evitar recalcular
    const progressClass = useMemo(() => {
        if (progress >= 90) return 'progress-near-complete';
        if (progress >= 60) return 'progress-high';
        if (progress >= 30) return 'progress-medium';
        return 'progress-low';
    }, [progress]);

    const shimmerClass = shimmer ? 'shimmer-effect' : '';

    // Memoizar estilos inline
    const barStyle = useMemo(() => ({
        '--progress-width': `${progress}%`,
        width: `${progress}%`
    }), [progress]);

    return (
        <div className="progress-bar-wrapper">
            <div className="progress-bar-container">
                <div
                    className={`progress-bar-fill ${progressClass} ${shimmerClass}`}
                    style={barStyle}
                />
            </div>
            {showPercentage && (
                <span className="progress-percentage">{Math.round(progress)}%</span>
            )}
        </div>
    );
}

// Exportar con React.memo para evitar re-renders cuando props no cambian
export default React.memo(ProgressBar);

