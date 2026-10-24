const rateLimit = require('express-rate-limit');

/**
 * Auth rate limiter to mitigate brute-force attempts
 */
const baseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.'
  }
});

const authLimiter = (req, res, next) => {
  if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return next();
  }
  return baseLimiter(req, res, next);
};

/**
 * OTP attempt limiter
 */
const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many OTP verification attempts. Please wait before trying again.'
  }
});

module.exports = {
  authLimiter,
  otpLimiter
};
