const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const isAuthenticated = (req, res, next) => req.session.userId ? next() : res.status(401).json({ message: 'Please log in to continue' });

router.get('/cart', isAuthenticated, cartController.getCart);
router.post('/cart/add', isAuthenticated, cartController.addToCart);
router.get('/cart/check', isAuthenticated, cartController.checkCart);
router.put('/cart/update', isAuthenticated, cartController.updateCart);
router.delete('/cart/:productId', isAuthenticated, cartController.removeFromCart);

module.exports = router;
