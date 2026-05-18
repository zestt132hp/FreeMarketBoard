/**
 * Configuration for the migration runner
 */
export interface MigrationConfig {
  connectionString: string;
  migrationsFolder: string;
  logLevel: 'Debug' | 'Information' | 'Warning' | 'Error';
  autoApplyOnStart: boolean;
}

/**
 * Information about an applied migration from the database
 */
export interface MigrationInfo {
  id: number;
  migrationName: string;
  appliedAt: Date;
  sqlHash: string;
  description?: string;
}

/**
 * Represents a migration file with parsed UP and DOWN sections
 */
export interface Migration {
  version: string;      // e.g., "0008"
  name: string;         // e.g., "create_migrations_table"
  filePath: string;     // full path to file
  upSql: string;        // UP section SQL
  downSql: string;      // DOWN section SQL
  hash: string;         // normalized SQL hash
  description?: string; // description from UP comment
}

/**
 * Result of a migration operation
 */
export interface MigrationResult {
  success: boolean;
  migrationName: string;
  error?: string;
  executedAt?: Date;
}

/**
 * Status of a migration
 */
export type MigrationStatus = 'Applied' | 'Pending' | 'Failed';

/**
 * Migration status with details
 */
export interface MigrationStatusInfo {
  version: string;
  name: string;
  status: MigrationStatus;
  appliedAt?: Date;
  hash?: string;
  filePath?: string;
}
