const responseHelper = require('../helpers/responseHelper');

/**
 * VALIDATE MIDDLEWARE
 * Wraps a Zod schema to validate req.body, req.query, or req.params
 */
const validate = (schema, target = 'body') => (req, res, next) => {
    try {
        const dataToValidate = req[target];
        const validatedData = schema.parse(dataToValidate);

        // Replace original data with validated/transformed data
        req[target] = validatedData;
        next();
    } catch (error) {
        if (error.name === 'ZodError') {
            const errorMessages = error.errors.map(err => ({
                path: err.path.join('.'),
                message: err.message
            }));

            return responseHelper.error(
                res,
                400,
                'Error de validación',
                errorMessages[0].message, // Send the first error as main message
                errorMessages
            );
        }
        next(error);
    }
};

module.exports = validate;
