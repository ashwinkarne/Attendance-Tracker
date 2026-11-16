const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticateUser, verifyCsrf } = require('../middleware/authMiddleware');

router.get('/', authenticateUser, attendanceController.getAttendanceRecords);
router.get('/summary', authenticateUser, attendanceController.getAttendanceSummary);
router.put('/bulk-update', authenticateUser, verifyCsrf, attendanceController.bulkUpdateAttendance);
router.get('/:date', authenticateUser, attendanceController.getAttendanceByDate);

module.exports = router;
