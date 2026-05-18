import pkg from 'pg';
const { Pool, PoolClient } = pkg;
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  MigrationConfig,
  Migration,
  MigrationInfo,
  MigrationStatusInfo,
  MigrationResult,
} from './migration-types';

/**
 * Migration Runner - manages database migrations
 * Similar to EF Core Migrations in .NET
 */
export class MigrationRunner {
  private config: MigrationConfig;
  private pool: Pool;

  constructor(config: MigrationConfig) {
    this.config = config;
    this.pool = new Pool({ connectionString: config.connectionString });
  }

  /**
   * Log message based on log level
   */
  private log(message: string, level: 'Debug' | 'Information' | 'Warning' | 'Error' = 'Information'): void {
    const levels = ['Debug', 'Information', 'Warning', 'Error'];
    const configLevelIndex = levels.indexOf(this.config.logLevel);
    const messageLevelIndex = levels.indexOf(level);

    if (messageLevelIndex >= configLevelIndex) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${level}] ${message}`);
    }
  }

  /**
   * Calculate hash of normalized SQL
   */
  private calculateHash(sql: string): string {
    // Normalize SQL: remove extra whitespace, convert to lowercase
    const normalized = sql
      .replace(/--.*$/gm, '') // Remove comments
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .trim()
      .toLowerCase();

    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Parse migration file to extract UP and DOWN sections
   */
  private parseMigrationFile(filePath: string): Migration {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath, '.sql');

    // Extract version and name from filename (e.g., "0008_create_migrations_table")
    const match = fileName.match(/^(\d+)_(.+)$/);
    if (!match) {
      throw new Error(`Invalid migration filename format: ${fileName}`);
    }

    const version = match[1];
    const name = match[2];

    // Parse UP and DOWN sections
    const upMatch = content.match(/--\s*UP:?\s*(.+?)(?=--\s*DOWN:|$)/is);
    const downMatch = content.match(/--\s*DOWN:?\s*(.+?)(?=--\s*UP:|$)/is);

    if (!upMatch) {
      throw new Error(`No UP section found in migration: ${fileName}`);
    }

    const upSql = upMatch[1].trim();
    const downSql = downMatch ? downMatch[1].trim() : '';
    const description = upMatch[0].replace(/--\s*UP:?\s*/i, '').split('\n')[0].trim();

    return {
      version,
      name,
      filePath,
      upSql,
      downSql,
      hash: this.calculateHash(upSql),
      description: description || undefined,
    };
  }

  /**
   * Initialize migrations table
   */
  async initialize(): Promise<void> {
    this.log('Initializing migrations table...', 'Debug');

    const client = await this.pool.connect();

    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS _migrations (
          id SERIAL PRIMARY KEY,
          migration_name VARCHAR(255) NOT NULL UNIQUE,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          sql_hash VARCHAR(64) NOT NULL,
          description TEXT
        )
      `);

      await client.query('CREATE INDEX IF NOT EXISTS idx_migrations_applied_at ON _migrations(applied_at)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_migrations_name ON _migrations(migration_name)');

      this.log('Migrations table initialized successfully', 'Information');
    } finally {
      client.release();
    }
  }

  /**
   * Get all applied migrations from database
   */
  async getAppliedMigrations(): Promise<MigrationInfo[]> {
    this.log('Fetching applied migrations...', 'Debug');

    const client = await this.pool.connect();

    try {
      const result = await client.query<MigrationInfo>(
        'SELECT id, migration_name, applied_at, sql_hash, description FROM _migrations ORDER BY id'
      );

      return result.rows.map(row => ({
        id: row.id,
        migrationName: row.migration_name,
        appliedAt: new Date(row.applied_at),
        sqlHash: row.sql_hash,
        description: row.description,
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Get all migration files from folder
   */
  async getMigrationFiles(): Promise<Migration[]> {
    this.log(`Scanning migrations folder: ${this.config.migrationsFolder}`, 'Debug');

    const files = fs
      .readdirSync(this.config.migrationsFolder)
      .filter(file => file.endsWith('.sql') && !file.startsWith('_'))
      .sort();

    const migrations: Migration[] = [];

    for (const file of files) {
      // Skip migration 0008 if it's the current initialization migration
      const filePath = path.join(this.config.migrationsFolder, file);
      const stat = fs.statSync(filePath);

      if (stat.isFile()) {
        try {
          const migration = this.parseMigrationFile(filePath);
          migrations.push(migration);
          this.log(`Parsed migration: ${migration.version}_${migration.name}`, 'Debug');
        } catch (error) {
          this.log(`Error parsing migration ${file}: ${error}`, 'Warning');
        }
      }
    }

    return migrations;
  }

  /**
   * Get pending migrations (files not in database)
   */
  async getPendingMigrations(): Promise<Migration[]> {
    const applied = await this.getAppliedMigrations();
    const appliedNames = new Set(applied.map(m => m.migrationName));
    const allMigrations = await this.getMigrationFiles();

    return allMigrations.filter(m => !appliedNames.has(`${m.version}_${m.name}`));
  }

  /**
   * Apply single migration in transaction
   */
  async applyMigration(migration: Migration): Promise<MigrationResult> {
    this.log(`Applying migration: ${migration.version}_${migration.name}`, 'Information');

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Execute UP SQL
      await client.query(migration.upSql);

      // Record migration in _migrations table
      await client.query(
        `INSERT INTO _migrations (migration_name, sql_hash, description)
         VALUES ($1, $2, $3)`,
        [`${migration.version}_${migration.name}`, migration.hash, migration.description]
      );

      await client.query('COMMIT');

      this.log(`Migration ${migration.version}_${migration.name} applied successfully`, 'Information');

      return {
        success: true,
        migrationName: `${migration.version}_${migration.name}`,
        executedAt: new Date(),
      };
    } catch (error) {
      await client.query('ROLLBACK');

      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`Migration ${migration.version}_${migration.name} failed: ${errorMessage}`, 'Error');

      return {
        success: false,
        migrationName: `${migration.version}_${migration.name}`,
        error: errorMessage,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Rollback single migration in transaction
   */
  async rollbackMigration(migrationName: string): Promise<MigrationResult> {
    this.log(`Rolling back migration: ${migrationName}`, 'Information');

    const client = await this.pool.connect();

    try {
      // Find the migration file
      const migrations = await this.getMigrationFiles();
      const migration = migrations.find(
        m => `${m.version}_${m.name}` === migrationName
      );

      if (!migration) {
        throw new Error(`Migration file not found for: ${migrationName}`);
      }

      if (!migration.downSql) {
        throw new Error(`No DOWN section found in migration: ${migrationName}`);
      }

      await client.query('BEGIN');

      // Execute DOWN SQL
      await client.query(migration.downSql);

      // Remove migration record from _migrations table
      await client.query(
        'DELETE FROM _migrations WHERE migration_name = $1',
        [migrationName]
      );

      await client.query('COMMIT');

      this.log(`Migration ${migrationName} rolled back successfully`, 'Information');

      return {
        success: true,
        migrationName,
        executedAt: new Date(),
      };
    } catch (error) {
      await client.query('ROLLBACK');

      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`Rollback of ${migrationName} failed: ${errorMessage}`, 'Error');

      return {
        success: false,
        migrationName,
        error: errorMessage,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Apply all pending migrations
   */
  async applyAllMigrations(): Promise<number> {
    this.log('Checking for pending migrations...', 'Information');

    // First ensure migrations table exists
    await this.initialize();

    const pending = await this.getPendingMigrations();

    if (pending.length === 0) {
      this.log('No pending migrations', 'Information');
      return 0;
    }

    this.log(`Found ${pending.length} pending migration(s)`, 'Information');

    let appliedCount = 0;

    for (const migration of pending) {
      const result = await this.applyMigration(migration);

      if (result.success) {
        appliedCount++;
      } else {
        // Stop on first failure
        this.log('Stopping migration process due to error', 'Error');
        break;
      }
    }

    this.log(`Applied ${appliedCount} of ${pending.length} migration(s)`, 'Information');

    return appliedCount;
  }

  /**
   * Rollback last N migrations
   */
  async rollbackMigrations(count: number): Promise<number> {
    this.log(`Rolling back last ${count} migration(s)...`, 'Information');

    const applied = await this.getAppliedMigrations();

    if (applied.length === 0) {
      this.log('No migrations to rollback', 'Warning');
      return 0;
    }

    // Get last N migrations in reverse order
    const toRollback = applied.slice(-count).reverse();

    let rolledBackCount = 0;

    for (const migration of toRollback) {
      const result = await this.rollbackMigration(migration.migrationName);

      if (result.success) {
        rolledBackCount++;
      } else {
        // Stop on first failure
        this.log('Stopping rollback process due to error', 'Error');
        break;
      }
    }

    this.log(`Rolled back ${rolledBackCount} of ${toRollback.length} migration(s)`, 'Information');

    return rolledBackCount;
  }

  /**
   * Rollback specific migration by name
   */
  async rollbackMigrationByName(migrationName: string): Promise<MigrationResult> {
    return this.rollbackMigration(migrationName);
  }

  /**
   * Get migration status
   */
  async getStatus(): Promise<MigrationStatusInfo[]> {
    const applied = await this.getAppliedMigrations();
    const appliedMap = new Map(applied.map(m => [m.migrationName, m]));

    const allMigrations = await this.getMigrationFiles();

    return allMigrations.map(migration => {
      const migrationFullName = `${migration.version}_${migration.name}`;
      const appliedInfo = appliedMap.get(migrationFullName);

      return {
        version: migration.version,
        name: migration.name,
        status: appliedInfo ? 'Applied' : 'Pending',
        appliedAt: appliedInfo?.appliedAt,
        hash: appliedInfo?.sql_hash,
        filePath: migration.filePath,
      };
    });
  }

  /**
   * Get status of specific migration
   */
  async getMigrationStatus(migrationName: string): Promise<MigrationStatusInfo | null> {
    const status = await this.getStatus();
    return status.find(s => `${s.version}_${s.name}` === migrationName) || null;
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
    this.log('Database connection closed', 'Debug');
  }
}
