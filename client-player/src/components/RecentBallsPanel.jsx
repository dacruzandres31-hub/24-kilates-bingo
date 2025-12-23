import React from 'react';
import '../styles/ModernBallMachine.css';

/**
 * RecentBallsPanel Component
 * Displays the last drawn balls using the EXACT SAME VISUAL STYLE
 * as the main machine ball, but scaled down.
 */
const RecentBallsPanel = ({ balls, label = "ÚLTIMAS" }) => {

    // Copy of the standard color logic from ModernBallMachine.jsx
    // in case 'ball.color' is missing.
    const getStandardBallColor = (number) => {
        const n = parseInt(number);
        if (isNaN(n)) return '#FFD700';
        if (n <= 10) return '#ff0000'; // Rojo
        if (n <= 20) return '#ff7700'; // Naranja
        if (n <= 30) return '#ffdd00'; // Amarillo
        if (n <= 40) return '#00ff00'; // Verde
        if (n <= 50) return '#00ddff'; // Cian
        if (n <= 60) return '#0077ff'; // Azul
        if (n <= 70) return '#7700ff'; // Púrpura
        if (n <= 80) return '#ff00ff'; // Magenta
        return '#ff0099'; // Rosa (81-90)
    };

    // Take last 5 balls and reverse them (Newest first)
    const recentBalls = balls.slice(-5).reverse();

    if (recentBalls.length === 0) return null;

    return (
        <div className="recent-balls-panel-container" style={{
            marginTop: '15px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '10px',
            padding: '10px 20px',
            width: '100%',
        }}>
            <span className="recent-label" style={{
                fontSize: '1rem',
                marginRight: '15px',
                color: '#fff',
                fontWeight: 'bold',
                letterSpacing: '1px'
            }}>{label}</span>

            <div className="recent-balls-row" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
            }}>
                {recentBalls.map((ball, index) => {
                    const finalColor = ball.color || getStandardBallColor(ball.number);
                    return (
                        // Wrapper to handle the scaling layout space
                        <div
                            key={`${ball.number}-${index}`}
                            style={{
                                width: '60px',
                                height: '60px',
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            {/* 
                                The Main Ball Clone. 
                                Scale 0.4 transforms 150px -> 60px.
                                We use the EXACT same class 'main-ball' to inherit all 3D styles.
                            */}
                            <div
                                className="main-ball"
                                style={{
                                    '--ball-color': finalColor,
                                    transform: 'scale(0.4)',
                                    transformOrigin: 'center center',
                                    position: 'absolute',
                                    margin: 0,
                                    // Override animation to avoid popping during list updates if undesired,
                                    // or keep it for effect. (Keeping it simple for now)
                                    animation: 'none'
                                }}
                            >
                                <span className="ball-number">{ball.number}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default RecentBallsPanel;
