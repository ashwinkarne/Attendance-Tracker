const Attendance = require('../models/Attendance');
const {
  SEMESTER_START_DATE,
  getTodayIST,
  getDayNameIST,
  isSunday,
  getDateRange
} = require('../utils/dateUtils');

/**
 * Initializes or recovers attendance records for a user from SEMESTER_START_DATE to today IST.
 * Ensures missing records are inserted without overwriting existing records.
 */
async function syncUserAttendanceRecords(userId) {
  const today = getTodayIST();
  const allDates = getDateRange(SEMESTER_START_DATE, today);

  // Fetch all existing records for this user
  const existingRecords = await Attendance.find({
    userId,
    date: { $in: allDates }
  }).select('date');

  const existingDatesSet = new Set(existingRecords.map((r) => r.date));
  const missingDates = allDates.filter((d) => !existingDatesSet.has(d));

  if (missingDates.length === 0) {
    return;
  }

  const newRecords = missingDates.map((dateStr) => {
    const isSun = isSunday(dateStr);
    return {
      userId,
      date: dateStr,
      day: getDayNameIST(dateStr),
      isHoliday: isSun,
      hoursPresent: isSun ? 0 : 6
    };
  });

  try {
    // ordered: false ensures that if any duplicate key occurs, others still insert
    await Attendance.insertMany(newRecords, { ordered: false });
  } catch (err) {
    // Ignore duplicate key errors (code 11000)
    if (err.code !== 11000 && !err.writeErrors) {
      console.error('Error inserting missing attendance records:', err);
      throw err;
    }
  }
}

/**
 * Generates today's record for all registered users (used by cron job and recovery)
 */
async function generateDailyAttendanceForAllUsers(targetDateStr = null) {
  const User = require('../models/User');
  const dateStr = targetDateStr || getTodayIST();
  const isSun = isSunday(dateStr);
  const dayName = getDayNameIST(dateStr);

  const users = await User.find({}, '_id');
  if (!users || users.length === 0) {
    return;
  }

  const operations = users.map((user) => ({
    updateOne: {
      filter: { userId: user._id, date: dateStr },
      update: {
        $setOnInsert: {
          userId: user._id,
          date: dateStr,
          day: dayName,
          isHoliday: isSun,
          hoursPresent: isSun ? 0 : 6
        }
      },
      upsert: true
    }
  }));

  if (operations.length > 0) {
    await Attendance.bulkWrite(operations, { ordered: false });
  }
}

/**
 * Recovers missing records for all users from semester start up to today
 */
async function runDowntimeRecovery() {
  const User = require('../models/User');
  const users = await User.find({}, '_id');
  for (const user of users) {
    await syncUserAttendanceRecords(user._id);
  }
}

/**
 * Calculates attendance statistics for a given user
 */
async function calculateAttendanceSummary(userId) {
  // Ensure all records from semester start to today are present
  await syncUserAttendanceRecords(userId);

  const today = getTodayIST();
  const records = await Attendance.find({
    userId,
    date: { $gte: SEMESTER_START_DATE, $lte: today }
  }).sort({ date: -1 });

  let totalConductedHours = 0;
  let totalAttendedHours = 0;
  let totalWorkingDays = 0;
  let totalHolidays = 0;

  for (const record of records) {
    const isSun = isSunday(record.date);
    // Sundays and manually marked holidays are excluded from conducted hours
    if (isSun || record.isHoliday) {
      totalHolidays += 1;
      continue;
    }

    // Normal working day
    totalWorkingDays += 1;
    totalConductedHours += 6;
    totalAttendedHours += Number(record.hoursPresent || 0);
  }

  // Handle zero conducted hours safely
  let percentage = 0;
  if (totalConductedHours > 0) {
    percentage = (totalAttendedHours / totalConductedHours) * 100;
  } else {
    // If no working days conducted yet, default to 100% since no hours missed
    percentage = 100.0;
  }

  const roundedPercentage = Number(percentage.toFixed(2));

  // Required Future Hours = max(0, ceil((0.75 * T - A) / 0.25))
  let requiredFutureHours = 0;
  if (totalConductedHours > 0) {
    const formulaVal = Math.ceil((0.75 * totalConductedHours - totalAttendedHours) / 0.25);
    requiredFutureHours = Math.max(0, formulaVal);
  }

  const status = roundedPercentage >= 75 ? 'good' : 'warning';

  return {
    percentage: roundedPercentage,
    attendedHours: totalAttendedHours,
    conductedHours: totalConductedHours,
    workingDays: totalWorkingDays,
    holidays: totalHolidays,
    futureHoursNeeded: requiredFutureHours,
    status,
    isTargetAchieved: roundedPercentage >= 75,
    targetPercentage: 75.0,
    currentDateIST: today,
    semesterStartDate: SEMESTER_START_DATE
  };
}

module.exports = {
  syncUserAttendanceRecords,
  generateDailyAttendanceForAllUsers,
  runDowntimeRecovery,
  calculateAttendanceSummary
};
