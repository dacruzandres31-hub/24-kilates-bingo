import React, { useEffect, useState } from 'react';
import '../styles/ModernBallMachine.css';

/**
 * ModernBallMachine Component
 * 
 * Replaces the inline bolillero with a 3D, physics-simulated ball machine.
 * 
 * @param {string} theme - 'bronze' | 'silver' | 'gold' | 'starter'
 * @param {object} currentBall - The ball currently being announced (e.g. { number: 45, color: '#f00' })
 * @param {boolean} isActive - Whether the machine is currently spinning/active
 * @param {number} cardsRemaining - For waiting state, number of cards needed
 * @param {function} onSelectCards - Callback for the waiting state button
 */
const ModernBallMachine = ({
    theme = 'bronze',
    currentBall = null,
    isActive = false,
    cardsRemaining = 0,
    onSelectCards = () => { },
    waitingButtonImage = null // New prop for custom button image
}) => {
    // Helper to get ball color based on theme
    const getThemeBallColor = (theme, number) => {
        if (!number && theme !== 'starter') return '#ccc'; // Fallback for no number

        // Base hues for each theme
        const bronzeColors = ['#cd7f32', '#b87333', '#a0522d', '#8b4513', '#d2691e'];
        const silverColors = ['#c0c0c0', '#d3d3d3', '#a9a9a9', '#808080', '#e0e0e0'];
        const goldColors = ['#ffd700', '#ffcc00', '#e6b800', '#ffdb4d', '#daa520'];
        const starterColors = ['#ff0000', '#ff7700', '#ffdd00', '#00ff00', '#00ddff', '#0077ff', '#7700ff', '#ff00ff', '#ff0099'];

        let palette;
        switch (theme) {
            case 'bronze': palette = bronzeColors; break;
            case 'silver': palette = silverColors; break;
            case 'gold': palette = goldColors; break;
            case 'starter':
            default:
                palette = starterColors;
                // Standard Bingo Colors for Starter/Default
                if (number <= 15) return '#d32f2f';
                if (number <= 30) return '#1976d2';
                if (number <= 45) return '#388e3c';
                if (number <= 60) return '#fbc02d';
                if (number <= 75) return '#7b1fa2';
                return '#455a64';
        }

        // Return a color from the palette based on the number
        return palette[(number - 1) % palette.length];
    };

    const ballColor = currentBall?.color || getThemeBallColor(theme, currentBall?.number);

    return (
        <div className={`modern-machine-container theme-${theme}`}>

            {/* Video Background */}
            <div className={`machine-video-wrapper ${isActive ? 'active' : ''}`}>
                <div className="video-mask">
                    <video
                        className="bolillero-video"
                        autoPlay
                        muted
                        loop
                        playsInline
                    >
                        {/* Video source - using the confirmed working path */}
                        <source src="/assets/bolillero_loop.mp4" type="video/mp4" />
                        {/* Fallback visual if video fails */}
                        <div className="video-fallback"></div>
                    </video>

                    {/* Glass Reflection Overlay */}
                    <div className="glass-overlay"></div>
                </div>

                {/* Waiting State / Card Selection */}
                {/* Visible until GAME STARTS (isActive=true) regardless of having cards or not. 
                    Button is always active if game hasn't started. */}
                {/* Waiting State / Card Selection */}
                {/* Visible until GAME STARTS (isActive=true). Fades out using CSS class. */}
                {/* Waiting State / Card Selection */}
                {/* Visible until GAME STARTS (isActive=true). Fades out using CSS class. */}
                <div
                    className={`current-ball-stage overlay-layer ${isActive ? 'fade-out' : ''}`}
                    style={{ width: '100%', height: '100%', zIndex: 20 }}
                >
                    <div
                        className="waiting-pulse"
                        onClick={(!isActive && cardsRemaining > 0) ? onSelectCards : undefined}
                        style={{
                            cursor: (!isActive && cardsRemaining > 0) ? 'pointer' : 'default',
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative'
                        }}
                    >
                        {waitingButtonImage ? (
                            <>
                                <img
                                    src={waitingButtonImage}
                                    alt="Comprar Cartones"
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'contain',
                                        filter: 'drop-shadow(0 0 15px rgba(255,255,255,0.4))',
                                        transition: 'transform 0.2s ease',
                                        transform: 'scale(1.3)',
                                        opacity: cardsRemaining > 0 ? 1 : 0.8 // Slightly dim if waiting
                                    }}
                                    className={cardsRemaining > 0 ? "hover-scale" : ""}
                                />
                                {/* Overlay Counter / Status */}
                                <div style={{
                                    position: 'absolute',
                                    bottom: '25%',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    backgroundColor: 'rgba(0,0,0,0.2)',
                                    color: '#fff',
                                    padding: '4px 12px',
                                    borderRadius: '12px',
                                    fontSize: '1em',
                                    fontWeight: 'bold',
                                    border: '1px solid rgba(255,255,255,0.5)',
                                    whiteSpace: 'nowrap',
                                    zIndex: 25,
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
                                }}>
                                    {cardsRemaining > 0 ? `${cardsRemaining} DISPONIBLES` : 'ESPERANDO EL SORTEO'}
                                </div>
                            </>
                        ) : (
                            <>
                                {cardsRemaining > 0 ? (
                                    <>
                                        COMPRAR<br />
                                        <span style={{ fontSize: '1.2em' }}>({cardsRemaining} RESTANTES)</span>
                                    </>
                                ) : (
                                    <>
                                        ESPERANDO<br />EL SORTEO
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Active Ball Display (Popped out) */}
                {currentBall && (
                    <div className="current-ball-stage">
                        <div
                            className="main-ball"
                            style={{ '--ball-color': ballColor }}
                        >
                            <span className="ball-number">{currentBall.number}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Machine Base */}
            <div className="machine-base">
                <div className="base-plate"></div>
            </div>

        </div>
    );
};

export default ModernBallMachine;
