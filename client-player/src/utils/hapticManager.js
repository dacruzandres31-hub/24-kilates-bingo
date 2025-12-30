/**
 * HapticManager - Gestor de vibración (Haptic Feedback)
 * Proporciona feedback táctil en dispositivos móviles
 */

class HapticManager {
    constructor() {
        this.enabled = localStorage.getItem('hapticsEnabled') !== 'false';
    }

    /**
     * Hace vibrar el dispositivo con un patrón específico
     * @param {number|number[]} pattern - Patrón de vibración en ms
     */
    vibrate(pattern) {
        if (!this.enabled || !('vibrate' in navigator)) return;

        try {
            navigator.vibrate(pattern);
        } catch (e) {
            console.warn('Haptic feedback not supported or blocked:', e);
        }
    }

    // Vibración corta al marcar número
    vibrateMark() {
        this.vibrate(30);
    }

    // Vibración doble al completar línea
    vibrateLine() {
        this.vibrate([100, 50, 100]);
    }

    // Vibración fuerte y rítmica al cantar BINGO
    vibrateBingo() {
        this.vibrate([200, 100, 200, 100, 500, 100, 200]);
    }

    // Vibración suave de notificación
    vibrateNotification() {
        this.vibrate(50);
    }

    // Toggle habilitar/deshabilitar
    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('hapticsEnabled', this.enabled);
        return this.enabled;
    }

    isEnabled() {
        return this.enabled;
    }
}

const hapticManager = new HapticManager();
export default hapticManager;
