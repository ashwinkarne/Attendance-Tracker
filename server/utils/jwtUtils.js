const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'dev_access_secret_key_change_in_production_9812487216';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'dev_refresh_secret_key_change_in_production_1489271928';

const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY_DAYS = 30; // 30 days

/**
 * Generates short-lived JWT access token
 */
function generateAccessToken(user) {
  return jwt.sign(
    {
      userId: user._id || user.id,
      rollNumber: user.rollNumber,
      email: user.email
    },
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

/**
 * Generates a cryptographically strong refresh token string
 */
function generateRefreshToken() {
  return crypto.randomBytes(40).toString('hex');
}

/**
 * Hashes a refresh token with SHA-256 for secure database storage
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verifies JWT access token
 */
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Cookie options for Access Token
 */
function getAccessTokenCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/',
    maxAge: 15 * 60 * 1000 // 15 minutes
  };
}

/**
 * Cookie options for Refresh Token
 */
function getRefreshTokenCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/',
    maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000 // 30 days
  };
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  verifyAccessToken,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  REFRESH_TOKEN_EXPIRY_DAYS
};
