#!/usr/bin/env node
/**
 * Register migration 0008 as applied (since table already exists)
 */
import pkg from 'pg';
const { Pool } = pkg;
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

// Load environment variables
const envPath = path.join(process.cwd(), '.env');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line: string) => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

function calculateHash(sql: string): string {
  // Normalize SQL: remove comments and extra whitespace
  const normalized = sql
    .replace(/--.*$/gm, '') // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .trim()
    .toLowerCase();
  
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL || 'postgres://admin:StrongPass123!@localhost:5432/freemarketboards';
  
  const pool = new Pool({ connectionString });
  
  try {
    // Read migration 0008 file
    const migrationPath = path.join(process.cwd(), 'migrations', '0008_create_migrations_table.sql');
    const migrationContent = fs.readFileSync(migrationPath, 'utf-8');
    
    // Extract UP section - handle both "-- UP:" and "-- UP: description" formats
    const upMatch = migrationContent.match(/-- UP:[^\n]*\n([\s\S]*?)(?=-- DOWN:|$)/);
    if (!upMatch) {
      console.error('No UP section found in migration 0008');
      process.exit(1);
    }
    
    const upSql = upMatch[1].trim();
    const hash = calculateHash(upSql);
    
    // Check if migration is already registered
    const existing = await pool.query(
      'SELECT * FROM _migrations WHERE migration_name = $1',
      ['0008_create_migrations_table']
    );
    
    if (existing.rows.length > 0) {
      console.log('Migration 0008 is already registered');
      return;
    }
    
    // Register migration
    await pool.query(
      'INSERT INTO _migrations (migration_name, sql_hash, applied_at) VALUES ($1, $2, NOW())',
      ['0008_create_migrations_table', hash]
    );
    
    console.log('Migration 0008 registered successfully');
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
