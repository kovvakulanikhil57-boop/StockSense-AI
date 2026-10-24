/**
 * One-time CLI Bootstrap Script for the Initial StockSense AI Administrator
 * Usage:
 *   node backend/src/scripts/bootstrapAdmin.js
 * Or with custom credentials:
 *   ADMIN_NAME="Demo Store Administrator" ADMIN_EMAIL="admin@example.test" ADMIN_PASSWORD="<set-a-unique-password>" node backend/src/scripts/bootstrapAdmin.js
 */

const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { query, pool } = require('../db/dbAdapter');
const { validatePassword } = require('../validators/authValidator');

async function bootstrap() {
  console.log('--- StockSense AI: Initial Administrator Bootstrap ---');

  try {
    // 1. Check if an administrator already exists
    const existingAdmins = await query("SELECT user_id, name, email FROM Users WHERE role = 'ADMIN'");

    if (existingAdmins.length > 0) {
      console.log(`[INFO] Bootstrap aborted: An administrator account already exists (${existingAdmins[0].email}).`);
      console.log('Initial admin bootstrap can only be run once. To manage administrators, sign in to the Admin Executive Hub.');
      process.exit(0);
    }

    // 2. Read admin credentials
    const adminName = process.env.ADMIN_NAME || process.argv[2] || 'Demo Store Administrator';
    const adminEmail = (process.env.ADMIN_EMAIL || process.argv[3] || 'admin@example.test').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || process.argv[4];

    // 3. Validate password complexity
    const passCheck = validatePassword(adminPassword);
    if (!passCheck.isValid) {
      console.error(`[ERROR] Invalid admin password: ${passCheck.error}`);
      process.exit(1);
    }

    // 4. Hash password
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // 5. Create initial administrator
    const result = await query(
      `INSERT INTO Users (name, email, password_hash, role, branch_id, is_verified, is_active)
       VALUES (?, ?, ?, 'ADMIN', NULL, TRUE, TRUE)`,
      [adminName, adminEmail, passwordHash]
    );

    console.log(`[SUCCESS] Initial administrator created successfully!`);
    console.log(`  User ID: ${result.insertId}`);
    console.log(`  Name:    ${adminName}`);
    console.log(`  Email:   ${adminEmail}`);
    console.log(`  Role:    ADMIN`);
    console.log('\nYou can now log in using the Admin tab on the StockSense AI sign-in page.');
    process.exit(0);
  } catch (error) {
    console.error('[ERROR] Bootstrap failed:', error.message);
    process.exit(1);
  } finally {
    if (pool) await pool.end();
  }
}

bootstrap();
