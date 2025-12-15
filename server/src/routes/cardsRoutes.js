const express = require('express');
const cardsController = require('../controllers/cardsController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * CARD POOL ROUTES
 * Gestión del pool de cartones pre-generados
 */

// Todas las rutas requieren autenticación
router.use(authMiddleware.authenticateToken);

// Obtener cartones disponibles para seleccionar
router.get('/available/:room', cardsController.getAvailableCards);

// Seleccionar cartones del pool
router.post('/select', cardsController.selectCards);

// Obtener mis cartones seleccionados
router.get('/my-selected/:room', cardsController.getMySelectedCards);

// Liberar cartones no usados
router.post('/release', cardsController.releaseCards);

module.exports = router;
