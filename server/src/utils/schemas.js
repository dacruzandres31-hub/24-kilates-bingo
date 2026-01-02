const { z } = require('zod');

/**
 * AUTH SCHEMAS
 */
const loginSchema = z.object({
    username: z.string().min(3, 'El nombre de usuario debe tener al menos 3 caracteres').max(30),
    password: z.string().min(4, 'La contraseña debe tener al menos 4 caracteres')
});

const registerSchema = z.object({
    username: z.string().min(3, 'El usuario debe tener al menos 3 caracteres').trim(),
    password: z.string().min(4, 'La contraseña debe tener al menos 4 caracteres'),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    full_name: z.string().optional()
});

/**
 * FINANCE SCHEMAS
 */
const depositRequestSchema = z.object({
    account_id: z.coerce.number().positive('Selecciona una cuenta válida'),
    amount_declared: z.coerce.number().positive('El monto debe ser mayor a 0'),
    // El comprobante suele enviarse como archivo, pero si se envía base64 o similar:
    comprobante_data: z.string().optional()
});

const withdrawalRequestSchema = z.object({
    amount: z.coerce.number().min(500, 'El monto mínimo de retiro es 500'),
    cbu_alias: z.string().min(6, 'CBU o Alias inválido'),
    bank_name: z.string().min(2, 'Especifica el nombre del banco')
});

module.exports = {
    loginSchema,
    registerSchema,
    depositRequestSchema,
    withdrawalRequestSchema
};
