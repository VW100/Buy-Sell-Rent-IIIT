const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const isAuthenticated = (req, res, next) => req.session.userId ? next() : res.status(401).json({ message: 'Please log in to continue' });

router.get('/check-auth', isAuthenticated, userController.checkAuth);
router.get('/user/me', userController.getUserMe);
router.get('/profile', isAuthenticated, userController.getProfile);
router.put('/profile', isAuthenticated, userController.updateProfile);

module.exports = router;
