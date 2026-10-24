const crypto = require('crypto');

const OTP_SECRET = process.env.JWT_SECRET;
if (!OTP_SECRET) {
  throw new Error('JWT_SECRET must be set before loading OTP utilities.');
}
// 32-byte key derived from secret
const CIPHER_KEY = crypto.createHash('sha256').update(OTP_SECRET).digest();

/**
 * Generate a cryptographically secure 6-digit numeric OTP
 */
function generateOTP() {
  const buffer = crypto.randomBytes(4);
  const num = buffer.readUInt32BE(0) % 900000 + 100000;
  return num.toString();
}

/**
 * Compute SHA-256 hash of OTP for secure storage and comparison
 */
function hashOTP(otp) {
  return crypto.createHash('sha256').update(otp.trim()).digest('hex');
}

/**
 * Encrypt plain OTP for secure student-only retrieval
 */
function encryptOTP(otp) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', CIPHER_KEY, iv);
  let encrypted = cipher.update(otp, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt OTP for authenticated student
 */
function decryptOTP(encryptedPayload) {
  try {
    if (!encryptedPayload || !encryptedPayload.includes(':')) return null;
    const [ivHex, dataHex] = encryptedPayload.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', CIPHER_KEY, iv);
    let decrypted = decipher.update(dataHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Failed to decrypt OTP:', err.message);
    return null;
  }
}

/**
 * Verify submitted OTP against stored hash using constant-time comparison
 */
function verifyOTPHash(submittedOTP, storedHash) {
  if (!submittedOTP || !storedHash) return false;
  const submittedHash = hashOTP(submittedOTP);
  try {
    return crypto.timingSafeEqual(Buffer.from(submittedHash, 'utf8'), Buffer.from(storedHash, 'utf8'));
  } catch {
    return false;
  }
}

module.exports = {
  generateOTP,
  hashOTP,
  encryptOTP,
  decryptOTP,
  verifyOTPHash
};
