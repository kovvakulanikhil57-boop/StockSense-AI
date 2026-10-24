const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'stocksense_db',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  decimalNumbers: true
});

/**
 * Execute parameterized query
 */
async function query(sql, params = []) {
  const [results] = await pool.execute(sql, params);
  return results;
}

/**
 * Helper to run operations within a database transaction
 * Automatically rolls back on any error and releases connection.
 */
async function transaction(callback) {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Test database connectivity
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (err) {
    console.error('MySQL Connection Error:', err.message);
    return false;
  }
}

module.exports = {
  pool,
  query,
  transaction,
  testConnection
};
