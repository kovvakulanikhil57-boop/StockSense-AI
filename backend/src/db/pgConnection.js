/**
 * StockSense AI — Supabase PostgreSQL Connection Pool & Query Driver
 * Reversible preparation module for Supabase integration.
 * Does not replace the active MySQL connection until explicitly activated.
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// Construct configuration from connection string or discrete parameters
const connectionConfig = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL
  ? {
      connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    }
  : {
      host: process.env.SUPABASE_DB_HOST,
      port: parseInt(process.env.SUPABASE_DB_PORT || '5432', 10),
      user: process.env.SUPABASE_DB_USER || 'postgres',
      password: process.env.SUPABASE_DB_PASSWORD || '',
      database: process.env.SUPABASE_DB_NAME || 'postgres',
      ssl: { rejectUnauthorized: false }
    };

const pool = new Pool({
  ...connectionConfig,
  max: parseInt(process.env.PG_POOL_MAX || '15', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

// Suppress unexpected idle client errors
pool.on('error', (err) => {
  console.error('Unexpected Supabase PostgreSQL pool error:', err.message);
});

/**
 * Execute parameterized PostgreSQL query with native $1, $2 parameter placeholders
 * @param {string} text - SQL query text with $1, $2 placeholders
 * @param {Array} params - Array of parameter values
 * @returns {Promise<Array>} - Query result rows
 */
async function query(text, params = []) {
  const result = await pool.query(text, params);
  return result.rows;
}

/**
 * Execute within an ACID transaction on a dedicated client from the pool
 * @param {Function} callback - Async function receiving the pg transaction client
 * @returns {Promise<any>}
 */
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Test connectivity to the Supabase PostgreSQL database
 * @returns {Promise<{ success: boolean, message: string, timestamp?: string }>}
 */
async function testConnection() {
  let client;
  try {
    client = await pool.connect();
    const res = await client.query('SELECT NOW() AS current_time, current_database() AS db_name, version() AS pg_version');
    return {
      success: true,
      message: 'Supabase PostgreSQL connected successfully.',
      timestamp: res.rows[0].current_time,
      database: res.rows[0].db_name,
      version: res.rows[0].pg_version
    };
  } catch (err) {
    return {
      success: false,
      message: `Supabase PostgreSQL connection failed: ${err.message}`
    };
  } finally {
    if (client) client.release();
  }
}

module.exports = {
  pool,
  query,
  transaction,
  testConnection
};
