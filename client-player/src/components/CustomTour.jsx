import React, { useState, useEffect, useRef } from 'react';
import './CustomTour.css';
import { FaChevronRight, FaChevronLeft, FaTimes } from 'react-icons/fa';

const tourSteps = [
    {
        target: '#lobby-header-logo',
        title: '¡Bienvenido a Casino 24 Kilates!',
        content: 'La experiencia de Bingo Virtual más premium. Déjanos mostrarte el lugar.',
        position: 'bottom'
    },
    {
        target: '#user-main-bar',
        title: 'Tus Recursos',
        content: 'Aquí verás tu nombre, tu saldo disponible en tiempo real y tus cartones (Bronce, Plata, Oro).',
        position: 'bottom'
    },
    {
        target: '#profile-section',
        title: 'Tu Perfil',
        content: 'Configura tu cuenta, cambia tu contraseña y gestiona tus sesiones.',
        position: 'bottom'
    },
    {
        target: '#btn-history',
        title: 'Tu Historial',
        content: 'Consulta tus últimas partidas, jugadas y transacciones importantes.',
        position: 'bottom'
    },
    {
        target: '#btn-support',
        title: 'Soporte Técnico',
        content: '¿Problemas? Contacta con nuestro equipo de soporte 24/7.',
        position: 'bottom'
    },
    {
        target: '#withdraw-btn',
        title: 'Retiros',
        content: 'Solicita el retiro de tus ganancias de forma rápida y segura.',
        position: 'bottom'
    },
    {
        target: '#battlepass-btn',
        title: 'BINGO PASS',
        content: 'Acumula puntos jugando y desbloquea recompensas de nivel en cada temporada.',
        position: 'bottom'
    },
    {
        target: '#wheel-btn',
        title: 'Fortuna',
        content: '¡Gira la rueda gratis cada 4 horas y gana premios increíbles! Mantente atento al brillo dorado.',
        position: 'bottom'
    },
    {
        target: '#rooms-grid',
        title: 'Salas de Juego',
        content: 'Selecciona una sala para jugar. ¡Cada una tiene diferentes premios y costos!',
        position: 'top',
        scrollBlock: 'start' // Custom property
    },
    {
        target: '#leaderboard-widget',
        title: 'Ranking Global',
        content: 'Compite con los mejores jugadores y demuestra que eres el número 1.',
        position: 'top'
    }
];

const CustomTour = ({ runTour, onTourEnd }) => {
    const [stepIndex, setStepIndex] = useState(0);
    const [coords, setCoords] = useState(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (runTour) {
            setStepIndex(0);
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    }, [runTour]);

    useEffect(() => {
        if (!isVisible) return;

        const updatePosition = () => {
            const step = tourSteps[stepIndex];
            const element = document.querySelector(step.target);

            if (element) {
                const rect = element.getBoundingClientRect();
                // Use Viewport Coordinates (no scrollX/Y addition) because overlay is fixed
                setCoords({
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height,
                    position: step.position
                });
            }
        };

        // Scroll into view first
        const step = tourSteps[stepIndex];
        const element = document.querySelector(step.target);
        if (element) {
            // Use custom scrollBlock if defined, otherwise default to center
            element.scrollIntoView({
                behavior: 'smooth',
                block: step.scrollBlock || 'center'
            });
        }

        // Delay to allow scroll to settle
        const timer = setTimeout(updatePosition, 500);

        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true); // Capture scroll

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
            clearTimeout(timer);
        };
    }, [stepIndex, isVisible]);

    const handleNext = () => {
        if (stepIndex < tourSteps.length - 1) {
            setStepIndex(prev => prev + 1);
        } else {
            handleClose();
        }
    };

    const handlePrev = () => {
        if (stepIndex > 0) {
            setStepIndex(prev => prev - 1);
        }
    };

    const handleClose = () => {
        setIsVisible(false);
        if (onTourEnd) onTourEnd();
    };

    if (!isVisible || !coords) return null;

    const currentStep = tourSteps[stepIndex];

    // Calculate clamped position
    const cardWidth = 300;
    const cardHeight = 200; // Approximate
    const safetyMargin = 20;

    // Center card relative to focus element
    let leftPos = coords.left + (coords.width / 2) - (cardWidth / 2);

    // Clamp Left/Right to Viewport
    if (leftPos < safetyMargin) leftPos = safetyMargin;
    if (leftPos + cardWidth > window.innerWidth - safetyMargin) {
        leftPos = window.innerWidth - cardWidth - safetyMargin;
    }

    let topPos;
    if (coords.position === 'bottom') {
        topPos = coords.top + coords.height + 20;
        // Flip if not enough space below
        if (topPos + cardHeight > window.innerHeight) {
            topPos = coords.top - cardHeight - 20;
        }
    } else {
        // Position Top
        topPos = coords.top - 180; // Default height approx
        // Flip if not enough space above
        if (topPos < safetyMargin) {
            topPos = coords.top + coords.height + 20;
        }
    }

    return (
        <div className="custom-tour-overlay">
            {/* Spotlight Effect */}
            <div
                className="tour-spotlight"
                style={{
                    top: coords.top,
                    left: coords.left,
                    width: coords.width,
                    height: coords.height,
                }}
            />

            {/* Content Card */}
            <div
                className={`tour-card ${coords.position}`}
                style={{
                    top: topPos,
                    left: leftPos,
                }}
            >
                <div className="tour-header">
                    <h3>{currentStep.title}</h3>
                    <button onClick={handleClose} className="tour-close"><FaTimes /></button>
                </div>
                <div className="tour-body">
                    <p>{currentStep.content}</p>
                </div>
                <div className="tour-footer">
                    <span className="tour-counter">{stepIndex + 1} / {tourSteps.length}</span>
                    <div className="tour-actions">
                        <button onClick={handlePrev} disabled={stepIndex === 0} className="tour-btn secondary">
                            <FaChevronLeft />
                        </button>
                        <button onClick={handleNext} className="tour-btn primary">
                            {stepIndex === tourSteps.length - 1 ? '¡A Jugar!' : 'Siguiente'}
                            {stepIndex < tourSteps.length - 1 && <FaChevronRight />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomTour;
