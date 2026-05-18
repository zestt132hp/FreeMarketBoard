#!/usr/bin/env node
import pkg from 'pg';
const { Pool } = pkg;
import * as path from 'path';
import * as fs from 'fs';

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
  const connectionString = process.env.DATABASE_URL || 'postgres://admin:StrongPass123!@localhost:5432/freemarketboards';
  
  const pool = new Pool({ connectionString });
  
  try {
    // Test 1: Check table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '_migrations'
      );
    `);
    console.log('Test 1 - Table exists:', tableCheck.rows[0].exists);
    
    // Test 2: Count records
    const count = await pool.query('SELECT COUNT(*) FROM _migrations');
    console.log('Test 2 - Record count:', count.rows[0].count);
    
    // Test 3: Get all records
    const records = await pool.query('SELECT * FROM _migrations ORDER BY id');
    console.log('Test 3 - Records:', records.rows);
    
    // Test 4: Check specific migration
    const migration0008 = await pool.query(
      "SELECT * FROM _migrations WHERE migration_name = '0008_create_migrations_table'"
    );
    console.log('Test 4 - Migration 0008:', migration0008.rows[0] || 'NOT FOUND');
    
    // Test 5: Try to query with double quotes
    const quotedQuery = await pool.query('SELECT * FROM "_migrations" ORDER BY id');
    console.log('Test 5 - Quoted query records:', quotedQuery.rows);
    
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  } finally {
    await pool.end();
  }
}

main();
