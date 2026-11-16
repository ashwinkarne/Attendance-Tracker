const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { authenticateUser } = require('../middleware/authMiddleware');

router.get('/profile', authenticateUser, studentController.getProfile);

module.exports = router;
