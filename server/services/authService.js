const bcrypt = require('bcryptjs');
const User = require('../models/User');
const RefreshSession = require('../models/RefreshSession');
const {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  REFRESH_TOKEN_EXPIRY_DAYS
} = require('../utils/jwtUtils');
const { syncUserAttendanceRecords } = require('./attendanceService');

/**
 * Register a new student
 */
async function registerUser({ fullName, email, rollNumber, dateOfBirth, password, confirmPassword }) {
  // Field validation
  if (!fullName || !email || !rollNumber || !dateOfBirth || !password || !confirmPassword) {
    throw { status: 400, message: 'All fields are required.' };
  }

  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(email)) {
    throw { status: 400, message: 'Please provide a valid email address.' };
  }

  if (password !== confirmPassword) {
    throw { status: 400, message: 'Password and Confirm Password do not match.' };
  }

  if (password.length < 6) {
    throw { status: 400, message: 'Password must be at least 6 characters long.' };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedRoll = rollNumber.trim().toUpperCase();

  // Check unique email and rollNumber
  const existingUser = await User.findOne({
    $or: [{ email: normalizedEmail }, { rollNumber: normalizedRoll }]
  });

  if (existingUser) {
    if (existingUser.email === normalizedEmail) {
      throw { status: 409, message: 'A user with this email address already exists.' };
    }
    if (existingUser.rollNumber === normalizedRoll) {
      throw { status: 409, message: 'A user with this Roll Number already exists.' };
    }
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = await User.create({
    fullName: fullName.trim(),
    email: normalizedEmail,
    rollNumber: normalizedRoll,
    dateOfBirth,
    password: hashedPassword
  });

  // Generate attendance records from 16 November 2026 through current date
  try {
    await syncUserAttendanceRecords(newUser._id);
  } catch (syncErr) {
    console.error('Initial attendance generation warning:', syncErr.message);
  }

  return {
    id: newUser._id,
    fullName: newUser.fullName,
    email: newUser.email,
    rollNumber: newUser.rollNumber,
    dateOfBirth: newUser.dateOfBirth
  };
}

/**
 * Authenticate student and issue persistent session
 */
async function loginUser({ rollNumber, password, userAgent = '' }) {
  if (!rollNumber || !password) {
    throw { status: 400, message: 'Roll Number and Password are required.' };
  }

  const normalizedRoll = rollNumber.trim().toUpperCase();
  const user = await User.findOne({ rollNumber: normalizedRoll });

  if (!user) {
    throw { status: 401, message: 'Invalid Roll Number or Password.' };
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw { status: 401, message: 'Invalid Roll Number or Password.' };
  }

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const rawRefreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(rawRefreshToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  // Store refresh session in MongoDB
  await RefreshSession.create({
    userId: user._id,
    refreshTokenHash,
    expiresAt,
    deviceInformation: userAgent.substring(0, 255)
  });

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      rollNumber: user.rollNumber,
      dateOfBirth: user.dateOfBirth
    }
  };
}

/**
 * Refresh persistent session and rotate refresh token
 */
async function refreshSession({ rawRefreshToken, userAgent = '' }) {
  if (!rawRefreshToken) {
    throw { status: 401, message: 'Refresh token not found.' };
  }

  const tokenHash = hashToken(rawRefreshToken);
  const session = await RefreshSession.findOne({
    refreshTokenHash: tokenHash,
    revokedAt: null,
    expiresAt: { $gt: new Date() }
  });

  if (!session) {
    throw { status: 401, message: 'Session is invalid or has expired.' };
  }

  const user = await User.findById(session.userId);
  if (!user) {
    session.revokedAt = new Date();
    await session.save();
    throw { status: 401, message: 'User not found.' };
  }

  // Token rotation: Revoke current session and issue a new one
  session.revokedAt = new Date();
  await session.save();

  const newAccessToken = generateAccessToken(user);
  const newRawRefreshToken = generateRefreshToken();
  const newHash = hashToken(newRawRefreshToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await RefreshSession.create({
    userId: user._id,
    refreshTokenHash: newHash,
    expiresAt,
    deviceInformation: userAgent.substring(0, 255)
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRawRefreshToken,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      rollNumber: user.rollNumber,
      dateOfBirth: user.dateOfBirth
    }
  };
}

/**
 * Revoke specific refresh session upon logout
 */
async function revokeSession(rawRefreshToken) {
  if (!rawRefreshToken) {
    return;
  }
  const tokenHash = hashToken(rawRefreshToken);
  await RefreshSession.updateOne(
    { refreshTokenHash: tokenHash, revokedAt: null },
    { revokedAt: new Date() }
  );
}

/**
 * Forgot password reset
 */
async function resetPassword({ email, rollNumber, dateOfBirth, newPassword, confirmPassword }) {
  if (!email || !rollNumber || !dateOfBirth || !newPassword || !confirmPassword) {
    throw { status: 400, message: 'All fields are required.' };
  }

  if (newPassword !== confirmPassword) {
    throw { status: 400, message: 'New Password and Confirm Password do not match.' };
  }

  if (newPassword.length < 6) {
    throw { status: 400, message: 'Password must be at least 6 characters long.' };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedRoll = rollNumber.trim().toUpperCase();

  const user = await User.findOne({
    email: normalizedEmail,
    rollNumber: normalizedRoll,
    dateOfBirth: dateOfBirth.trim()
  });

  // Generic response to avoid enumeration
  if (!user) {
    throw { status: 400, message: 'Verification details do not match any existing student account.' };
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  await user.save();

  // Revoke all existing sessions for this user across all devices
  await RefreshSession.updateMany(
    { userId: user._id, revokedAt: null },
    { revokedAt: new Date() }
  );

  return { message: 'Password reset successful. Please log in with your new password.' };
}

module.exports = {
  registerUser,
  loginUser,
  refreshSession,
  revokeSession,
  resetPassword
};
