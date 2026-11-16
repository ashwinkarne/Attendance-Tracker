const authService = require('../services/authService');
const User = require('../models/User');
const {
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  getClearCookieOptions
} = require('../utils/jwtUtils');

async function signup(req, res) {
  try {
    const { fullName, email, rollNumber, dateOfBirth, password, confirmPassword } = req.body;
    const user = await authService.registerUser({
      fullName,
      email,
      rollNumber,
      dateOfBirth,
      password,
      confirmPassword
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Please log in.',
      user
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Registration failed.'
    });
  }
}

async function login(req, res) {
  try {
    const { rollNumber, password } = req.body;
    const userAgent = req.headers['user-agent'] || '';

    const { accessToken, refreshToken, user } = await authService.loginUser({
      rollNumber,
      password,
      userAgent
    });

    // Set persistent HTTP-only cookies
    res.cookie('accessToken', accessToken, getAccessTokenCookieOptions());
    res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      user,
      accessToken
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Login failed.'
    });
  }
}

async function refresh(req, res) {
  try {
    const rawRefreshToken = req.cookies?.refreshToken;
    const userAgent = req.headers['user-agent'] || '';

    const { accessToken, refreshToken, user } = await authService.refreshSession({
      rawRefreshToken,
      userAgent
    });

    // Set rotated persistent cookies
    res.cookie('accessToken', accessToken, getAccessTokenCookieOptions());
    res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

    return res.status(200).json({
      success: true,
      message: 'Session refreshed successfully.',
      user,
      accessToken
    });
  } catch (err) {
    // Clear cookies with matching secure and sameSite flags if refresh genuinely fails
    res.clearCookie('accessToken', getClearCookieOptions());
    res.clearCookie('refreshToken', getClearCookieOptions());

    const status = err.status || 401;
    return res.status(status).json({
      success: false,
      message: err.message || 'Failed to refresh authentication session.'
    });
  }
}

async function logout(req, res) {
  try {
    const rawRefreshToken = req.cookies?.refreshToken;
    await authService.revokeSession(rawRefreshToken);

    res.clearCookie('accessToken', getClearCookieOptions());
    res.clearCookie('refreshToken', getClearCookieOptions());

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (err) {
    res.clearCookie('accessToken', getClearCookieOptions());
    res.clearCookie('refreshToken', getClearCookieOptions());

    return res.status(200).json({
      success: true,
      message: 'Logged out.'
    });
  }
}

async function getMe(req, res) {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Student account not found.'
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        rollNumber: user.rollNumber,
        dateOfBirth: user.dateOfBirth,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching authenticated student profile.'
    });
  }
}

async function forgotPassword(req, res) {
  try {
    const { email, rollNumber, dateOfBirth, newPassword, confirmPassword } = req.body;
    const result = await authService.resetPassword({
      email,
      rollNumber,
      dateOfBirth,
      newPassword,
      confirmPassword
    });

    return res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Password reset failed.'
    });
  }
}

module.exports = {
  signup,
  login,
  refresh,
  logout,
  getMe,
  forgotPassword
};
