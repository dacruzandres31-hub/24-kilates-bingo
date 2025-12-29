/**
 * Helper para validación de datos
 */
const validationHelper = {
    /**
     * Valida que un objeto contenga los campos requeridos.
     * @param {Object} body - Objeto a validar (ej: req.body)
     * @param {Array<string>} requiredFields - Lista de nombres de campos obligatorios
     * @returns {string|null} Retorna el nombre del campo faltante o null si todo ok.
     */
    checkRequired: (body, requiredFields) => {
        for (const field of requiredFields) {
            if (body[field] === undefined || body[field] === null || body[field] === '') {
                return field;
            }
        }
        return null;
    },

    /**
     * Valida formato de email.
     * @param {string} email 
     * @returns {boolean}
     */
    isValidEmail: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    /**
     * Sanitiza el nombre de usuario (solo alfanuméricos y guiones bajos).
     * @param {string} username 
     * @returns {string} Username limpio
     */
    sanitizeUsername: (username) => {
        return username.replace(/[^a-zA-Z0-9_]/g, '');
    },

    /**
     * Middleware para validar campos requeridos en una ruta.
     * @param {Array<string>} fields 
     */
    requireFieldsMiddleware: (fields) => {
        return (req, res, next) => {
            const missing = validationHelper.checkRequired(req.body, fields);
            if (missing) {
                return res.status(400).json({
                    success: false,
                    error: `Missing required field: ${missing}`
                });
            }
            next();
        };
    }
};

module.exports = validationHelper;
