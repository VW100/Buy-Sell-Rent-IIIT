const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

const isAuthenticated = (req, res, next) => req.session.userId ? next() : res.status(401).json({ message: 'Please log in to continue' });

router.get('/search', productController.searchProducts);
router.get('/initial', productController.getInitialProducts);
router.get('/categories', productController.getCategories);
router.get('/product/:id', productController.getProductById);
router.post('/sell', isAuthenticated, productController.sellProduct);

module.exports = router;
