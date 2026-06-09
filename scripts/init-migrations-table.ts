#!/usr/bin/env node
/**
 * Initialize migrations table and register existing migrations (0001-0007)
 * 
 * This script:
 * 1. Creates the _migrations table
 * 2. Scans existing migration files (0001-0007)
 * 3. Calculates hash for each migration
 * 4. Registers them in the _migrations table
 */

import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import pkg from 'pg';
const { Pool } = pkg;

// Load environment variables
function loadEnv(): void {
  const envPath = path.join(process.cwd(), '.env');
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    });
  }
}

// Calculate hash of normalized SQL
function calculateHash(sql: string): string {
  const normalized = sql
    .replace(/--.*$/gm, '') // Remove comments
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .trim()
    .toLowerCase();

  return crypto.createHash('sha256').update(normalized).digest('hex');
}

// Parse migration file to extract SQL content
function parseMigrationFile(filePath: string): { upSql: string; description?: string } {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // For legacy migrations (0001-0007), use entire file as UP section
  const upMatch = content.match(/--\s*UP:?\s*(.+?)(?=--\s*DOWN:|$)/is);
  
  if (upMatch) {
    const description = upMatch[0].replace(/--\s*UP:?\s*/i, '').split('\n')[0].trim();
    return {
      upSql: upMatch[1].trim(),
      description: description || undefined,
    };
  }
  
  // No UP section found, use entire file
  return {
    upSql: content.trim(),
  };
}

async function main(): Promise<void> {
  loadEnv();

  const connectionString = process.env.DATABASE_URL || 'postgres://admin:StrongPass123!@localhost:5432/freemarketboards';
  const migrationsFolder = process.env.MIGRATIONS_FOLDER || path.join(process.cwd(), 'migrations');

  console.log('Initializing migrations table...');
  console.log(`Database: ${connectionString.split('@').pop()}`);
  console.log(`Migrations folder: ${migrationsFolder}`);

  const pool = new Pool({ connectionString });

  try {
    // Step 1: Create _migrations table
    console.log('\n[1/4] Creating _migrations table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sql_hash VARCHAR(64) NOT NULL,
        description TEXT
      )
    `);

    await pool.query('CREATE INDEX IF NOT EXISTS idx_migrations_applied_at ON _migrations(applied_at)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_migrations_name ON _migrations(migration_name)');

    console.log('✓ _migrations table created');

    // Step 2: Scan existing migration files (legacy: 0001-0007)
    console.log('\n[2/4] Scanning existing migration files...');
    
    const files = fs
      .readdirSync(migrationsFolder)
      .filter(file => file.endsWith('.sql'))
      .filter(file => {
        const num = file.match(/^(\d+)/);
        return num && parseInt(num[1]) <= 7; // Only legacy migrations
      })
      .sort();

    console.log(`Found ${files.length} legacy migration file(s): ${files.join(', ')}`);

    // Step 3: Check which migrations are already registered
    console.log('\n[3/4] Checking existing registrations...');
    
    const result = await pool.query<{ migration_name: string }>(
      'SELECT migration_name FROM _migrations ORDER BY id'
    );
    
    const registeredNames = new Set(result.rows.map(r => r.migration_name));
    console.log(`Already registered: ${registeredNames.size} migration(s)`);

    // Step 4: Register missing migrations
    console.log('\n[4/4] Registering missing migrations...');
    
    let registeredCount = 0;

    for (const file of files) {
      const fileName = file.replace('.sql', '');
      const migrationFullName = fileName.replace(/_/g, '_'); // Keep original format
      
      if (registeredNames.has(migrationFullName)) {
        console.log(`  ⊘ ${fileName} - already registered`);
        continue;
      }

      const filePath = path.join(migrationsFolder, file);
      const { upSql, description } = parseMigrationFile(filePath);
      const hash = calculateHash(upSql);

      await pool.query(
        `INSERT INTO _migrations (migration_name, sql_hash, description)
         VALUES ($1, $2, $3)`,
        [migrationFullName, hash, description || null]
      );

      console.log(`  ✓ ${fileName} - registered (hash: ${hash.substring(0, 8)}...)`);
      registeredCount++;
    }

    console.log(`\n✓ Initialization complete!`);
    console.log(`  Registered ${registeredCount} new migration(s)`);
    console.log(`  Total migrations in table: ${registeredNames.size + registeredCount}`);

    // Show summary
    const finalResult = await pool.query<{ 
      migration_name: string; 
      applied_at: Date; 
      sql_hash: string;
      description: string;
    }>('SELECT migration_name, applied_at, sql_hash, description FROM _migrations ORDER BY id');

    console.log('\nMigration History:');
    console.log('─'.repeat(80));
    
    for (const row of finalResult.rows) {
      const date = new Date(row.applied_at).toLocaleString('ru-RU');
      const desc = row.description ? ` - ${row.description}` : '';
      console.log(`  ${row.migration_name.padEnd(35)} | ${date} | ${row.sql_hash.substring(0, 12)}...${desc}`);
    }

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
