#!/usr/bin/env node
import pkg from 'pg';
const { Pool } = pkg;
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
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

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL || 'postgres://admin:StrongPass123!@localhost:5432/freemarketboards';
  
  const pool = new Pool({ connectionString });
  
  try {
    // Check if _migrations table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '_migrations'
      );
    `);
    
    console.log('_migrations table exists:', tableCheck.rows[0].exists);
    
    if (tableCheck.rows[0].exists) {
      // Get table structure
      const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = '_migrations'
        ORDER BY ordinal_position;
      `);
      
      console.log('\n_migrations columns:');
      columns.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable})`);
      });
      
      // Get existing records
      const records = await pool.query('SELECT * FROM _migrations ORDER BY id;');
      
      console.log('\n_migrations records:');
      records.rows.forEach(row => {
        console.log(`  ${row.id}: ${row.migration_name} (hash: ${row.sql_hash}, applied: ${row.applied_at})`);
      });
      
      // Check foreign key constraints on ad_specifications
      const fkCheck = await pool.query(`
        SELECT 
          tc.constraint_name, 
          tc.table_name, 
          kcu.column_name, 
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          rc.delete_rule
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints AS rc
          ON rc.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'ad_specifications'
        AND tc.constraint_type = 'FOREIGN KEY';
      `);
      
      console.log('\nad_specifications foreign keys:');
      fkCheck.rows.forEach(row => {
        console.log(`  ${row.constraint_name}: ${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name} (ON DELETE: ${row.delete_rule})`);
      });
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  } finally {
    await pool.end();
  }
}

main();
