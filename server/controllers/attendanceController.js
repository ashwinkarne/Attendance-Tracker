const Attendance = require('../models/Attendance');
const {
  syncUserAttendanceRecords,
  calculateAttendanceSummary
} = require('../services/attendanceService');
const {
  SEMESTER_START_DATE,
  getTodayIST,
  getDayNameIST,
  isSunday
} = require('../utils/dateUtils');

/**
 * Get all attendance records for authenticated student, sorted newest first
 */
async function getAttendanceRecords(req, res) {
  try {
    const userId = req.user.userId;
    await syncUserAttendanceRecords(userId);

    const today = getTodayIST();
    const records = await Attendance.find({
      userId,
      date: { $gte: SEMESTER_START_DATE, $lte: today }
    }).sort({ date: -1 });

    return res.status(200).json({
      success: true,
      records
    });
  } catch (err) {
    console.error('Error in getAttendanceRecords:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve attendance records.'
    });
  }
}

/**
 * Get summary attendance metrics and 75% target calculation
 */
async function getAttendanceSummary(req, res) {
  try {
    const userId = req.user.userId;
    const summary = await calculateAttendanceSummary(userId);

    return res.status(200).json({
      success: true,
      summary
    });
  } catch (err) {
    console.error('Error in getAttendanceSummary:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate attendance statistics.'
    });
  }
}

/**
 * Update one or more attendance records
 */
async function bulkUpdateAttendance(req, res) {
  try {
    const userId = req.user.userId;
    const recordsToUpdate = Array.isArray(req.body) ? req.body : req.body.records;

    if (!Array.isArray(recordsToUpdate) || recordsToUpdate.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No attendance records provided for update.'
      });
    }

    const today = getTodayIST();
    const bulkOps = [];

    for (const item of recordsToUpdate) {
      const { date, isHoliday: reqIsHoliday, hoursPresent: reqHours } = item;

      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({
          success: false,
          message: `Invalid date format: ${date}`
        });
      }

      if (date < SEMESTER_START_DATE || date > today) {
        return res.status(400).json({
          success: false,
          message: `Date ${date} is outside the valid semester period (${SEMESTER_START_DATE} to ${today}).`
        });
      }

      const sun = isSunday(date);
      let isHoliday = Boolean(reqIsHoliday);
      let hoursPresent = Number(reqHours);

      // Sundays must strictly remain holidays
      if (sun) {
        isHoliday = true;
        hoursPresent = 0;
      } else {
        if (isHoliday) {
          hoursPresent = 0;
        } else {
          if (isNaN(hoursPresent) || hoursPresent < 0 || hoursPresent > 6 || !Number.isInteger(hoursPresent)) {
            return res.status(400).json({
              success: false,
              message: `Hours present for ${date} must be an integer between 0 and 6.`
            });
          }
        }
      }

      bulkOps.push({
        updateOne: {
          filter: { userId, date },
          update: {
            $set: {
              day: getDayNameIST(date),
              isHoliday,
              hoursPresent
            }
          },
          upsert: true
        }
      });
    }

    if (bulkOps.length > 0) {
      await Attendance.bulkWrite(bulkOps);
    }

    // Recalculate summary after update
    const summary = await calculateAttendanceSummary(userId);

    return res.status(200).json({
      success: true,
      message: 'Attendance records updated successfully.',
      summary
    });
  } catch (err) {
    console.error('Error in bulkUpdateAttendance:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update attendance records.'
    });
  }
}

/**
 * Get attendance for a specific date
 */
async function getAttendanceByDate(req, res) {
  try {
    const userId = req.user.userId;
    const { date } = req.params;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format.'
      });
    }

    let record = await Attendance.findOne({ userId, date });
    if (!record) {
      const today = getTodayIST();
      if (date >= SEMESTER_START_DATE && date <= today) {
        const sun = isSunday(date);
        record = await Attendance.create({
          userId,
          date,
          day: getDayNameIST(date),
          isHoliday: sun,
          hoursPresent: sun ? 0 : 6
        });
      } else {
        return res.status(404).json({
          success: false,
          message: 'No record found for this date.'
        });
      }
    }

    return res.status(200).json({
      success: true,
      record
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve attendance record.'
    });
  }
}

module.exports = {
  getAttendanceRecords,
  getAttendanceSummary,
  bulkUpdateAttendance,
  getAttendanceByDate
};
