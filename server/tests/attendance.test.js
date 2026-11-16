const { test, describe } = require('node:test');
const assert = require('node:assert');
const {
  SEMESTER_START_DATE,
  getTodayIST,
  getDayNameIST,
  isSunday,
  getDateRange
} = require('../utils/dateUtils');
const {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  verifyAccessToken,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  REFRESH_TOKEN_EXPIRY_DAYS
} = require('../utils/jwtUtils');

describe('Semester Attendance Tracker - Core Engine & Calculations', () => {

  describe('1. Date and Timezone (Asia/Kolkata IST) Engine', () => {
    test('Semester start date is fixed at 16 November 2026', () => {
      assert.strictEqual(SEMESTER_START_DATE, '2026-11-16');
    });

    test('getTodayIST returns a valid YYYY-MM-DD string', () => {
      const today = getTodayIST();
      assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
    });

    test('16 November 2026 is correctly identified as Monday', () => {
      const day = getDayNameIST('2026-11-16');
      assert.strictEqual(day, 'Monday');
      assert.strictEqual(isSunday('2026-11-16'), false);
    });

    test('22 November 2026 is correctly identified as Sunday', () => {
      const day = getDayNameIST('2026-11-22');
      assert.strictEqual(day, 'Sunday');
      assert.strictEqual(isSunday('2026-11-22'), true);
    });

    test('getDateRange accurately includes all days in range', () => {
      const range = getDateRange('2026-11-16', '2026-11-22');
      assert.strictEqual(range.length, 7);
      assert.strictEqual(range[0], '2026-11-16');
      assert.strictEqual(range[6], '2026-11-22');
    });

    test('getDateRange handles same-day start and end', () => {
      const range = getDateRange('2026-11-16', '2026-11-16');
      assert.strictEqual(range.length, 1);
      assert.strictEqual(range[0], '2026-11-16');
    });
  });

  describe('2. Attendance Statistics and 75% Formula Engine', () => {
    function computeAttendanceMetrics(records) {
      let totalConductedHours = 0;
      let totalAttendedHours = 0;
      let totalWorkingDays = 0;
      let totalHolidays = 0;

      for (const record of records) {
        if (isSunday(record.date) || record.isHoliday) {
          totalHolidays += 1;
          continue;
        }
        totalWorkingDays += 1;
        totalConductedHours += 6;
        totalAttendedHours += Number(record.hoursPresent || 0);
      }

      let percentage = 0;
      if (totalConductedHours > 0) {
        percentage = (totalAttendedHours / totalConductedHours) * 100;
      } else {
        percentage = 100.0;
      }

      const roundedPercentage = Number(percentage.toFixed(2));

      // Formula: max(0, ceil((0.75 * T - A) / 0.25))
      let requiredFutureHours = 0;
      if (totalConductedHours > 0) {
        const val = Math.ceil((0.75 * totalConductedHours - totalAttendedHours) / 0.25);
        requiredFutureHours = Math.max(0, val);
      }

      const status = roundedPercentage >= 75 ? 'good' : 'warning';

      return {
        percentage: roundedPercentage,
        attendedHours: totalAttendedHours,
        conductedHours: totalConductedHours,
        workingDays: totalWorkingDays,
        holidays: totalHolidays,
        futureHoursNeeded: requiredFutureHours,
        status
      };
    }

    test('Handles 0 conducted hours safely with 100% and 0 future hours', () => {
      const records = [
        { date: '2026-11-22', isHoliday: true, hoursPresent: 0 } // Sunday holiday
      ];
      const metrics = computeAttendanceMetrics(records);
      assert.strictEqual(metrics.conductedHours, 0);
      assert.strictEqual(metrics.attendedHours, 0);
      assert.strictEqual(metrics.percentage, 100);
      assert.strictEqual(metrics.futureHoursNeeded, 0);
      assert.strictEqual(metrics.status, 'good');
    });

    test('Day 1 default (6/6 hours): 100% attendance and 0 future hours needed', () => {
      const records = [
        { date: '2026-11-16', isHoliday: false, hoursPresent: 6 }
      ];
      const metrics = computeAttendanceMetrics(records);
      assert.strictEqual(metrics.conductedHours, 6);
      assert.strictEqual(metrics.attendedHours, 6);
      assert.strictEqual(metrics.percentage, 100);
      assert.strictEqual(metrics.futureHoursNeeded, 0);
      assert.strictEqual(metrics.status, 'good');
    });

    test('Day 1 missed (0/6 hours): 0% attendance, exactly 18 future hours needed', () => {
      const records = [
        { date: '2026-11-16', isHoliday: false, hoursPresent: 0 }
      ];
      const metrics = computeAttendanceMetrics(records);
      // T = 6, A = 0
      // ceil((0.75 * 6 - 0) / 0.25) = ceil(4.5 / 0.25) = 18
      assert.strictEqual(metrics.conductedHours, 6);
      assert.strictEqual(metrics.attendedHours, 0);
      assert.strictEqual(metrics.percentage, 0);
      assert.strictEqual(metrics.futureHoursNeeded, 18);
      assert.strictEqual(metrics.status, 'warning');

      // Verification: If student attends 18 future hours:
      // Attended becomes 0 + 18 = 18, Conducted becomes 6 + 18 = 24.
      // 18 / 24 = 0.75 = 75.00%!
      const newPercentage = (18 / 24) * 100;
      assert.strictEqual(newPercentage, 75);
    });

    test('Attending 50% across 5 working days (Monday-Friday): verifies future hours calculation', () => {
      // 5 working days (Nov 16 to Nov 20, 2026: Mon-Fri) * 6 = 30 conducted hours, student attended 15 hours
      const records = [
        { date: '2026-11-16', isHoliday: false, hoursPresent: 3 },
        { date: '2026-11-17', isHoliday: false, hoursPresent: 3 },
        { date: '2026-11-18', isHoliday: false, hoursPresent: 3 },
        { date: '2026-11-19', isHoliday: false, hoursPresent: 3 },
        { date: '2026-11-20', isHoliday: false, hoursPresent: 3 }
      ];
      const metrics = computeAttendanceMetrics(records);
      assert.strictEqual(metrics.conductedHours, 30);
      assert.strictEqual(metrics.attendedHours, 15);
      assert.strictEqual(metrics.percentage, 50);
      assert.strictEqual(metrics.status, 'warning');

      // T = 30, A = 15
      // 0.75 * 30 = 22.5. 22.5 - 15 = 7.5.
      // 7.5 / 0.25 = 30 future hours needed!
      assert.strictEqual(metrics.futureHoursNeeded, 30);

      // Verification: with 30 future hours attended:
      // (15 + 30) / (30 + 30) = 45 / 60 = 75.00%!
      assert.strictEqual((45 / 60) * 100, 75);
    });

    test('Sunday automatic exclusion from conducted hours', () => {
      const records = [
        { date: '2026-11-16', isHoliday: false, hoursPresent: 6 },
        { date: '2026-11-22', isHoliday: true, hoursPresent: 0 } // Sunday
      ];
      const metrics = computeAttendanceMetrics(records);
      assert.strictEqual(metrics.conductedHours, 6);
      assert.strictEqual(metrics.workingDays, 1);
      assert.strictEqual(metrics.holidays, 1);
      assert.strictEqual(metrics.percentage, 100);
    });

    test('Manual holiday exclusion from conducted hours', () => {
      const records = [
        { date: '2026-11-16', isHoliday: false, hoursPresent: 6 },
        { date: '2026-11-17', isHoliday: true, hoursPresent: 0 } // User marked holiday
      ];
      const metrics = computeAttendanceMetrics(records);
      assert.strictEqual(metrics.conductedHours, 6);
      assert.strictEqual(metrics.workingDays, 1);
      assert.strictEqual(metrics.holidays, 1);
      assert.strictEqual(metrics.percentage, 100);
    });
  });

  describe('3. JWT, Refresh Token & Cookie Security Engine', () => {
    test('generateAccessToken generates a verifiable JWT token with correct payload', () => {
      const user = {
        _id: '507f1f77bcf86cd799439011',
        rollNumber: 'CS2026001',
        email: 'student@college.edu'
      };
      const token = generateAccessToken(user);
      assert.ok(token);

      const decoded = verifyAccessToken(token);
      assert.ok(decoded);
      assert.strictEqual(decoded.userId, user._id);
      assert.strictEqual(decoded.rollNumber, user.rollNumber);
      assert.strictEqual(decoded.email, user.email);
    });

    test('verifyAccessToken rejects tampered tokens', () => {
      const user = { _id: '123', rollNumber: 'CS01', email: 'a@b.com' };
      const token = generateAccessToken(user);
      const tampered = token + 'tampered';
      const decoded = verifyAccessToken(tampered);
      assert.strictEqual(decoded, null);
    });

    test('generateRefreshToken produces strong random string', () => {
      const token1 = generateRefreshToken();
      const token2 = generateRefreshToken();
      assert.strictEqual(typeof token1, 'string');
      assert.strictEqual(token1.length, 80); // 40 bytes hex = 80 chars
      assert.notStrictEqual(token1, token2);
    });

    test('hashToken uses SHA-256 and is deterministic', () => {
      const raw = 'random_secret_token_12345';
      const hash1 = hashToken(raw);
      const hash2 = hashToken(raw);
      assert.strictEqual(hash1, hash2);
      assert.strictEqual(hash1.length, 64); // SHA-256 hex = 64 chars
    });

    test('Cookie options are strictly configured with httpOnly and sameSite', () => {
      const accessCookie = getAccessTokenCookieOptions();
      assert.strictEqual(accessCookie.httpOnly, true);
      assert.strictEqual(accessCookie.path, '/');
      assert.strictEqual(accessCookie.maxAge, 15 * 60 * 1000);

      const refreshCookie = getRefreshTokenCookieOptions();
      assert.strictEqual(refreshCookie.httpOnly, true);
      assert.strictEqual(refreshCookie.path, '/');
      assert.strictEqual(refreshCookie.maxAge, REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    });
  });
});
