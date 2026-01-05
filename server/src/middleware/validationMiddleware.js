const responseHelper = require('../helpers/responseHelper');

/**
 * VALIDATE MIDDLEWARE
 * Wraps a Zod schema to validate req.body, req.query, or req.params
 */
const validate = (schema, target = 'body') => (req, res, next) => {
    try {
        const dataToValidate = req[target];
        console.log('[Validation] Target:', target);
        console.log('[Validation] Input:', dataToValidate);
        console.log('[Validation] req.body:', req.body);
        const validatedData = schema.parse(dataToValidate);
        console.log('[Validation] Success:', JSON.stringify(validatedData));

        // Replace original data with validated/transformed data
        req[target] = validatedData;
        next();
    } catch (error) {
        console.log('[Validation] Error:', error.name, error.message);
        console.log('[Validation] Issues:', JSON.stringify(error.issues));
        if (error.name === 'ZodError') {
            // Zod 4.x uses 'issues', Zod 3.x uses 'errors'
            const zodErrors = error.issues || error.errors || [];
            const errorMessages = zodErrors.map(err => ({
                path: err.path.join('.'),
                message: err.message
            }));

            return responseHelper.error(
                res,
                400,
                'Error de validación',
                errorMessages[0]?.message || 'Datos inválidos',
                errorMessages
            );
        }
        next(error);
    }
};

module.exports = validate;
