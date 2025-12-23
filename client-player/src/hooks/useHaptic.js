import { useCallback } from 'react';

/**
 * Hook para feedback háptico (Vibración)
 * IMPORTANTE: Solo funciona en dispositivos móviles y si el usuario interactuó primero con la página.
 */
export const useHaptic = () => {
    const trigger = useCallback((type = 'light') => {
        // Verificar soporte
        if (typeof navigator === 'undefined' || !navigator.vibrate) return;

        try {
            switch (type) {
                case 'light': // Bolilla sorteada
                    navigator.vibrate(10);
                    break;
                case 'medium': // Match en cartón
                    navigator.vibrate(40);
                    break;
                case 'heavy': // Alerta crítica
                    navigator.vibrate(80);
                    break;
                case 'success': // Línea completada
                    navigator.vibrate([50, 30, 50]);
                    break;
                case 'failure': // Error / Desconexión
                    navigator.vibrate([100, 50, 50]);
                    break;
                case 'celebrate': // BINGO!
                    navigator.vibrate([100, 50, 100, 50, 200, 50, 200]);
                    break;
                default:
                    navigator.vibrate(20);
            }
        } catch (e) {
            console.warn('Haptic feedback error:', e);
        }
    }, []);

    return { trigger };
};
