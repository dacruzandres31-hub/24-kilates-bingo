/**
 * INVENTORY ROUTES
 * Endpoints para gestionar cosméticos
 */

const express = require('express');
const inventoryController = require('../controllers/inventoryController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware.authenticateToken);

// GET - Obtener inventario
router.get('/', inventoryController.getInventory);

// GET - Obtener ítems equipados
router.get('/equipped', inventoryController.getEquippedItems);

// GET - Catálogo de ítems disponibles
router.get('/available', inventoryController.getAvailableItems);

// POST - Equipar ítem
router.post('/equip/:itemId', inventoryController.equipItem);

// POST - Desequipar ítem
router.post('/unequip/:itemId', inventoryController.unequipItem);

module.exports = router;
