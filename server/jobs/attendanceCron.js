const cron = require('node-cron');
const {
  generateDailyAttendanceForAllUsers,
  runDowntimeRecovery
} = require('../services/attendanceService');

/**
 * Initializes the scheduled cron job running at 12:00 AM Asia/Kolkata
 */
function initAttendanceCron() {
  console.log('Initializing Attendance Midnight Cron Job (Timezone: Asia/Kolkata)...');

  // Schedule task at 12:00 AM every day in Asia/Kolkata timezone
  cron.schedule(
    '0 0 * * *',
    async () => {
      console.log(`[${new Date().toISOString()}] Midnight Cron triggered for Asia/Kolkata.`);
      try {
        await generateDailyAttendanceForAllUsers();
        console.log('Midnight attendance generation completed.');
      } catch (err) {
        console.error('Error during scheduled attendance generation:', err);
      }
    },
    {
      scheduled: true,
      timezone: 'Asia/Kolkata'
    }
  );

  // Run downtime recovery upon server start to populate any missing days
  runDowntimeRecovery()
    .then(() => {
      console.log('Downtime recovery check completed successfully.');
    })
    .catch((err) => {
      console.error('Downtime recovery check error:', err);
    });
}

module.exports = {
  initAttendanceCron
};
