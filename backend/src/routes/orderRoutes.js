const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken, requireRole, requireVerified } = require('../middleware/authMiddleware');

// Student endpoints
router.post('/checkout', verifyToken, requireRole('STUDENT'), requireVerified, orderController.checkout);
router.get('/my-orders', verifyToken, requireRole('STUDENT'), orderController.getMyOrders);

// Shared endpoints (Student, Agent, Admin with authorization logic inside controller)
router.get('/:id', verifyToken, orderController.getOrderDetails);
router.post('/:id/cancel', verifyToken, orderController.cancelOrder);

// Admin-only endpoints
router.get('/', verifyToken, requireRole('ADMIN'), orderController.getAllOrders);

module.exports = router;
