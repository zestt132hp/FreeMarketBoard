import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use hardcoded connection string for localhost
const DATABASE_URL = "postgres://admin:StrongPass123!@localhost:5432/freemarketboards";

// Parse database URL to get database name
const dbUrl = new URL(DATABASE_URL);
const dbName = dbUrl.pathname.slice(1);

async function createDatabaseIfNotExists() {
  // Connect to postgres database to create the target database
  const postgresUrl = new URL(DATABASE_URL);
  postgresUrl.pathname = '/postgres';
  
  const pool = new Pool({ connectionString: postgresUrl.toString() });
  
  try {
    // Check if database exists
    const result = await pool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );
    
    if (result.rows.length === 0) {
      console.log(`Creating database "${dbName}"...`);
      await pool.query(`CREATE DATABASE "${dbName}"`);
      console.log('Database created successfully!');
    } else {
      console.log(`Database "${dbName}" already exists.`);
    }
  } catch (error) {
    console.error('Error creating database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

async function applyMigration() {
  // First ensure database exists
  await createDatabaseIfNotExists();
  
  // Now connect to the target database
  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool);

  // Read the SQL migration file
  const migrationPath = join(__dirname, '..', 'migrations', '0007_add_orders_and_addresses.sql');
  const sqlContent = readFileSync(migrationPath, 'utf-8');

  console.log('Applying migration 0007_add_orders_and_addresses.sql...');

  try {
    // Execute the SQL
    await pool.query(sqlContent);
    console.log('Migration applied successfully!');
    
    // Verify the tables
    const addressesResult = await pool.query('SELECT COUNT(*) FROM addresses');
    const ordersResult = await pool.query('SELECT COUNT(*) FROM orders');
    const orderItemsResult = await pool.query('SELECT COUNT(*) FROM order_items');
    
    console.log(`Addresses: ${addressesResult.rows[0].count}`);
    console.log(`Orders: ${ordersResult.rows[0].count}`);
    console.log(`Order Items: ${orderItemsResult.rows[0].count}`);
  } catch (error) {
    console.error('Error applying migration:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

applyMigration().catch(console.error);
