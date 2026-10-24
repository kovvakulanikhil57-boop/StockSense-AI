/**
 * Authentication and input validation helper
 */

const INSTITUTION_EMAIL_DOMAIN = (process.env.INSTITUTION_EMAIL_DOMAIN || 'example.test').trim().toLowerCase();
const escapedInstitutionEmailDomain = INSTITUTION_EMAIL_DOMAIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Regular: YY071A[code][roll]; lateral: YY075A[code][roll].
const STUDENT_EMAIL_REGEX = new RegExp(
  `^([0-9]{2})07(1|5)A(05|66|67)([0-9A-Za-z]{2})@${escapedInstitutionEmailDomain}$`,
  'i'
);
const AGENT_EMAIL_REGEX = new RegExp(
  `^[a-zA-Z0-9._%+-]*(05|66|67)@${escapedInstitutionEmailDomain}$`,
  'i'
);

/**
 * Validates student email format and extracts the branch code
 * Returns { isValid: boolean, branchCode: string|null, error: string|null }
 */
function validateStudentEmail(email) {
  if (!email || typeof email !== 'string') {
    return { isValid: false, branchCode: null, error: 'Email is required.' };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const match = normalizedEmail.match(STUDENT_EMAIL_REGEX);

  if (!match) {
    return {
      isValid: false,
      branchCode: null,
      error: 'Invalid student email format. Must follow the configured institutional format (e.g., YY071A05xx@<institution-domain>).'
    };
  }

  // Branch code is in capture group 3: '05', '66', or '67'
  const branchCode = match[3];
  return { isValid: true, branchCode, error: null, normalizedEmail };
}

/**
 * Validates delivery agent email format and extracts branch code
 */
function validateAgentEmail(email) {
  if (!email || typeof email !== 'string') {
    return { isValid: false, branchCode: null, error: 'Email is required.' };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const match = normalizedEmail.match(AGENT_EMAIL_REGEX);

  if (!match) {
    return {
      isValid: false,
      branchCode: null,
      error: `Invalid delivery agent email format. Must end with a branch code and @${INSTITUTION_EMAIL_DOMAIN}.`
    };
  }

  const branchCode = match[1];
  return { isValid: true, branchCode, error: null, normalizedEmail };
}

/**
 * Enforces strong password rules:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one special character
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required.' };
  }

  const checks = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasDigit: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)
  };

  if (!checks.minLength) {
    return { isValid: false, error: 'Password must be at least 8 characters long.' };
  }
  if (!checks.hasUpper) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter.' };
  }
  if (!checks.hasLower) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter.' };
  }
  if (!checks.hasDigit) {
    return { isValid: false, error: 'Password must contain at least one number.' };
  }
  if (!checks.hasSpecial) {
    return { isValid: false, error: 'Password must contain at least one special character (!@#$%^&*...).' };
  }

  return { isValid: true, error: null };
}

/**
 * Validates that confirmPassword matches password
 */
function validateConfirmPassword(password, confirmPassword) {
  if (!confirmPassword) {
    return { isValid: false, error: 'Please confirm your password.' };
  }
  if (password !== confirmPassword) {
    return { isValid: false, error: 'Passwords do not match.' };
  }
  return { isValid: true, error: null };
}

module.exports = {
  validateStudentEmail,
  validateAgentEmail,
  validatePassword,
  validateConfirmPassword
};
