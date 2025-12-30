import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import soundManager from '../utils/soundManager';
import '../styles/SoundToggle.css';

/**
 * SoundToggle - Control de sonido flotante
 */
export default function SoundToggle() {
    const [isEnabled, setIsEnabled] = useState(soundManager.isEnabled());

    const handleToggle = () => {
        const newState = soundManager.toggle();
        setIsEnabled(newState);

        // Reproducir sonido de confirmación si se activa
        if (newState) {
            soundManager.playClickSound();
        }
    };

    return (
        <button
            onClick={handleToggle}
            className="sound-toggle-btn"
            title={isEnabled ? 'Silenciar sonidos' : 'Activar sonidos'}
        >
            {isEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
        </button>
    );
}
