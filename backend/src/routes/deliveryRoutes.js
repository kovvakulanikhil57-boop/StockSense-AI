const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/deliveryController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { otpLimiter } = require('../middleware/rateLimiter');

// All delivery routes are restricted to DELIVERY_AGENT
router.use(verifyToken, requireRole('DELIVERY_AGENT'));

router.get('/orders', deliveryController.getAgentOrders);
router.post('/orders/:id/accept', deliveryController.acceptOrder);
router.post('/orders/:id/decline', deliveryController.declineOrder);
router.post('/orders/:id/dispatch', deliveryController.markOutForDelivery);
router.post('/orders/:id/verify-otp', otpLimiter, deliveryController.verifyDeliveryOTP);
router.get('/warnings', deliveryController.getAgentWarnings);

module.exports = router;
