const { verifyAccessToken } = require('../utils/jwtUtils');

/**
 * Authentication middleware that extracts and validates the access token from cookies
 */
function authenticateUser(req, res, next) {
  let token = req.cookies?.accessToken;

  // Fallback to Authorization header if provided
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. No session found.',
      code: 'NO_TOKEN'
    });
  }

  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: 'Access token expired or invalid.',
      code: 'TOKEN_EXPIRED'
    });
  }

  req.user = decoded;
  next();
}

/**
 * CSRF Protection middleware for state-changing requests (POST, PUT, DELETE, PATCH).
 * Protects against cross-site form submissions and forged requests by verifying custom headers.
 */
function verifyCsrf(req, res, next) {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Require client-side custom header for state mutation
  const csrfHeader = req.headers['x-requested-with'] || req.headers['x-csrf-protection'];
  if (!csrfHeader) {
    return res.status(403).json({
      success: false,
      message: 'CSRF verification failed: Missing required verification header.'
    });
  }

  next();
}

module.exports = {
  authenticateUser,
  verifyCsrf
};
