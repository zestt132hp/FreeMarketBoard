-- UP: Create migrations tracking table
-- Creates the _migrations table to track applied migrations with their hashes and timestamps

CREATE TABLE IF NOT EXISTS "_migrations" (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sql_hash VARCHAR(64) NOT NULL,
  description TEXT
);

-- Create index for faster lookups by applied_at
CREATE INDEX IF NOT EXISTS idx_migrations_applied_at ON "_migrations"(applied_at);

-- Create index for faster lookups by migration_name
CREATE INDEX IF NOT EXISTS idx_migrations_name ON "_migrations"(migration_name);

-- DOWN: Drop migrations tracking table
DROP TABLE IF EXISTS "_migrations" CASCADE;
