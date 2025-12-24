import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './StreakModal.css';

const StreakModal = ({ streak = 1, onClose }) => {
    const days = [1, 2, 3, 4, 5, 6, 7];

    return (
        <AnimatePresence>
            <motion.div
                className="streak-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div
                    className="streak-content"
                    initial={{ y: 50, scale: 0.9 }}
                    animate={{ y: 0, scale: 1 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                >
                    <div className="streak-header">
                        <h2>¡Racha Diaria!</h2>
                        <p>Conéctate cada día para ganar premios</p>
                    </div>

                    <div className="streak-days-container">
                        {days.map((day) => {
                            const isActive = day <= streak;
                            const isToday = day === streak;

                            return (
                                <div key={day} className={`streak-day-card ${isActive ? 'active' : ''} ${isToday ? 'today' : ''}`}>
                                    <div className="day-label">Día {day}</div>
                                    <div className="day-icon">
                                        {day === 7 ? '🎁' : (isActive ? '✅' : '🔒')}
                                    </div>
                                    {isToday && <div className="pulse-ring"></div>}
                                </div>
                            );
                        })}
                    </div>

                    <div className="streak-footer">
                        <button className="claim-btn" onClick={onClose}>
                            {streak === 7 ? '¡GIRAR RULETA!' : 'CONTINUAR'}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default StreakModal;
