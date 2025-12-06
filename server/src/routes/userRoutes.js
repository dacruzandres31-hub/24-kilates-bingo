const express = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * USER ROUTES
 * POST   /users                  - Crear usuario (admin)
 * GET    /users/:id              - Obtener usuario
 * GET    /users/:id/network      - Red multinivel del usuario
 * GET    /users                  - Listar todos (admin)
 * PUT    /users/:id              - Actualizar usuario (admin)
 * DELETE /users/:id              - Eliminar usuario (admin)
 */

// Todos requieren autenticación
router.use(authMiddleware);

// Crear usuario
router.post('/', userController.createUser);

// Obtener usuario específico
router.get('/:userId', userController.getUserById);

// Obtener red de usuarios (árbol jerárquico)
router.get('/:userId/network', userController.getUserNetwork);

// Listar todos los usuarios
router.get('/', userController.getAllUsers);

// Actualizar usuario
router.put('/:userId', userController.updateUser);

// Eliminar usuario
router.delete('/:userId', userController.deleteUser);

module.exports = router;
