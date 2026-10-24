const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db/dbAdapter');
const { validateStudentEmail, validateAgentEmail, validatePassword, validateConfirmPassword } = require('../validators/authValidator');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Register a new university student with automatic branch detection from institutional email
 */
async function registerStudent(req, res) {
  try {
    const { name, email, password, confirmPassword, phone } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }

    // 1. Validate Email & Extract Branch Code
    const emailValidation = validateStudentEmail(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({ success: false, message: emailValidation.error });
    }
    const normalizedEmail = emailValidation.normalizedEmail;
    const branchCode = emailValidation.branchCode;

    // 2. Validate Password Rules
    const passValidation = validatePassword(password);
    if (!passValidation.isValid) {
      return res.status(400).json({ success: false, message: passValidation.error });
    }

    // 2b. Validate Confirm Password if provided or required
    if (confirmPassword !== undefined) {
      const confirmCheck = validateConfirmPassword(password, confirmPassword);
      if (!confirmCheck.isValid) {
        return res.status(400).json({ success: false, message: confirmCheck.error });
      }
    }

    // 3. Check if email already registered
    const existing = await query('SELECT user_id FROM Users WHERE email = ?', [normalizedEmail]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this institutional email already exists. Please log in.'
      });
    }

    // 4. Resolve Branch ID from extracted branchCode
    const branches = await query(
      'SELECT branch_id, branch_name, department_block FROM Branches WHERE branch_code = ? AND is_active = TRUE',
      [branchCode]
    );

    if (branches.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Branch code '${branchCode}' recognized from email is not currently configured or active.`
      });
    }

    const branch = branches[0];

    // 5. Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    // 6. Insert new Student into Users table
    const result = await query(
      `INSERT INTO Users (name, email, password_hash, role, branch_id, phone, is_verified, is_active)
       VALUES (?, ?, ?, 'STUDENT', ?, ?, TRUE, TRUE)`,
      [name.trim(), normalizedEmail, passwordHash, branch.branch_id, phone ? phone.trim() : null]
    );

    const newUserId = result.insertId;

    // 7. Create welcome notification
    await query(
      `INSERT INTO Notifications (user_id, title, message, type, link)
       VALUES (?, 'Welcome to StockSense AI', ?, 'SYSTEM', '/student/catalogue')`,
      [newUserId, `Your account is registered and verified for ${branch.branch_name} (${branchCode}).`]
    );

    // 8. Generate JWT
    const token = jwt.sign(
      { userId: newUserId, role: 'STUDENT', branchId: branch.branch_id },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(201).json({
      success: true,
      message: `Registration successful! Verified for ${branch.branch_name}.`,
      token,
      user: {
        userId: newUserId,
        name: name.trim(),
        email: normalizedEmail,
        role: 'STUDENT',
        branchId: branch.branch_id,
        branchCode: branchCode,
        branchName: branch.branch_name,
        departmentBlock: branch.department_block,
        isVerified: true
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: 'Server error occurred during registration.' });
  }
}

/**
 * Universal login endpoint with role enforcement
 */
async function login(req, res) {
  try {
    const { email, password, expectedRole } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Fetch user details including branch
    const users = await query(
      `SELECT u.user_id, u.name, u.email, u.password_hash, u.role, u.branch_id,
              u.phone, u.vehicle_number, u.is_verified, u.is_active,
              b.branch_code, b.branch_name, b.department_block
       FROM Users u
       LEFT JOIN Branches b ON u.branch_id = b.branch_id
       WHERE u.email = ?`,
      [normalizedEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = users[0];

    // Check account status
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact the administrator.'
      });
    }

    // Verify Password
    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Role check if portal expects a specific role
    if (expectedRole && user.role !== expectedRole) {
      return res.status(403).json({
        success: false,
        message: `This login portal is for ${expectedRole} accounts only. Your account role is ${user.role}.`
      });
    }

    // Verification check (unless admin)
    if (user.role !== 'ADMIN' && !user.is_verified) {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending verification. Please contact the university store administrator.'
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.user_id, role: user.role, branchId: user.branch_id },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: {
        userId: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branch_id,
        branchCode: user.branch_code,
        branchName: user.branch_name,
        departmentBlock: user.department_block,
        phone: user.phone,
        vehicleNumber: user.vehicle_number,
        isVerified: Boolean(user.is_verified)
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'An error occurred during login.' });
  }
}

/**
 * Dedicated Delivery Agent login
 */
async function agentLogin(req, res) {
  req.body.expectedRole = 'DELIVERY_AGENT';
  return login(req, res);
}

/**
 * Get current authenticated user profile
 */
async function getProfile(req, res) {
  try {
    const users = await query(
      `SELECT u.user_id, u.name, u.email, u.role, u.branch_id, u.phone,
              u.vehicle_number, u.is_verified, u.created_at,
              b.branch_code, b.branch_name, b.department_block
       FROM Users u
       LEFT JOIN Branches b ON u.branch_id = b.branch_id
       WHERE u.user_id = ?`,
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const u = users[0];
    return res.json({
      success: true,
      profile: {
        userId: u.user_id,
        name: u.name,
        email: u.email,
        role: u.role,
        branchId: u.branch_id,
        branchCode: u.branch_code,
        branchName: u.branch_name,
        departmentBlock: u.department_block,
        phone: u.phone,
        vehicleNumber: u.vehicle_number,
        isVerified: Boolean(u.is_verified),
        createdAt: u.created_at
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve profile.' });
  }
}

/**
 * Update user profile (phone, vehicle number for agents)
 */
async function updateProfile(req, res) {
  try {
    const { name, phone, vehicleNumber } = req.body;
    const userId = req.user.userId;

    const updates = [];
    const params = [];

    if (name && name.trim()) {
      updates.push('name = ?');
      params.push(name.trim());
    }

    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone ? phone.trim() : null);
    }

    // Only agents can update vehicle_number
    if (req.user.role === 'DELIVERY_AGENT' && vehicleNumber !== undefined) {
      updates.push('vehicle_number = ?');
      params.push(vehicleNumber ? vehicleNumber.trim() : null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields provided for update.' });
    }

    params.push(userId);
    await query(`UPDATE Users SET ${updates.join(', ')} WHERE user_id = ?`, params);

    return res.json({ success: true, message: 'Profile updated successfully.' });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
}

/**
 * Change password endpoint enforcing complexity checks
 */
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new passwords are required.' });
    }

    // Validate new password rules
    const passCheck = validatePassword(newPassword);
    if (!passCheck.isValid) {
      return res.status(400).json({ success: false, message: passCheck.error });
    }

    // Retrieve current password hash
    const users = await query('SELECT password_hash FROM Users WHERE user_id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const matches = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!matches) {
      return res.status(400).json({ success: false, message: 'Incorrect current password.' });
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE Users SET password_hash = ? WHERE user_id = ?', [newHash, userId]);

    return res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ success: false, message: 'Failed to change password.' });
  }
}

module.exports = {
  registerStudent,
  login,
  agentLogin,
  getProfile,
  updateProfile,
  changePassword
};
