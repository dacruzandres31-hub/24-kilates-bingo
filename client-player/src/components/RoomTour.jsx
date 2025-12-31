import React, { useState, useEffect } from 'react';
import { FaChevronRight, FaChevronLeft, FaTimes } from 'react-icons/fa';
import './CustomTour.css'; // Reusamos los estilos del tour principal

const roomTourSteps = [
    {
        target: '#btn-package-no-bonus',
        title: 'Selecciona tu Paquete',
        content: 'Para comenzar la experiencia, selecciona el paquete básico haciendo click en el botón "ELEGIR".',
        position: 'right',
        customWidth: 350
    },
    {
        target: '#card-grid-item-0',
        title: 'Selecciona tus Cartones',
        content: 'Haz clic en un cartón para seleccionarlo. Verás que se marca en verde.',
        position: 'right'
    },
    {
        target: '#btn-refresh-cards',
        title: 'Elige Más Cartones',
        content: 'Si quieres más cartones o no te gustan los actuales, usa este botón para reservar lo que tienes y ver nuevos.',
        position: 'top',
        interactive: false // Paso informativo
    },
    {
        target: '#btn-confirm-selection',
        title: 'Confirma tu Selección',
        content: 'Una vez elijas tus cartones, presiona aquí para confirmar y unirte al juego.',
        position: 'top',
        interactive: true
    },
    {
        target: '.player-cards-section',
        title: '¡Listo para Jugar!',
        content: 'Aquí verás tus cartones activos. ¡Mucha suerte en tu primera partida!',
        position: 'top',
        interactive: false,
        disableScroll: true // No hacer scroll para mantener la vista general
    }
];

const RoomTour = ({ runTour, onTourEnd, currentStepOverride }) => {
    const [stepIndex, setStepIndex] = useState(0);
    const [coords, setCoords] = useState(null);
    const [isVisible, setIsVisible] = useState(false);

    // Permitir controlar el paso desde fuera (para sincronizar con acciones del usuario)
    useEffect(() => {
        if (currentStepOverride !== undefined && currentStepOverride !== null) {
            setStepIndex(currentStepOverride);
        }
    }, [currentStepOverride]);

    useEffect(() => {
        if (runTour) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    }, [runTour]);

    useEffect(() => {
        if (!isVisible) return;

        const updatePosition = () => {
            const step = roomTourSteps[stepIndex];

            // Special handling for 'center' position (no target element needed)
            if (step.position === 'center') {
                setCoords({
                    top: window.innerHeight / 2 - 150,
                    left: window.innerWidth / 2 - 150,
                    width: 0,
                    height: 0,
                    position: 'center'
                });
                return;
            }

            const element = document.querySelector(step.target);

            if (element) {
                const rect = element.getBoundingClientRect();
                let width = rect.width;
                let height = rect.height;
                let top = rect.top;
                let left = rect.left;

                if (step.customWidth) {
                    const diffW = width - step.customWidth;
                    width = step.customWidth;
                    left += diffW / 2;
                }

                setCoords({
                    top,
                    left,
                    width,
                    height,
                    position: step.position
                });
            }
        };

        // Scroll logic (updated)
        // Redujimos a 100ms para mayor reactividad
        // Continuous check to handle dynamic elements (modals, animations)
        const timer = setInterval(updatePosition, 100);

        // First run
        updatePosition();

        // Handle scroll behavior based on step
        const step = roomTourSteps[stepIndex];
        if (step.target !== 'body' && !step.disableScroll) {
            const element = document.querySelector(step.target);
            if (element) {
                // Usar 'auto' para que sea instantáneo
                element.scrollIntoView({ behavior: 'auto', block: 'nearest' });
            }
        }

        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
            clearInterval(timer);
        };
    }, [stepIndex, isVisible]);

    const handleNext = () => {
        // En este tour, el avance suele ser automático por acciones, 
        // pero dejamos el botón por si acaso para pasos informativos
        if (stepIndex < roomTourSteps.length - 1) {
            setStepIndex(prev => prev + 1);
        } else {
            handleClose();
        }
    };

    const handleClose = () => {
        setIsVisible(false);
        // Reset scroll position to top instantly to avoid cut-off UI
        window.scrollTo({ top: 0, behavior: 'auto' });
        if (onTourEnd) onTourEnd();
    };

    if (!isVisible || !coords) return null;

    const currentStep = roomTourSteps[stepIndex];
    const cardWidth = 300;

    // Calculate card position logic similar to CustomTour...
    let topPos = coords.top;
    let leftPos = coords.left;

    if (currentStep.position === 'center') {
        topPos = window.innerHeight / 2 - 100;
        leftPos = window.innerWidth / 2 - 150;
    } else if (currentStep.position === 'right') {
        leftPos = coords.left + coords.width + 20;
        topPos = coords.top;
    } else if (currentStep.position === 'top') {
        topPos = coords.top - 200;
        leftPos = coords.left + (coords.width / 2) - (cardWidth / 2);
    } else {
        // Default bottom
        topPos = coords.top + coords.height + 20;
        leftPos = coords.left + (coords.width / 2) - (cardWidth / 2);
    }

    // Basic viewport check
    if (leftPos + cardWidth > window.innerWidth) leftPos = window.innerWidth - cardWidth - 20;
    if (leftPos < 20) leftPos = 20;

    // Determine if we should show a manual advance button
    // Show if explicit 'interactive: false' OR it's the last step
    const showManualButton = currentStep.interactive === false || stepIndex === roomTourSteps.length - 1;
    const isLastStep = stepIndex === roomTourSteps.length - 1;

    return (
        <div className="custom-tour-overlay" style={{ zIndex: 99999, pointerEvents: 'none' }}>
            {/* Spotlight - allow clicks through */}
            {currentStep.position !== 'center' && (
                <div
                    className="tour-spotlight"
                    style={{
                        top: coords.top,
                        left: coords.left,
                        width: coords.width,
                        height: coords.height,
                        pointerEvents: 'none',
                        boxShadow: '0 0 0 9999px rgba(0,0,0,0.85)',
                        position: 'fixed',
                        backgroundColor: 'transparent', // Ensure no background
                        border: 'none', // Remove any border to prevent "white square" artifact
                        borderRadius: '8px' // Consistent radius
                    }}
                />
            )}

            <div
                className={`tour-card ${currentStep.position}`}
                style={{
                    top: topPos,
                    left: leftPos,
                    position: 'fixed',
                    pointerEvents: 'auto' // Re-enable pointer events for the card itself
                }}
            >
                <div className="tour-header">
                    <h3>{currentStep.title}</h3>
                    {/* Hide close button during critical steps to ensure flow completion? Optional. */}
                    <button onClick={handleClose} className="tour-close"><FaTimes /></button>
                </div>
                <div className="tour-body">
                    <p>{currentStep.content}</p>
                </div>
                <div className="tour-footer">
                    <span className="tour-counter">{stepIndex + 1} / {roomTourSteps.length}</span>

                    {showManualButton && (
                        <div className="tour-actions">
                            <button onClick={handleNext} className="tour-btn primary">
                                {isLastStep ? '¡A Jugar!' : 'Entendido'} <FaChevronRight />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RoomTour;
