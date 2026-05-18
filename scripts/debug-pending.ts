#!/usr/bin/env node
import pkg from 'pg';
const { Pool } = pkg;
import * as path from 'path';
import * as fs from 'fs';
import { MigrationRunner } from '../server/migration-runner.js';
import type { MigrationConfig } from '../server/migration-types.js';

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

async function main(): Promise<void> {
  const config: MigrationConfig = {
    connectionString: process.env.DATABASE_URL || 'postgres://admin:StrongPass123!@localhost:5432/freemarketboards',
    migrationsFolder: process.env.MIGRATIONS_FOLDER || './migrations',
    logLevel: 'Debug',
    autoApplyOnStart: false,
  };
  
  const runner = new MigrationRunner(config);
  
  try {
    await runner.initialize();
    
    const applied = await runner.getAppliedMigrations();
    console.log('Applied migrations:', applied.map(m => m.migrationName));
    
    const allMigrations = await runner.getMigrationFiles();
    console.log('All migration files:', allMigrations.map(m => `${m.version}_${m.name}`));
    
    const pending = await runner.getPendingMigrations();
    console.log('Pending migrations:', pending.map(m => `${m.version}_${m.name}`));
    
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  } finally {
    await runner.close();
  }
}

main();
