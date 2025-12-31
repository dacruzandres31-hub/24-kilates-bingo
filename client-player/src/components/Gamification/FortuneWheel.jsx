import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence, animate } from 'framer-motion';
import { FaTimes, FaGift, FaLock } from 'react-icons/fa';
import audioService from '../../services/audioService';
import logo24k from '../../assets/logo.png';
import './FortuneWheel.css';

const FortuneWheel = ({ isOpen, onClose, onPrizeClaimed, onSpinComplete }) => {
    const [canSpin, setCanSpin] = useState(false);
    const [nextSpinTime, setNextSpinTime] = useState(null);
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [prize, setPrize] = useState(null);
    const [timeLeft, setTimeLeft] = useState('');

    // 12 Segments - MATCHING BACKEND CONFIG
    const segments = [
        { label: '$100.000', type: 'cash' },    // 0: Red
        { label: '🎫 BRONCE', type: 'ticket' }, // 1: Bronze
        { label: '🎫 BRONCE', type: 'ticket' }, // 2: Bronze
        { label: '🎫 BRONCE', type: 'ticket' }, // 3: Bronze
        { label: '$50.000', type: 'cash' },     // 4: Orange
        { label: '🎫 PLATA', type: 'ticket' },  // 5: Silver
        { label: '🎫 PLATA', type: 'ticket' },  // 6: Silver
        { label: '🎫 PLATA', type: 'ticket' },  // 7: Silver
        { label: '$5.000', type: 'cash' },      // 8: Gold
        { label: '🎫 ORO', type: 'ticket' },    // 9: Gold
        { label: '🎫 ORO', type: 'ticket' },    // 10: Gold
        { label: '🎫 BRONCE', type: 'ticket' }  // 11: Bronze
    ];

    useEffect(() => {
        console.log("FortuneWheel Loaded - Version: BIG PRIZES + ICONS");
        if (isOpen) {
            checkStatus();
        }
    }, [isOpen]);

    useEffect(() => {
        let interval;
        if (nextSpinTime && !canSpin) {
            interval = setInterval(() => {
                const now = new Date();
                const end = new Date(nextSpinTime);
                const diff = end - now;

                if (diff <= 0) {
                    setCanSpin(true);
                    setNextSpinTime(null);
                    setTimeLeft('');
                    clearInterval(interval);
                } else {
                    const h = Math.floor(diff / (1000 * 60 * 60));
                    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const s = Math.floor((diff % (1000 * 60)) / 1000);
                    setTimeLeft(`${h}h ${m}m ${s}s`);
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [nextSpinTime, canSpin]);

    const checkStatus = async () => {
        try {
            const token = localStorage.getItem('playerToken');
            const response = await axios.get('/api/gamification/wheel/status', {
                headers: { Authorization: `Bearer ${token}` }
            });

            const { canSpin, nextSpinTime } = response.data;
            setCanSpin(canSpin);
            setNextSpinTime(nextSpinTime);
            setPrize(null);
            setRotation(0);

        } catch (error) {
            console.error('Error checking wheel status:', error);
        }
    };

    const spin = async () => {
        if (!canSpin || isSpinning) return;

        try {
            setIsSpinning(true);
            const token = localStorage.getItem('playerToken');

            const response = await axios.post('/api/gamification/wheel/spin', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const { prize } = response.data;
            // Calculate rotation based on index from backend
            const targetIndex = prize.index !== undefined ? prize.index : 0;

            // 12 segments, 30 degrees each (360 / 12)
            const segmentAngle = 360 / 12;

            // Rotation logic:
            // To land item i at top (0 deg/12 o'clock), we rotate (-i * angle).
            // But we want to add many spins.
            const spins = 5;
            const baseRotation = 360 * spins;

            // Calculate target angle to bring index to top
            // NOTE: CSS 0 deg is Top in our setup if segments start at top.
            // Center of segment i is at (i * 30) + 15 deg.
            // To bring that center to 0, we rotate backwards by (i * 30 + 15).
            const segmentCenterOffset = 15;
            const targetRotation = baseRotation + (360 - (targetIndex * 30 + segmentCenterOffset));

            // Animation with Audio Sync
            const fromRotation = rotation % 360;
            const finalRotation = targetRotation + (rotation - (rotation % 360));

            let lastSegmentIndex = -1;

            animate(fromRotation, finalRotation, {
                duration: 7, // Shorter total time
                ease: [0.05, 0, 0.05, 1], // VERY steep deceleration: fast start, long agonizing stop
                onUpdate: (latest) => {
                    setRotation(latest);

                    // Audio Trigger Logic
                    const currentSegmentIndex = Math.floor(latest / 30);

                    if (currentSegmentIndex !== lastSegmentIndex) {
                        audioService.playWheelClick();
                        lastSegmentIndex = currentSegmentIndex;
                    }
                },
                onComplete: () => {
                    setIsSpinning(false);
                    setPrize(prize);
                    setCanSpin(false);
                    const d = new Date();
                    d.setHours(d.getHours() + 24);
                    setNextSpinTime(d.toISOString());

                    if (onPrizeClaimed) onPrizeClaimed(prize);
                    if (onSpinComplete) onSpinComplete();
                    audioService.playBolaCayendo();
                }
            });

        } catch (error) {
            console.error('Spin error:', error);
            setIsSpinning(false);
            alert(error.response?.data?.error || 'Error al girar la rueda');
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="wheel-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div
                    className="wheel-modal"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                >
                    <button className="close-btn" onClick={onClose}><FaTimes /></button>

                    <h2 className="wheel-title">Rueda de la Fortuna</h2>

                    <div className="wheel-container">
                        <div className="pointer"></div>
                        <div className="wheel-shadow"></div>
                        <div
                            className="wheel"
                            style={{
                                transform: `rotate(${rotation}deg)`,
                                // transition removed for JS animation
                            }}
                        >
                            {segments.map((seg, i) => (
                                <div
                                    key={i}
                                    className="segment"
                                    data-type={seg.type}
                                    style={{
                                        '--i': i,
                                        transform: `rotate(${i * 30 - 75}deg)` // -75 deg aligns 3 o'clock to 12:30 (Center of first slice)
                                    }}
                                >
                                    {/* Rotate text back if needed specific reading angle, but default is radial */}
                                    <span className="segment-label">
                                        {seg.label}
                                    </span>
                                </div>
                            ))}

                            {/* Wheel Center - Moved inside to rotate with segments */}
                            <div className={`wheel-center ${(isSpinning || prize) ? 'spinning-glow' : ''}`}>
                                <div className="wheel-center-inner">
                                    <img src={logo24k} alt="24K" className="wheel-center-logo" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Cooldown Overlay - Positioned Relative to Modal (Centered) */}
                    {!prize && !canSpin && (
                        <div className="cooldown-overlay">
                            <FaLock className="cooldown-icon" />
                            <p>Próximo giro habilitado en:</p>
                            <h3>{timeLeft || 'Calculando...'}</h3>

                            <div className="wheel-attributes">
                                <div className="attribute-item">
                                    <span className="attribute-icon">💵</span>
                                    <span>Hasta $100k</span>
                                </div>
                                <div className="attribute-item">
                                    <span className="attribute-icon">🎫</span>
                                    <span>Cartones Gratis</span>
                                </div>
                                <div className="attribute-item">
                                    <span className="attribute-icon">🎁</span>
                                    <span>Premios Sorpresa</span>
                                </div>
                            </div>

                            <button className="back-lobby-btn" onClick={onClose} style={{ marginTop: '10px' }}>
                                VOLVER AL LOBBY
                            </button>
                        </div>
                    )}

                    <div className="wheel-controls">
                        {!prize && canSpin && (
                            <button
                                className="spin-btn glow-effect"
                                onClick={spin}
                                disabled={isSpinning}
                            >
                                {isSpinning ? '¡SUERTE!' : '¡GIRAR GRATIS!'}
                            </button>
                        )}

                        {prize && (
                            <motion.div
                                className="prize-reveal"
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                            >
                                <h3>¡FELICIDADES!</h3>
                                <div className="prize-content">
                                    <FaGift className="gift-icon" />
                                    <span>
                                        {prize.type === 'ticket'
                                            ? `Ganaste 1 Ticket para Sala ${prize.room.charAt(0).toUpperCase() + prize.room.slice(1)}`
                                            : `Ganaste ${prize.label}`
                                        }
                                    </span>
                                </div>
                                <button className="back-lobby-btn" onClick={onClose}>
                                    VOLVER AL LOBBY
                                </button>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence >
    );
};

export default FortuneWheel;
