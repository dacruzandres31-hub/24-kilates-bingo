import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './CustomTour.css';
import { FaChevronRight, FaChevronLeft, FaTimes } from 'react-icons/fa';

const tourSteps = [
    {
        target: '#rooms-grid',
        title: '¡Bienvenido a Bingo 24 Kilates!',
        content: 'La experiencia de Bingo Virtual más premium. Aquí puedes elegir entre nuestras 4 salas de juego.',
        position: 'top'
    },
    {
        target: '#user-main-bar',
        title: 'Tus Recursos',
        content: 'Aquí verás tu balance disponible y tus cartones (Bronce, Plata, Oro).',
        position: 'bottom'
    },
    {
        target: '#cartones-dropdown-btn',
        title: 'Mis Cartones',
        content: 'Haz clic aquí para ver el detalle de tus cartones por sala. ¡Ahora con un menú desplegable más claro!',
        position: 'bottom'
    },
    {
        target: '#btn-history',
        title: 'Mi Historial',
        content: 'Consulta tus últimas jugadas, transacciones y detalle de partidas.',
        position: 'bottom'
    },
    {
        target: '#btn-support',
        title: 'Soporte Técnico',
        content: '¿Necesitas ayuda? Contacta con nuestro equipo de soporte disponible 24/7.',
        position: 'bottom'
    },
    {
        target: '#withdraw-btn',
        title: 'Retirar Premios',
        content: 'Solicita el retiro de tus ganancias acumuladas de forma rápida y segura.',
        position: 'bottom'
    },
    {
        target: '#battlepass-btn',
        title: 'BINGO PASS',
        content: 'Completa desafíos semanales para subir de nivel y ganar recompensas exclusivas.',
        position: 'bottom'
    },
    {
        target: '#club-vip-btn',
        title: 'CLUB VIP 24K',
        content: '¡Únete a la élite! Accede a beneficios exclusivos: cartones gratis diarios, bonos de compra, rueda de la fortuna extra y más.',
        position: 'bottom'
    },
    {
        target: '#referrals-btn',
        title: 'Mis Referidos',
        content: 'Invita amigos y gana recompensas por cada referido que se registre y juegue.',
        position: 'bottom'
    },
    {
        target: '#invite-btn',
        title: 'Invitar Amigos',
        content: 'Comparte tu link de invitación y gana bonos cuando tus amigos se unan al juego.',
        position: 'bottom'
    },
    {
        target: '#wheel-btn',
        title: 'Rueda de la Fortuna',
        content: '¡Gira GRATIS cada 24 horas! Atento al brillo dorado para reclamar tus premios.',
        position: 'bottom'
    },
    {
        target: '#btn-purchase',
        title: 'Comprar Créditos',
        content: 'Aquí puedes cargar saldo o comprar paquetes de cartones para asegurar tu participación.',
        position: 'bottom'
    },
    {
        target: '#profile-section',
        title: 'Tu Perfil',
        content: 'Gestiona tu cuenta, cambia tu contraseña y configura tus preferencias.',
        position: 'bottom'
    },
    {
        target: '.winners-ticker',
        title: 'Noticias 24K',
        content: 'Mantente informado con actualizaciones en tiempo real y el ranking de ganadores.',
        position: 'top'
    },
    {
        target: '#btn-room-starter',
        title: '¡Vamos a Jugar!',
        content: 'Entra a la sala Starter. Adentro, te enseñaremos cómo elegir tus primeros cartones.',
        position: 'top',
        scrollBlock: 'center',
        customHeight: 525
    }
];

const CustomTour = ({ runTour, onTourEnd }) => {
    const navigate = useNavigate();
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
                let width = rect.width;
                let height = rect.height;
                let top = rect.top;
                let left = rect.left;

                // Support for custom spotlight dimensions (centered)
                if (step.customWidth) {
                    const diffW = width - step.customWidth;
                    width = step.customWidth;
                    left += diffW / 2;
                }
                if (step.customHeight) {
                    const diffH = height - step.customHeight;
                    height = step.customHeight;
                    top += diffH / 2;
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

        // Scroll into view
        const step = tourSteps[stepIndex];
        const element = document.querySelector(step.target);
        if (element) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: step.scrollBlock || 'center'
            });
        }

        // Update position after scroll settles
        const timer = setTimeout(updatePosition, 400);

        // Only listen to resize, not scroll (scroll was causing infinite loop)
        window.addEventListener('resize', updatePosition);

        return () => {
            window.removeEventListener('resize', updatePosition);
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

        // If finished successfully (last step), redirect to room with tour
        if (stepIndex === tourSteps.length - 1) {
            navigate('/sala/starter?tour=true');
        }
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
    } else if (coords.position === 'top') {
        // Position above the element
        topPos = coords.top - cardHeight - 20;
        // Flip if not enough space above
        if (topPos < safetyMargin) {
            topPos = coords.top + coords.height + 20;
        }
    } else {
        // Default: try top first
        topPos = coords.top - cardHeight - 20;
        if (topPos < safetyMargin) {
            topPos = coords.top + coords.height + 20;
        }
    }

    // Final safety check: ensure card is within viewport
    if (topPos < safetyMargin) topPos = safetyMargin;
    if (topPos + cardHeight > window.innerHeight - safetyMargin) {
        topPos = window.innerHeight - cardHeight - safetyMargin;
    }

    const spotlightStyle = {
        top: coords.top,
        left: coords.left,
        width: coords.width,
        height: coords.height,
    };

    return (
        <div className="custom-tour-overlay">
            {/* Spotlight Effect */}
            <div
                className="tour-spotlight"
                style={spotlightStyle}
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
