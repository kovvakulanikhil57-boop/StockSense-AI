/**
 * StockSense AI — Focused Unit & Integration Tests for Database Compatibility Adapter
 * 
 * Tests both unit-level normalization (tokenization, RETURNING injection, response formatting)
 * and live integration execution against MariaDB.
 */

const assert = require('assert');
const {
  tokenizeAndReplacePlaceholders,
  injectReturningClause,
  normalizeQueryForPostgres,
  formatPostgresResult,
  TABLE_PRIMARY_KEYS,
  query,
  transaction,
  testConnection,
  getDriverInfo
} = require('./src/db/dbAdapter');

async function runAdapterTests() {
  console.log('===============================================================');
  console.log('   STOCKSENSE AI — DATABASE ADAPTER VERIFICATION SUITE         ');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // ---------------------------------------------------------------------------
  // 1. Parameter Placeholder Tokenizer Tests
  // ---------------------------------------------------------------------------
  console.log('--- 1. Parameter Placeholder Tokenization ---');

  test('1.1 Basic single and multiple placeholders', () => {
    const sql = 'SELECT * FROM Users WHERE email = ? AND is_active = ?';
    const expected = 'SELECT * FROM Users WHERE email = $1 AND is_active = $2';
    assert.strictEqual(tokenizeAndReplacePlaceholders(sql), expected);
  });

  test('1.2 Ignores question marks inside single-quoted string literals', () => {
    const sql = "SELECT * FROM Users WHERE note = 'What is this? Is it valid?' AND status = ?";
    const expected = "SELECT * FROM Users WHERE note = 'What is this? Is it valid?' AND status = $1";
    assert.strictEqual(tokenizeAndReplacePlaceholders(sql), expected);
  });

  test('1.3 Handles escaped quotes inside string literals', () => {
    const sql = "SELECT * FROM Users WHERE note = 'It''s a mystery? Yes!' AND id = ?";
    const expected = "SELECT * FROM Users WHERE note = 'It''s a mystery? Yes!' AND id = $1";
    assert.strictEqual(tokenizeAndReplacePlaceholders(sql), expected);
  });

  test('1.4 Ignores question marks inside single-line comments', () => {
    const sql = "SELECT * FROM Users -- Is this active? Yes\nWHERE id = ?";
    const expected = "SELECT * FROM Users -- Is this active? Yes\nWHERE id = $1";
    assert.strictEqual(tokenizeAndReplacePlaceholders(sql), expected);
  });

  test('1.5 Ignores question marks inside multi-line comments', () => {
    const sql = "SELECT * FROM Users /* why? when? */ WHERE id = ? AND branch_id = ?";
    const expected = "SELECT * FROM Users /* why? when? */ WHERE id = $1 AND branch_id = $2";
    assert.strictEqual(tokenizeAndReplacePlaceholders(sql), expected);
  });

  test('1.6 Returns unchanged query when no placeholders exist', () => {
    const sql = 'SELECT COUNT(*) FROM Products WHERE is_active = TRUE';
    assert.strictEqual(tokenizeAndReplacePlaceholders(sql), sql);
  });

  // ---------------------------------------------------------------------------
  // 2. Primary Key RETURNING Clause Injection Tests
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Primary Key RETURNING Clause Injection ---');

  test('2.1 Appends RETURNING user_id for Users insert', () => {
    const sql = 'INSERT INTO Users (name, email) VALUES (?, ?)';
    const res = injectReturningClause(sql);
    assert.strictEqual(res.pkColumn, 'user_id');
    assert.strictEqual(res.sql, 'INSERT INTO Users (name, email) VALUES (?, ?) RETURNING user_id');
  });

  test('2.2 Appends RETURNING order_id for Orders insert', () => {
    const sql = 'INSERT INTO Orders (order_number, total_amount) VALUES (?, ?);';
    const res = injectReturningClause(sql);
    assert.strictEqual(res.pkColumn, 'order_id');
    assert.strictEqual(res.sql, 'INSERT INTO Orders (order_number, total_amount) VALUES (?, ?) RETURNING order_id');
  });

  test('2.3 Appends RETURNING cart_id for Carts insert', () => {
    const sql = 'INSERT INTO Carts (student_id) VALUES (?)';
    const res = injectReturningClause(sql);
    assert.strictEqual(res.pkColumn, 'cart_id');
    assert.strictEqual(res.sql, 'INSERT INTO Carts (student_id) VALUES (?) RETURNING cart_id');
  });

  test('2.4 Appends RETURNING cart_item_id for Cart_Items insert', () => {
    const sql = 'INSERT INTO Cart_Items (cart_id, product_id, quantity) VALUES (?, ?, ?)';
    const res = injectReturningClause(sql);
    assert.strictEqual(res.pkColumn, 'cart_item_id');
    assert.strictEqual(res.sql, 'INSERT INTO Cart_Items (cart_id, product_id, quantity) VALUES (?, ?, ?) RETURNING cart_item_id');
  });

  test('2.5 Does NOT append RETURNING for composite key table Product_Branches', () => {
    const sql = 'INSERT INTO Product_Branches (product_id, branch_id) VALUES (?, ?)';
    const res = injectReturningClause(sql);
    assert.strictEqual(res.pkColumn, null);
    assert.strictEqual(res.sql, sql);
  });

  test('2.6 Does NOT duplicate existing RETURNING clause', () => {
    const sql = 'INSERT INTO Users (name, email) VALUES (?, ?) RETURNING user_id, email';
    const res = injectReturningClause(sql);
    assert.strictEqual(res.pkColumn, null);
    assert.strictEqual(res.sql, sql);
  });

  test('2.7 Does NOT alter non-insert statements (SELECT, UPDATE, DELETE)', () => {
    const sql = 'UPDATE Products SET stock_quantity = stock_quantity - 1 WHERE product_id = ?';
    const res = injectReturningClause(sql);
    assert.strictEqual(res.pkColumn, null);
    assert.strictEqual(res.sql, sql);
  });

  // ---------------------------------------------------------------------------
  // 3. PostgreSQL Query Normalization & Result Formatting
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Query Normalization & Result Formatting ---');

  test('3.1 Combined normalization: tokenization + RETURNING injection', () => {
    const sql = 'INSERT INTO Orders (order_number, total_amount) VALUES (?, ?)';
    const norm = normalizeQueryForPostgres(sql, ['ORD-123', 450.00]);
    assert.strictEqual(norm.sql, 'INSERT INTO Orders (order_number, total_amount) VALUES ($1, $2) RETURNING order_id');
    assert.strictEqual(norm.pkColumn, 'order_id');
    assert.strictEqual(norm.isInsert, true);
    assert.deepStrictEqual(norm.params, ['ORD-123', 450.00]);
  });

  test('3.2 Format PostgreSQL INSERT result into mysql2 OkPacket shape', () => {
    const mockPgResult = {
      command: 'INSERT',
      rowCount: 1,
      rows: [{ user_id: '128' }]
    };
    const okPacket = formatPostgresResult(mockPgResult, false, 'user_id');
    assert.strictEqual(okPacket.insertId, 128);
    assert.strictEqual(okPacket.affectedRows, 1);
    assert.strictEqual(okPacket.rowCount, 1);
  });

  test('3.3 Format PostgreSQL UPDATE result (no pkColumn) into OkPacket', () => {
    const mockPgResult = {
      command: 'UPDATE',
      rowCount: 3,
      rows: []
    };
    const okPacket = formatPostgresResult(mockPgResult, false, null);
    assert.strictEqual(okPacket.insertId, 0);
    assert.strictEqual(okPacket.affectedRows, 3);
  });

  test('3.4 Format PostgreSQL SELECT result into row array', () => {
    const mockPgResult = {
      command: 'SELECT',
      rowCount: 2,
      rows: [{ branch_id: 1, branch_code: '05' }, { branch_id: 2, branch_code: '66' }]
    };
    const rows = formatPostgresResult(mockPgResult, true, null);
    assert.strictEqual(Array.isArray(rows), true);
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[0].branch_code, '05');
  });

  test('3.5 Translate GROUP_CONCAT for text column to PostgreSQL STRING_AGG', () => {
    const sql = "SELECT GROUP_CONCAT(b.branch_code ORDER BY b.branch_code SEPARATOR ', ') AS branches FROM Branches b";
    const norm = normalizeQueryForPostgres(sql);
    assert.strictEqual(
      norm.sql,
      "SELECT STRING_AGG(b.branch_code, ', ' ORDER BY b.branch_code) AS branches FROM Branches b"
    );
  });

  test('3.6 Translate GROUP_CONCAT for numeric ID column with auto-cast to text', () => {
    const sql = "SELECT GROUP_CONCAT(b.branch_id ORDER BY b.branch_id SEPARATOR ',') AS branch_ids FROM Branches b";
    const norm = normalizeQueryForPostgres(sql);
    assert.strictEqual(
      norm.sql,
      "SELECT STRING_AGG(b.branch_id::text, ',' ORDER BY b.branch_id) AS branch_ids FROM Branches b"
    );
  });

  test('3.7 pool getter returns valid pool on active driver', () => {
    const { pool } = require('./src/db/dbAdapter');
    assert.strictEqual(typeof pool.query, 'function');
    assert.strictEqual(typeof pool.getConnection, 'function');
  });

  // ---------------------------------------------------------------------------
  // 4. Live MariaDB Integration Tests through Adapter
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Live MariaDB Adapter Execution ---');

  await asyncTest('4.1 Driver identification defaults to MariaDB / MySQL fallback', async () => {
    const info = getDriverInfo();
    assert.strictEqual(info.driver, 'mysql');
    assert.strictEqual(info.isMySql, true);
    assert.strictEqual(info.isPostgres, false);
  });

  await asyncTest('4.2 testConnection() verifies live MariaDB connectivity', async () => {
    const connected = await testConnection();
    assert.strictEqual(connected, true);
  });

  await asyncTest('4.3 query() executes SELECT on active MariaDB', async () => {
    const branches = await query(
      'SELECT branch_id, branch_code, branch_name FROM Branches WHERE is_active = TRUE ORDER BY branch_code ASC'
    );
    assert.strictEqual(Array.isArray(branches), true);
    assert.strictEqual(branches.length >= 3, true);
    assert.strictEqual(branches[0].branch_code, '05');
    assert.strictEqual(branches[1].branch_code, '66');
    assert.strictEqual(branches[2].branch_code, '67');
  });

  await asyncTest('4.4 query() with parameters executes successfully on MariaDB', async () => {
    const rows = await query('SELECT user_id, email, role FROM Users WHERE email = ?', ['admin@example.test']);
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].role, 'ADMIN');
  });

  await asyncTest('4.5 transaction() executes atomic read/write and releases cleanly on MariaDB', async () => {
    const testEmail = `adapter_test_${Date.now()}@example.test`;
    const result = await transaction(async (conn) => {
      // 1. Insert test user inside transaction
      const [insert] = await conn.execute(
        `INSERT INTO Users (name, email, password_hash, role, branch_id, is_verified, is_active)
         VALUES (?, ?, 'dummy_hash', 'STUDENT', 1, TRUE, TRUE)`,
        ['Adapter Test User', testEmail]
      );
      assert.strictEqual(typeof insert.insertId, 'number');
      assert.strictEqual(insert.insertId > 0, true);
      const tempId = insert.insertId;

      // 2. Select back within same transaction
      const [found] = await conn.execute('SELECT email FROM Users WHERE user_id = ?', [tempId]);
      assert.strictEqual(found.length, 1);
      assert.strictEqual(found[0].email, testEmail);

      // 3. Clean up within transaction
      await conn.execute('DELETE FROM Users WHERE user_id = ?', [tempId]);

      return { tempId, verified: true };
    });

    assert.strictEqual(result.verified, true);

    // Verify row was deleted outside transaction
    const remaining = await query('SELECT user_id FROM Users WHERE email = ?', [testEmail]);
    assert.strictEqual(remaining.length, 0);
  });

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`   ADAPTER TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAdapterTests().catch((err) => {
  console.error('Fatal adapter test error:', err);
  process.exit(1);
});
