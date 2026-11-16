/**
 * Date and Timezone Utilities for Asia/Kolkata (IST)
 */

const SEMESTER_START_DATE = '2026-11-16'; // Fixed semester start date

/**
 * Returns today's date in Asia/Kolkata formatted as YYYY-MM-DD
 */
function getTodayIST() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
}

/**
 * Returns the day name (e.g. 'Monday', 'Sunday') for a YYYY-MM-DD in IST
 */
function getDayNameIST(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Construct date at midday UTC to avoid any boundary spill
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long'
  }).format(date);
}

/**
 * Returns true if the date is a Sunday
 */
function isSunday(dateStr) {
  return getDayNameIST(dateStr).toLowerCase() === 'sunday';
}

/**
 * Generates an array of all dates (inclusive) between startDate and endDate in YYYY-MM-DD
 */
function getDateRange(startDateStr, endDateStr) {
  const dates = [];
  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const [ey, em, ed] = endDateStr.split('-').map(Number);

  const start = new Date(Date.UTC(sy, sm - 1, sd, 12, 0, 0));
  const end = new Date(Date.UTC(ey, em - 1, ed, 12, 0, 0));

  if (start > end) {
    // If today is somehow before semester start, at least include semester start
    return [startDateStr];
  }

  const current = new Date(start);
  while (current <= end) {
    const year = current.getUTCFullYear();
    const month = String(current.getUTCMonth() + 1).padStart(2, '0');
    const day = String(current.getUTCDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

module.exports = {
  SEMESTER_START_DATE,
  getTodayIST,
  getDayNameIST,
  isSunday,
  getDateRange
};
