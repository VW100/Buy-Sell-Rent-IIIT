const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const isAuthenticated = (req, res, next) => req.session.userId ? next() : res.status(401).json({ message: 'Please log in to continue' });

router.post('/orders', isAuthenticated, orderController.placeOrders);
router.post('/reviews/add', orderController.addReview);
router.post('/orders/:orderId/regenerate-otp', orderController.regenerateOtp);
router.get('/orders/bought', isAuthenticated, orderController.getBoughtOrders);
router.get('/orders/sold', isAuthenticated, orderController.getSoldOrders);

module.exports = router;
