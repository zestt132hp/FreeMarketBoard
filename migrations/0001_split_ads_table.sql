-- Migration: Split ads table into ads, categories, and images

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id INTEGER REFERENCES categories(id)
);

-- Create images table
CREATE TABLE IF NOT EXISTS images (
  id SERIAL PRIMARY KEY,
  path TEXT NOT NULL,
  ad_id INTEGER NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  "order" INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false
);

-- Insert default categories
INSERT INTO categories (id, name, icon, slug, parent_id) VALUES
  (1, 'Electronics', 'laptop', 'electronics', NULL),
  (2, 'Furniture', 'couch', 'furniture', NULL),
  (3, 'Cars', 'car', 'cars', NULL),
  (4, 'Work', 'briefcase', 'work', NULL),
  (5, 'Clothing', 'tshirt', 'clothing', NULL),
  (6, 'Home & Garden', 'home', 'home', NULL)
ON CONFLICT (id) DO NOTHING;

-- Reset sequence for categories
SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));

-- Add category_id column to ads table (if not exists)
ALTER TABLE ads ADD COLUMN IF NOT EXISTS category_id INTEGER;

-- Migrate existing category text values to category_id
-- First, update ads to reference the correct category based on the text value
UPDATE ads SET category_id = (
  SELECT id FROM categories 
  WHERE categories.slug = ads.category
)
WHERE category_id IS NULL;

-- Set category_id to a default value (1 = Electronics) for any remaining ads
UPDATE ads SET category_id = 1 WHERE category_id IS NULL;

-- Add foreign key constraint
ALTER TABLE ads ADD CONSTRAINT ads_category_id_fkey 
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT;

-- Make category_id NOT NULL after migration
ALTER TABLE ads ALTER COLUMN category_id SET NOT NULL;

-- Drop the old category column
ALTER TABLE ads DROP COLUMN IF EXISTS category;

-- Drop the old images array column (if exists)
ALTER TABLE ads DROP COLUMN IF EXISTS images;

-- Create index on category_id for better query performance
CREATE INDEX IF NOT EXISTS ads_category_id_idx ON ads(category_id);

-- Create index on ad_id in images table for better query performance
CREATE INDEX IF NOT EXISTS images_ad_id_idx ON images(ad_id);
