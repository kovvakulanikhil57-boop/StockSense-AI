/**
 * StockSense AI — Database Compatibility Adapter
 * 
 * Provides unified interface for both MariaDB/MySQL (mysql2) and PostgreSQL (pg).
 * Reversible and safe: defaults to MariaDB without changing runtime behavior.
 * 
 * Capabilities for PostgreSQL:
 * 1. Safe context-aware placeholder tokenizer (? -> $1, $2, ...) that ignores string literals, quotes, and comments.
 * 2. Explicit primary key lookup for INSERT queries to append RETURNING <pk_col>.
 * 3. Translates GROUP_CONCAT to STRING_AGG for PostgreSQL compatibility.
 * 4. Normalizes result format to ensure full backward-compatibility with mysql2 destructured calls:
 *    - query(sql, params) -> returns rows array (for SELECT) or OkPacket { insertId, affectedRows } (for INSERT/UPDATE/DELETE).
 *    - connection.execute(sql, params) -> returns [rows, fields] or [okPacket, undefined].
 * 5. Preserves full transaction semantics (BEGIN, COMMIT, ROLLBACK).
 */

const mysqlConnection = require('./connection');
const pgConnection = require('./pgConnection');
const dotenv = require('dotenv');

dotenv.config();

// Determine active driver. Defaults to 'mysql' to guarantee 100% fallback safety.
const DB_DRIVER = (process.env.DB_DRIVER || 'mysql').toLowerCase();

/**
 * Strict mapping of table names (case-insensitive) to their single-column primary keys.
 * Tables with composite keys (e.g., product_branches) are omitted so no erroneous RETURNING is injected.
 */
const TABLE_PRIMARY_KEYS = Object.freeze({
  users: 'user_id',
  branches: 'branch_id',
  categories: 'category_id',
  products: 'product_id',
  suppliers: 'supplier_id',
  purchases: 'purchase_id',
  purchase_items: 'purchase_item_id',
  orders: 'order_id',
  order_items: 'order_item_id',
  deliveries: 'delivery_id',
  agent_warnings: 'warning_id',
  stock_transactions: 'transaction_id',
  notifications: 'notification_id',
  carts: 'cart_id',
  cart_items: 'cart_item_id'
});

/**
 * Tokenize SQL and replace unquoted '?' with '$1', '$2', etc.
 * Skips single-quoted string literals, double-quoted identifiers, and comments.
 * 
 * @param {string} sql - Original MySQL parameterized SQL
 * @returns {string} - PostgreSQL parameterized SQL with $1, $2, ...
 */
function tokenizeAndReplacePlaceholders(sql) {
  if (typeof sql !== 'string' || !sql.includes('?')) {
    return sql;
  }

  let result = '';
  let paramIndex = 1;
  const len = sql.length;
  let i = 0;

  while (i < len) {
    const char = sql[i];

    // 1. Single-line comment: --
    if (char === '-' && i + 1 < len && sql[i + 1] === '-') {
      const lineEnd = sql.indexOf('\n', i);
      if (lineEnd === -1) {
        result += sql.slice(i);
        break;
      } else {
        result += sql.slice(i, lineEnd + 1);
        i = lineEnd + 1;
        continue;
      }
    }

    // 2. Multi-line comment: /* ... */
    if (char === '/' && i + 1 < len && sql[i + 1] === '*') {
      const commentEnd = sql.indexOf('*/', i + 2);
      if (commentEnd === -1) {
        result += sql.slice(i);
        break;
      } else {
        result += sql.slice(i, commentEnd + 2);
        i = commentEnd + 2;
        continue;
      }
    }

    // 3. Single-quoted string literal: '...' (handles escaped quote '')
    if (char === "'") {
      result += "'";
      i++;
      while (i < len) {
        if (sql[i] === "'") {
          result += "'";
          if (i + 1 < len && sql[i + 1] === "'") {
            // Escaped quote
            result += "'";
            i += 2;
            continue;
          } else {
            i++;
            break;
          }
        } else {
          result += sql[i];
          i++;
        }
      }
      continue;
    }

    // 4. Double-quoted identifier: "..."
    if (char === '"') {
      result += '"';
      i++;
      while (i < len) {
        if (sql[i] === '"') {
          result += '"';
          i++;
          break;
        } else {
          result += sql[i];
          i++;
        }
      }
      continue;
    }

    // 5. Unquoted question mark placeholder
    if (char === '?') {
      result += `$${paramIndex++}`;
      i++;
      continue;
    }

    // Standard character
    result += char;
    i++;
  }

  return result;
}

/**
 * Determine the primary key column for an INSERT statement and append RETURNING clause if needed.
 * 
 * @param {string} sql - SQL string
 * @returns {{ sql: string, pkColumn: string|null }}
 */
function injectReturningClause(sql) {
  if (typeof sql !== 'string') {
    return { sql, pkColumn: null };
  }

  // If RETURNING is already present, do not duplicate
  if (/\bRETURNING\b/i.test(sql)) {
    return { sql, pkColumn: null };
  }

  // Check if it's an INSERT statement
  const insertMatch = sql.match(/\bINSERT\s+INTO\s+["`]?([a-zA-Z0-9_]+)["`]?/i);
  if (!insertMatch) {
    return { sql, pkColumn: null };
  }

  const tableName = insertMatch[1].toLowerCase();
  const pkColumn = TABLE_PRIMARY_KEYS[tableName] || null;

  if (pkColumn) {
    // Append RETURNING <pk_col>
    const trimmed = sql.trim().replace(/;+$/, '');
    return {
      sql: `${trimmed} RETURNING ${pkColumn}`,
      pkColumn
    };
  }

  return { sql, pkColumn: null };
}

/**
 * Translate GROUP_CONCAT patterns to PostgreSQL STRING_AGG
 * 
 * @param {string} sql 
 * @returns {string}
 */
function translateGroupConcatToPostgres(sql) {
  if (typeof sql !== 'string' || !sql.includes('GROUP_CONCAT')) {
    return sql;
  }

  return sql.replace(
    /\bGROUP_CONCAT\s*\(\s*([a-zA-Z0-9_.]+)(?:\s+ORDER\s+BY\s+([a-zA-Z0-9_.\s,ASCascDESCdesc]+?))?\s+SEPARATOR\s+('([^']*)'|"([^"]*)")\s*\)/gi,
    (match, col, orderBy, sepQuoted, sep1, sep2) => {
      const sep = sep1 !== undefined ? sep1 : sep2;
      const isIdCol = /_id$/i.test(col);
      const colExpr = isIdCol ? `${col}::text` : col;
      const orderExpr = orderBy ? ` ORDER BY ${orderBy.trim()}` : '';
      return `STRING_AGG(${colExpr}, '${sep}'${orderExpr})`;
    }
  );
}

/**
 * Helper to generate dialect-compatible GROUP_CONCAT or STRING_AGG expression
 * 
 * @param {string} column - Column name (e.g. 'b.branch_code')
 * @param {string} separator - Separator string (e.g. ', ')
 * @param {string|null} orderBy - Optional order by clause (e.g. 'b.branch_code ASC')
 * @param {boolean} isNumeric - Set true if column is numeric to ensure cast to text in PG
 * @returns {string}
 */
function getGroupConcatSql(column, separator = ', ', orderBy = null, isNumeric = false) {
  const isPg = DB_DRIVER === 'postgres';
  if (isPg) {
    const colExpr = isNumeric ? `${column}::text` : column;
    const orderExpr = orderBy ? ` ORDER BY ${orderBy}` : '';
    return `STRING_AGG(${colExpr}, '${separator}'${orderExpr})`;
  }

  const orderExpr = orderBy ? ` ORDER BY ${orderBy}` : '';
  return `GROUP_CONCAT(${column}${orderExpr} SEPARATOR '${separator}')`;
}

/**
 * Normalize a query for PostgreSQL execution
 * 
 * @param {string} sql
 * @param {Array} params
 * @returns {{ sql: string, params: Array, pkColumn: string|null, isInsert: boolean, isSelect: boolean }}
 */
function normalizeQueryForPostgres(sql, params = []) {
  const isInsert = /^\s*INSERT\b/i.test(sql);
  const isSelect = /^\s*(SELECT|WITH)\b/i.test(sql);

  // 1. Replace parameter placeholders
  let normalizedSql = tokenizeAndReplacePlaceholders(sql);

  // 2. Translate GROUP_CONCAT if present
  normalizedSql = translateGroupConcatToPostgres(normalizedSql);

  let pkColumn = null;

  // 3. Inject RETURNING if INSERT
  if (isInsert) {
    const returningInfo = injectReturningClause(normalizedSql);
    normalizedSql = returningInfo.sql;
    pkColumn = returningInfo.pkColumn;
  }

  // 4. Normalize parameter values (e.g. coerce numbers for boolean columns if needed)
  const normalizedParams = params.map(val => {
    return val;
  });

  return {
    sql: normalizedSql,
    params: normalizedParams,
    pkColumn,
    isInsert,
    isSelect
  };
}

/**
 * Format PostgreSQL query response to emulate mysql2 OkPacket / Row format
 */
function formatPostgresResult(pgResult, isSelect, pkColumn) {
  if (isSelect) {
    // Return row array directly for query(), or [rows, fields] for execute()
    return pgResult.rows || [];
  }

  // Emulate mysql2 OkPacket
  let insertId = 0;
  if (pkColumn && pgResult.rows && pgResult.rows.length > 0) {
    const rawId = pgResult.rows[0][pkColumn] || pgResult.rows[0][pkColumn.toLowerCase()];
    insertId = Number(rawId) || 0;
  }

  const okPacket = {
    insertId,
    affectedRows: pgResult.rowCount || 0,
    rowCount: pgResult.rowCount || 0,
    warningStatus: 0
  };

  return okPacket;
}

/**
 * Create a wrapped PostgreSQL transaction client that mirrors mysql2 connection interface
 */
function createPgConnectionWrapper(pgClient) {
  return {
    async execute(sql, params = []) {
      const { sql: normSql, params: normParams, pkColumn, isSelect } = normalizeQueryForPostgres(sql, params);
      const res = await pgClient.query(normSql, normParams);

      if (isSelect) {
        return [res.rows, res.fields];
      } else {
        const okPacket = formatPostgresResult(res, false, pkColumn);
        return [okPacket, undefined];
      }
    },

    async query(sql, params = []) {
      const { sql: normSql, params: normParams, pkColumn, isSelect } = normalizeQueryForPostgres(sql, params);
      const res = await pgClient.query(normSql, normParams);
      const formatted = formatPostgresResult(res, isSelect, pkColumn);
      return [formatted, undefined];
    },

    async release() {
      // Release is handled by transaction wrapper
    }
  };
}

// -----------------------------------------------------------------------------
// Unified Database Interface
// -----------------------------------------------------------------------------

/**
 * Execute parameterized query on active driver
 * @param {string} sql 
 * @param {Array} params 
 * @returns {Promise<any>}
 */
async function query(sql, params = []) {
  if (DB_DRIVER === 'postgres') {
    const { sql: normSql, params: normParams, pkColumn, isSelect } = normalizeQueryForPostgres(sql, params);
    const client = await pgConnection.pool.connect();
    try {
      const res = await client.query(normSql, normParams);
      return formatPostgresResult(res, isSelect, pkColumn);
    } finally {
      client.release();
    }
  }

  // MariaDB / MySQL (Active Fallback)
  return mysqlConnection.query(sql, params);
}

/**
 * Run operations within a transaction on active driver
 * @param {Function} callback - Async function receiving transaction connection
 * @returns {Promise<any>}
 */
async function transaction(callback) {
  if (DB_DRIVER === 'postgres') {
    const client = await pgConnection.pool.connect();
    try {
      await client.query('BEGIN');
      const connectionWrapper = createPgConnectionWrapper(client);
      const result = await callback(connectionWrapper);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // MariaDB / MySQL (Active Fallback)
  return mysqlConnection.transaction(callback);
}

/**
 * Test connectivity on active driver
 * @returns {Promise<boolean>}
 */
async function testConnection() {
  if (DB_DRIVER === 'postgres') {
    const res = await pgConnection.testConnection();
    return res.success;
  }

  // MariaDB / MySQL (Active Fallback)
  return mysqlConnection.testConnection();
}

/**
 * Introspection helper
 */
function getDriverInfo() {
  return {
    driver: DB_DRIVER,
    isPostgres: DB_DRIVER === 'postgres',
    isMySql: DB_DRIVER === 'mysql'
  };
}

module.exports = {
  get pool() {
    return DB_DRIVER === 'postgres' ? pgConnection.pool : mysqlConnection.pool;
  },
  DB_DRIVER,
  query,
  transaction,
  testConnection,
  getDriverInfo,
  getGroupConcatSql,
  // Export internals for unit testing
  tokenizeAndReplacePlaceholders,
  injectReturningClause,
  translateGroupConcatToPostgres,
  normalizeQueryForPostgres,
  formatPostgresResult,
  TABLE_PRIMARY_KEYS
};
