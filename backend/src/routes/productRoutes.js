const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { verifyToken } = require('../middleware/authMiddleware');

// Public or optionally authenticated (if student token present, auto-filters by student branch)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return verifyToken(req, res, next);
  }
  next();
};

router.get('/', optionalAuth, productController.getProducts);
router.get('/categories', productController.getCategories);
router.get('/branches', productController.getBranches);
router.get('/:id', optionalAuth, productController.getProductById);

module.exports = router;
