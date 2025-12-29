import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaFire, FaTrophy, FaCoins } from 'react-icons/fa';
import './HotPotNotification.css';

const HotPotNotification = ({ alert, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (alert) {
            setIsVisible(true);
            const timer = setTimeout(() => {
                setIsVisible(false);
                if (onClose) setTimeout(onClose, 500); // Wait for animation
            }, 8000); // Show for 8 seconds
            return () => clearTimeout(timer);
        }
    }, [alert, onClose]);

    if (!alert) return null;

    const { room, type, amount } = alert;
    const roomName = room.charAt(0).toUpperCase() + room.slice(1);
    const typeLabel = type === 'pre40' ? 'POZO PRE-40' : 'POZO BINGO';

    // Formatear moneda
    const formatCurrency = (val) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            maximumFractionDigits: 0
        }).format(val);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className={`hot-pot-notification ${room}`}
                    initial={{ x: 400, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 400, opacity: 0 }}
                    transition={{ type: 'spring', damping: 15, stiffness: 100 }}
                >
                    <div className="hot-pot-glow"></div>
                    <div className="hot-pot-content">
                        <div className="hot-pot-icon-container">
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 1, repeat: Infinity }}
                            >
                                <FaFire className="fire-icon" />
                            </motion.div>
                        </div>
                        <div className="hot-pot-text">
                            <h4 className="hot-pot-title">¡POZO CALIENTE!</h4>
                            <p className="hot-pot-subtitle">Sala {roomName}</p>
                            <div className="hot-pot-amount-box">
                                <span className="hot-pot-type">{typeLabel}</span>
                                <span className="hot-pot-amount">{formatCurrency(amount)}</span>
                            </div>
                        </div>
                        <button className="hot-pot-close" onClick={() => setIsVisible(false)}>×</button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default HotPotNotification;
