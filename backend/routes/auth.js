const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/authController');

// Example route structure:
// router.post('/signup', [...validation], authController.signup);

module.exports = router;
