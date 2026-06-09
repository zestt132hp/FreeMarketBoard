#!/usr/bin/env node
/**
 * CLI utility for managing database migrations
 * 
 * Commands:
 *   migrate:status              - Show status of all migrations
 *   migrate:status --name=X     - Show status of specific migration
 *   migrate:up                  - Apply all pending migrations
 *   migrate:up --name=X         - Apply specific migration
 *   migrate:down --count=N      - Rollback last N migrations
 *   migrate:down --name=X       - Rollback specific migration
 *   migrate:init                - Initialize migrations table
 */

import * as path from 'path';
import * as fs from 'fs';
import { MigrationRunner } from '../server/migration-runner';
import { MigrationConfig, MigrationStatusInfo } from '../server/migration-types';

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

// Parse command line arguments
function parseArgs(): { command: string; args: Record<string, string> } {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const parsedArgs: Record<string, string> = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      parsedArgs[key] = value || 'true';
    }
  }

  return { command, args: parsedArgs };
}

// Format table for console output
function formatTable(rows: MigrationStatusInfo[]): string {
  if (rows.length === 0) {
    return 'No migrations found.';
  }

  const headers = ['Ver', 'Name', 'Status', 'Applied At'];
  const columns = [
    rows.map(r => r.version),
    rows.map(r => r.name),
    rows.map(r => r.status),
    rows.map(r => r.appliedAt ? new Date(r.appliedAt).toLocaleString('ru-RU') : '-'),
  ];

  // Calculate column widths
  const widths = headers.map((h, i) => {
    const colWidth = Math.max(...columns[i].map(c => c.length), h.length);
    return Math.max(colWidth, 5); // Minimum width of 5
  });

  // Build table
  let table = '';
  
  // Header
  table += '┌' + widths.map(w => '─'.repeat(w)).join('┬') + '┐\n';
  table += '│' + headers.map((h, i) => h.padEnd(widths[i])).join('│') + '│\n';
  table += '├' + widths.map(w => '─'.repeat(w)).join('┼') + '┤\n';
  
  // Rows
  for (let i = 0; i < rows.length; i++) {
    const row = columns.map((col, j) => col[i].padEnd(widths[j]));
    table += '│' + row.join('│') + '│\n';
  }
  
  table += '└' + widths.map(w => '─'.repeat(w)).join('┴') + '┘\n';

  return table;
}

// Show help
function showHelp(): void {
  console.log(`
Migration CLI Utility
=====================

Commands:
  migrate:status                    Show status of all migrations
  migrate:status --name=<version_name>  Show status of specific migration
  migrate:up                        Apply all pending migrations
  migrate:up --name=<version_name>  Apply specific migration
  migrate:down --count=<N>          Rollback last N migrations
  migrate:down --name=<version_name>  Rollback specific migration
  migrate:init                      Initialize migrations table

Examples:
  npm run migrate:status
  npm run migrate:status -- --name=0008_create_migrations_table
  npm run migrate:up
  npm run migrate:down -- --count=1
  npm run migrate:init
`);
}

// Main function
async function main(): Promise<void> {
  loadEnv();

  const { command, args } = parseArgs();

  // Get configuration from environment
  const config: MigrationConfig = {
    connectionString: process.env.DATABASE_URL || 'postgres://admin:StrongPass123!@localhost:5432/freemarketboards',
    migrationsFolder: process.env.MIGRATIONS_FOLDER || path.join(process.cwd(), 'migrations'),
    logLevel: (process.env.LOG_LEVEL as 'Debug' | 'Information' | 'Warning' | 'Error') || 'Information',
    autoApplyOnStart: process.env.AUTO_APPLY_MIGRATIONS === 'true',
  };

  const runner = new MigrationRunner(config);

  try {
    switch (command) {
      case 'migrate:status': {
        await runner.initialize();
        const status = await runner.getStatus();
        
        const applied = status.filter(s => s.status === 'Applied').length;
        const pending = status.filter(s => s.status === 'Pending').length;

        console.log('\nMigration Status');
        console.log('================');
        console.log(`Total migrations: ${status.length}`);
        console.log(`Applied: ${applied}`);
        console.log(`Pending: ${pending}\n`);

        if (args.name) {
          // Show specific migration status
          const specificStatus = await runner.getMigrationStatus(args.name);
          
          if (specificStatus) {
            console.log(`Migration: ${specificStatus.version}_${specificStatus.name}`);
            console.log('='.repeat(50));
            console.log(`Status: ${specificStatus.status}`);
            console.log(`Applied At: ${specificStatus.appliedAt ? new Date(specificStatus.appliedAt).toLocaleString('ru-RU') : '-'}`);
            console.log(`File Path: ${specificStatus.filePath || 'N/A'}`);
            
            // Try to read and show SQL preview
            if (specificStatus.filePath && fs.existsSync(specificStatus.filePath)) {
              const content = fs.readFileSync(specificStatus.filePath, 'utf-8');
              const upMatch = content.match(/--\s*UP:?\s*(.+?)(?=--\s*DOWN:|$)/is);
              const downMatch = content.match(/--\s*DOWN:?\s*(.+?)(?=--\s*UP:|$)/is);
              
              if (upMatch) {
                console.log('\nUP SQL (preview):');
                console.log(upMatch[1].trim().substring(0, 200) + '...');
              }
              if (downMatch) {
                console.log('\nDOWN SQL (preview):');
                console.log(downMatch[1].trim().substring(0, 200) + '...');
              }
            }
          } else {
            console.log(`Migration "${args.name}" not found.`);
          }
        } else {
          // Show all migrations status
          console.log('Migration History:');
          console.log(formatTable(status));
        }
        break;
      }

      case 'migrate:up': {
        await runner.initialize();
        
        if (args.name) {
          // Apply specific migration
          const migrations = await runner.getMigrationFiles();
          const migration = migrations.find(m => `${m.version}_${m.name}` === args.name);
          
          if (!migration) {
            console.log(`Migration "${args.name}" not found.`);
            process.exit(1);
          }
          
          const result = await runner.applyMigration(migration);
          
          if (!result.success) {
            console.log(`Failed to apply migration: ${result.error}`);
            process.exit(1);
          }
        } else {
          // Apply all pending migrations
          const count = await runner.applyAllMigrations();
          console.log(`\nApplied ${count} migration(s).`);
        }
        break;
      }

      case 'migrate:down': {
        await runner.initialize();
        
        if (args.name) {
          // Rollback specific migration
          const result = await runner.rollbackMigrationByName(args.name);
          
          if (!result.success) {
            console.log(`Failed to rollback migration: ${result.error}`);
            process.exit(1);
          }
        } else {
          // Rollback last N migrations
          const count = parseInt(args.count) || 1;
          const rolledBack = await runner.rollbackMigrations(count);
          console.log(`\nRolled back ${rolledBack} migration(s).`);
        }
        break;
      }

      case 'migrate:init': {
        await runner.initialize();
        
        // Check if we should also register existing migrations
        const applied = await runner.getAppliedMigrations();
        
        if (applied.length === 0) {
          console.log('\nMigrations table initialized.');
          console.log('Run "npm run migrate:status" to see migration status.');
        } else {
          console.log(`\nMigrations table already exists with ${applied.length} migration(s).`);
        }
        break;
      }

      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    await runner.close();
  }
}

// Run main function
main().catch(console.error);
