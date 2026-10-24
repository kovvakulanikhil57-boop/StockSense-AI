const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

// Public endpoints with rate limiting
router.post('/register', authLimiter, authController.registerStudent);
router.post('/login', authLimiter, authController.login);
router.post('/agent/login', authLimiter, authController.agentLogin);

// Protected endpoints
router.get('/profile', verifyToken, authController.getProfile);
router.put('/profile', verifyToken, authController.updateProfile);
router.post('/change-password', verifyToken, authController.changePassword);

module.exports = router;
