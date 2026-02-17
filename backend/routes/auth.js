const express = require('express');
const router = express.Router();
const authController = require('../services/authController');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authController.me);
router.post('/change-password', authController.changePassword);

module.exports = router;
