const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/sellerController');
const isAuthenticated = (req, res, next) => req.session.userId ? next() : res.status(401).json({ message: 'Please log in to continue' });

router.get('/seller/undelivered-orders', isAuthenticated, sellerController.getUndeliveredOrders);
router.post('/seller/confirm-delivery', isAuthenticated, sellerController.confirmDelivery);

module.exports = router;
