/**
 * SoundManager - Gestor de efectos de sonido
 * Usa Web Audio API para reproducir sonidos del juego
 */

class SoundManager {
    constructor() {
        this.enabled = localStorage.getItem('soundEnabled') !== 'false';
        this.volume = parseFloat(localStorage.getItem('soundVolume') || '0.5');
        this.sounds = {};
        this.audioContext = null;

        // Inicializar AudioContext solo cuando se necesite (para evitar warnings del navegador)
        this.initAudioContext = this.initAudioContext.bind(this);
    }

    initAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.audioContext;
    }

    // Generar sonido sintético (no requiere archivos de audio)
    playTone(frequency, duration, type = 'sine') {
        if (!this.enabled) return;

        const ctx = this.initAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = type;

        gainNode.gain.setValueAtTime(this.volume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration);
    }

    // Sonido al marcar número
    playMarkSound() {
        this.playTone(800, 0.1, 'sine');
    }

    // Sonido al completar línea
    playLineSound() {
        const ctx = this.initAudioContext();
        if (!this.enabled || !ctx) return;

        // Secuencia de tonos ascendentes
        const notes = [523, 659, 784]; // Do, Mi, Sol
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playTone(freq, 0.15, 'triangle');
            }, i * 100);
        });
    }

    // Sonido especial para BINGO
    playBingoSound() {
        const ctx = this.initAudioContext();
        if (!this.enabled || !ctx) return;

        // Fanfarria triunfal
        const melody = [
            { freq: 523, duration: 0.2 },  // Do
            { freq: 659, duration: 0.2 },  // Mi
            { freq: 784, duration: 0.2 },  // Sol
            { freq: 1047, duration: 0.4 }  // Do alto
        ];

        melody.forEach((note, i) => {
            setTimeout(() => {
                this.playTone(note.freq, note.duration, 'square');
            }, i * 150);
        });
    }

    // Sonido de notificación
    playNotificationSound() {
        this.playTone(1000, 0.1, 'sine');
        setTimeout(() => {
            this.playTone(1200, 0.1, 'sine');
        }, 100);
    }

    // Sonido de click/botón
    playClickSound() {
        this.playTone(600, 0.05, 'square');
    }

    // Toggle sonido on/off
    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('soundEnabled', this.enabled);
        return this.enabled;
    }

    // Cambiar volumen (0-1)
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        localStorage.setItem('soundVolume', this.volume);
    }

    // Verificar si está habilitado
    isEnabled() {
        return this.enabled;
    }
}

// Singleton instance
const soundManager = new SoundManager();

export default soundManager;
