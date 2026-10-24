const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { verifyToken, requireRole, requireVerified } = require('../middleware/authMiddleware');

// All cart endpoints are strictly isolated to authenticated verified students
router.use(verifyToken, requireRole('STUDENT'), requireVerified);

router.get('/', cartController.getCart);
router.post('/items', cartController.addItem);
router.put('/items/:productId', cartController.updateItemQuantity);
router.delete('/items/:productId', cartController.removeItem);
router.delete('/', cartController.clearCart);

module.exports = router;
