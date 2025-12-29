/**
 * UIHelper - Utilidades de formato y presentación para el Frontend.
 */

const uiHelper = {
    /**
     * Formatea un número como moneda (Peso Colombiano / Genérico)
     * Ej: 1500 -> "$ 1.500"
     */
    formatCurrency: (value) => {
        if (value === undefined || value === null) return '$ 0';
        const number = parseFloat(value);
        if (isNaN(number)) return '$ 0';

        // Formato sin decimales por defecto para COP, o con 2 si se desea
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(number);
    },

    /**
     * Formatea un número con decimales si es necesario (para saldos precisos)
     */
    formatCurrencyPrecise: (value) => {
        if (value === undefined || value === null) return '$ 0,00';
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 2
        }).format(value);
    },

    /**
     * Formatea moneda mostrando decimales solo si son necesarios (max 2)
     */
    formatCurrencyFlexible: (value) => {
        if (value === undefined || value === null) return '$ 0';
        const number = parseFloat(value);
        if (isNaN(number)) return '$ 0';

        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(number);
    },

    /**
     * Formatea fecha corta
     */
    formatDate: (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    /**
     * Formatea fecha y hora
     */
    formatDateTime: (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('es-CO', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    /**
     * Trunca texto con elipsis
     */
    truncate: (str, maxLength = 20) => {
        if (!str) return '';
        if (str.length <= maxLength) return str;
        return str.substring(0, maxLength) + '...';
    },

    /**
     * Genera iniciales para avatar
     */
    getInitials: (name) => {
        if (!name) return '??';
        const parts = name.trim().split(' ');
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[1][0]).toUpperCase();
    },

    /**
     * Copiar al portapapeles
     */
    copyToClipboard: async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error('Error copiando:', err);
            return false;
        }
    }
};

export default uiHelper;
