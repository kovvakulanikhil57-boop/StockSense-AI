const jwt = require('jsonwebtoken');
const { query } = require('../db/dbAdapter');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Verifies JWT token and attaches user information to req.user
 */
async function verifyToken(req, res, next) {
  try {
    let token = null;

    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch user from DB to ensure account is active and verified
    const users = await query(
      `SELECT u.user_id, u.name, u.email, u.role, u.branch_id, u.is_verified, u.is_active,
              b.branch_code, b.branch_name, b.department_block
       FROM Users u
       LEFT JOIN Branches b ON u.branch_id = b.branch_id
       WHERE u.user_id = ?`,
      [decoded.userId]
    );

    if (!users || users.length === 0) {
      return res.status(401).json({ success: false, message: 'User account no longer exists.' });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Contact the administrator.' });
    }

    req.user = {
      userId: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
      branchId: user.branch_id,
      branchCode: user.branch_code,
      branchName: user.branch_name,
      departmentBlock: user.department_block,
      isVerified: Boolean(user.is_verified)
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid or corrupted authentication token.' });
  }
}

/**
 * Role-based authorization middleware
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Please authenticate.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to [${allowedRoles.join(', ')}]. Your role is ${req.user.role}.`
      });
    }

    next();
  };
}

/**
 * Ensures user account is verified
 */
function requireVerified(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized.' });
  }

  // Admins are always considered verified
  if (req.user.role === 'ADMIN' || req.user.isVerified) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Your account is pending verification. Please contact the administrator or verify your email.'
  });
}

module.exports = {
  verifyToken,
  requireRole,
  requireVerified
};
