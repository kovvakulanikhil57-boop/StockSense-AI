const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// All admin routes restricted to ADMIN role
router.use(verifyToken, requireRole('ADMIN'));

router.get('/metrics', adminController.getDashboardMetrics);

// Product & Category Management
router.post('/products', adminController.createProduct);
router.put('/products/:id', adminController.updateProduct);
router.put('/products/:id/toggle-status', adminController.toggleProductStatus);

// Suppliers & Purchases (Stock Inflow)
router.get('/suppliers', adminController.getSuppliers);
router.post('/suppliers', adminController.createSupplier);
router.post('/purchases', adminController.recordPurchase);

// Deliveries, Reassignments, & Warnings
router.get('/delayed-deliveries', adminController.getDelayedDeliveries);
router.post('/orders/:id/reassign', adminController.reassignOrder);
router.post('/warnings', adminController.issueAgentWarning);
router.put('/warnings/:id/resolve', adminController.resolveAgentWarning);

// Users Management
router.get('/users', adminController.getUsers);
router.put('/users/:id/verify', adminController.verifyUser);
router.post('/create-admin', adminController.createAdminUser);

// Delivery Agent Management
router.get('/agents', adminController.getDeliveryAgents);
router.post('/agents', adminController.createDeliveryAgent);
router.put('/agents/:id/toggle-status', adminController.toggleDeliveryAgentStatus);

// Audit Log
router.get('/stock-transactions', adminController.getStockTransactions);

module.exports = router;
