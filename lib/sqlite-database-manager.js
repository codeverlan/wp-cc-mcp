/**
 * SQLite Database Manager - Handles SQLite database operations for WP-CC-MCP project management
 * 
 * Provides centralized database management with:
 * - Connection pooling and lifecycle management
 * - Transaction support with automatic rollback
 * - Schema migrations and versioning
 * - Query result transformation and validation
 * - Comprehensive error handling and logging
 * 
 * @author WP-CC-MCP
 * @version 1.0.0
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';
import { config } from './config-manager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * SQLite database connection and operation manager
 * Provides safe, efficient database operations with proper error handling
 */
class SQLiteDatabaseManager {
  constructor() {
    this.db = null;
    this.dbPath = null;
    this.isInitialized = false;
    this.transactionDepth = 0;
    
    // Schema definitions
    this.schemas = {
      projects: `
        CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          path TEXT NOT NULL,
          port INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
          git_remote TEXT,
          active BOOLEAN DEFAULT 0,
          siteground_ssh_host TEXT,
          siteground_ssh_user TEXT,
          siteground_repo_path TEXT,
          siteground_site_url TEXT,
          siteground_deployment_branch TEXT DEFAULT 'master',
          siteground_staging_branch TEXT DEFAULT 'staging',
          project_type TEXT DEFAULT 'wordpress',
          docker_compose_path TEXT,
          status TEXT DEFAULT 'inactive',
          configuration TEXT -- JSON configuration data
        )
      `,
      migrations: `
        CREATE TABLE IF NOT EXISTS migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          filename TEXT NOT NULL,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          checksum TEXT,
          migration_type TEXT DEFAULT 'database',
          success BOOLEAN DEFAULT 1,
          error_message TEXT,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )
      `,
      meta: `
        CREATE TABLE IF NOT EXISTS meta (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          meta_key TEXT UNIQUE NOT NULL,
          meta_value TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,
      logs: `
        CREATE TABLE IF NOT EXISTS logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          level TEXT NOT NULL,
          message TEXT NOT NULL,
          context TEXT, -- JSON context data
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          source TEXT,
          project_id INTEGER,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
        )
      `
    };

    // Prepared statements cache
    this.statements = new Map();
  }

  /**
   * Initialize database connection and schema
   * @param {string} dbPath - Optional custom database path
   * @returns {Promise<void>}
   */
  async initialize(dbPath = null) {
    if (this.isInitialized) {
      return;
    }

    try {
      // Determine database path
      this.dbPath = dbPath || path.join(config.getProjectsDir(), '..', 'projects.db');
      
      // Ensure directory exists
      await fs.ensureDir(path.dirname(this.dbPath));

      // Create database connection
      this.db = new Database(this.dbPath);
      
      // Configure database
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('cache_size = 1000');
      this.db.pragma('foreign_keys = ON');

      // Create schema
      await this.createSchema();

      // Initialize meta table with version info
      await this.initializeMeta();

      this.isInitialized = true;
      logger.info('SQLite database initialized successfully', { 
        dbPath: this.dbPath,
        mode: this.db.readonly ? 'readonly' : 'readwrite'
      });

    } catch (error) {
      logger.logError(error, {
        operation: 'sqlite-db-initialize',
        dbPath: this.dbPath
      });
      throw new Error(`Failed to initialize SQLite database: ${error.message}`);
    }
  }

  /**
   * Create database schema
   * @private
   */
  async createSchema() {
    for (const [tableName, sql] of Object.entries(this.schemas)) {
      try {
        this.db.exec(sql);
        logger.debug(`Created table: ${tableName}`);
      } catch (error) {
        logger.logError(error, {
          operation: 'sqlite-create-schema',
          table: tableName
        });
        throw new Error(`Failed to create table ${tableName}: ${error.message}`);
      }
    }

    // Create indexes for performance
    this.createIndexes();
  }

  /**
   * Create database indexes
   * @private
   */
  createIndexes() {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name)',
      'CREATE INDEX IF NOT EXISTS idx_projects_active ON projects(active)',
      'CREATE INDEX IF NOT EXISTS idx_projects_port ON projects(port)',
      'CREATE INDEX IF NOT EXISTS idx_migrations_project_id ON migrations(project_id)',
      'CREATE INDEX IF NOT EXISTS idx_migrations_filename ON migrations(filename)',
      'CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_logs_project_id ON logs(project_id)',
      'CREATE INDEX IF NOT EXISTS idx_meta_key ON meta(meta_key)'
    ];

    for (const indexSql of indexes) {
      try {
        this.db.exec(indexSql);
      } catch (error) {
        logger.logError(error, {
          operation: 'sqlite-create-index',
          sql: indexSql
        });
      }
    }
  }

  /**
   * Initialize meta table with system information
   * @private
   */
  async initializeMeta() {
    const version = '1.0.0';
    const now = new Date().toISOString();
    
    const metaItems = [
      { key: 'schema_version', value: version },
      { key: 'created_at', value: now },
      { key: 'last_migration', value: now }
    ];

    const insertMeta = this.getStatement(
      'INSERT OR IGNORE INTO meta (meta_key, meta_value) VALUES (?, ?)'
    );

    for (const { key, value } of metaItems) {
      insertMeta.run(key, value);
    }
  }

  /**
   * Get or create a prepared statement
   * @param {string} sql - SQL query
   * @returns {Object} Prepared statement
   */
  getStatement(sql) {
    if (!this.db) {
      throw new Error('SQLite database not initialized');
    }

    if (!this.statements.has(sql)) {
      this.statements.set(sql, this.db.prepare(sql));
    }

    return this.statements.get(sql);
  }

  /**
   * Execute a transaction with automatic rollback on error
   * @param {Function} callback - Transaction callback function
   * @returns {Promise<*>} Transaction result
   */
  async transaction(callback) {
    if (!this.db) {
      throw new Error('SQLite database not initialized');
    }

    const transactionId = ++this.transactionDepth;
    
    try {
      logger.debug('Starting SQLite transaction', { transactionId });
      
      // Begin transaction
      if (this.transactionDepth === 1) {
        this.db.exec('BEGIN TRANSACTION');
      } else {
        this.db.exec(`SAVEPOINT sp_${transactionId}`);
      }

      // Execute transaction callback
      const result = await callback();

      // Commit transaction
      if (this.transactionDepth === 1) {
        this.db.exec('COMMIT');
        logger.debug('SQLite transaction committed', { transactionId });
      } else {
        this.db.exec(`RELEASE SAVEPOINT sp_${transactionId}`);
        logger.debug('SQLite savepoint released', { transactionId });
      }

      this.transactionDepth--;
      return result;

    } catch (error) {
      // Rollback transaction
      try {
        if (this.transactionDepth === 1) {
          this.db.exec('ROLLBACK');
          logger.warn('SQLite transaction rolled back', { transactionId, error: error.message });
        } else {
          this.db.exec(`ROLLBACK TO SAVEPOINT sp_${transactionId}`);
          logger.warn('SQLite rolled back to savepoint', { transactionId, error: error.message });
        }
      } catch (rollbackError) {
        logger.logError(rollbackError, {
          operation: 'sqlite-transaction-rollback',
          originalError: error.message
        });
      }

      this.transactionDepth--;
      throw error;
    }
  }

  /**
   * Execute a query and return results
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Array} Query results
   */
  query(sql, params = []) {
    try {
      const stmt = this.getStatement(sql);
      const result = stmt.all(...params);
      
      logger.debug('SQLite query executed', {
        sql: sql.substring(0, 100),
        resultCount: result.length,
        params: params.length
      });

      return result;
    } catch (error) {
      logger.logError(error, {
        operation: 'sqlite-query',
        sql,
        params
      });
      throw error;
    }
  }

  /**
   * Execute a query and return first result
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Object|null} First result or null
   */
  queryOne(sql, params = []) {
    try {
      const stmt = this.getStatement(sql);
      const result = stmt.get(...params);
      
      logger.debug('SQLite queryOne executed', {
        sql: sql.substring(0, 100),
        hasResult: !!result,
        params: params.length
      });

      return result || null;
    } catch (error) {
      logger.logError(error, {
        operation: 'sqlite-query-one',
        sql,
        params
      });
      throw error;
    }
  }

  /**
   * Execute an insert/update/delete statement
   * @param {string} sql - SQL statement
   * @param {Array} params - Statement parameters
   * @returns {Object} Execution info (changes, lastInsertRowid)
   */
  execute(sql, params = []) {
    try {
      const stmt = this.getStatement(sql);
      const info = stmt.run(...params);
      
      logger.debug('SQLite statement executed', {
        sql: sql.substring(0, 100),
        changes: info.changes,
        lastId: info.lastInsertRowid,
        params: params.length
      });

      return info;
    } catch (error) {
      logger.logError(error, {
        operation: 'sqlite-execute',
        sql,
        params
      });
      throw error;
    }
  }

  /**
   * Get database metadata
   * @param {string} key - Meta key
   * @returns {string|null} Meta value
   */
  getMeta(key) {
    return this.queryOne('SELECT meta_value FROM meta WHERE meta_key = ?', [key])?.meta_value || null;
  }

  /**
   * Set database metadata
   * @param {string} key - Meta key
   * @param {string} value - Meta value
   */
  setMeta(key, value) {
    const now = new Date().toISOString();
    this.execute(`
      INSERT OR REPLACE INTO meta (meta_key, meta_value, updated_at) 
      VALUES (?, ?, ?)
    `, [key, value, now]);
  }

  /**
   * Check database health and connectivity
   * @returns {Promise<Object>} Health check result
   */
  async healthCheck() {
    try {
      if (!this.db) {
        throw new Error('SQLite database not initialized');
      }

      // Test basic query
      const result = this.queryOne('SELECT 1 as test');
      if (result?.test !== 1) {
        throw new Error('Basic query test failed');
      }

      // Get database stats
      const stats = {
        dbPath: this.dbPath,
        isInitialized: this.isInitialized,
        readonly: this.db.readonly,
        inTransaction: this.db.inTransaction,
        totalChanges: this.db.exec('PRAGMA total_changes')[0]?.total_changes || 0,
        userVersion: this.db.exec('PRAGMA user_version')[0]?.user_version || 0,
        pageCount: this.db.exec('PRAGMA page_count')[0]?.page_count || 0,
        pageSize: this.db.exec('PRAGMA page_size')[0]?.page_size || 0,
        cacheSize: this.db.exec('PRAGMA cache_size')[0]?.cache_size || 0,
        journalMode: this.db.exec('PRAGMA journal_mode')[0]?.journal_mode || 'unknown'
      };

      // Calculate database size
      if (await fs.pathExists(this.dbPath)) {
        const stat = await fs.stat(this.dbPath);
        stats.sizeBytes = stat.size;
        stats.sizeMB = Math.round(stat.size / (1024 * 1024) * 100) / 100;
      }

      logger.debug('SQLite database health check completed', stats);

      return {
        healthy: true,
        stats,
        message: 'SQLite database is healthy and responsive'
      };

    } catch (error) {
      logger.logError(error, {
        operation: 'sqlite-health-check'
      });

      return {
        healthy: false,
        error: error.message,
        message: 'SQLite database health check failed'
      };
    }
  }

  /**
   * Close database connection
   */
  close() {
    try {
      if (this.db) {
        // Close all prepared statements
        for (const stmt of this.statements.values()) {
          try {
            stmt.finalize();
          } catch (error) {
            // Ignore finalization errors
          }
        }
        this.statements.clear();

        // Close database connection
        this.db.close();
        this.db = null;
        this.isInitialized = false;
        
        logger.info('SQLite database connection closed');
      }
    } catch (error) {
      logger.logError(error, {
        operation: 'sqlite-close'
      });
    }
  }

  /**
   * Log an entry to the database logs table
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} context - Log context
   * @param {number} projectId - Optional project ID
   */
  logToDatabase(level, message, context = {}, projectId = null) {
    try {
      this.execute(`
        INSERT INTO logs (level, message, context, project_id, source)
        VALUES (?, ?, ?, ?, ?)
      `, [
        level,
        message,
        JSON.stringify(context),
        projectId,
        'wp-cc-mcp'
      ]);
    } catch (error) {
      // Don't log database logging errors to avoid recursion
      console.error('Failed to log to SQLite database:', error.message);
    }
  }

  /**
   * Clean up old log entries
   * @param {number} daysToKeep - Number of days to keep logs
   * @returns {number} Number of deleted entries
   */
  cleanupLogs(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const info = this.execute(`
        DELETE FROM logs 
        WHERE timestamp < datetime(?)
      `, [cutoffDate.toISOString()]);

      logger.info('SQLite log cleanup completed', {
        deletedEntries: info.changes,
        daysToKeep
      });

      return info.changes;
    } catch (error) {
      logger.logError(error, {
        operation: 'sqlite-cleanup-logs',
        daysToKeep
      });
      throw error;
    }
  }
}

// Export singleton instance
export const sqliteDb = new SQLiteDatabaseManager();

// Auto-initialize on import (lazy initialization)
process.nextTick(async () => {
  try {
    await sqliteDb.initialize();
  } catch (error) {
    console.error('Failed to auto-initialize SQLite database:', error.message);
  }
});