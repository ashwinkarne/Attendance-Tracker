const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateUser } = require('../middleware/authMiddleware');
const { authLimiter, forgotPasswordLimiter } = require('../middleware/rateLimiter');

router.post('/signup', authLimiter, authController.signup);
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticateUser, authController.getMe);
router.post('/forgot-password', forgotPasswordLimiter, authController.forgotPassword);

module.exports = router;
