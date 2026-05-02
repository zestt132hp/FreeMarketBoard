-- Create specification_templates table
CREATE TABLE IF NOT EXISTS specification_templates (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL,
  required BOOLEAN DEFAULT false,
  placeholder TEXT,
  UNIQUE(category_id, key)
);

-- Create index for faster lookups by category
CREATE INDEX IF NOT EXISTS idx_spec_templates_category ON specification_templates(category_id);

-- Create specification_options table
CREATE TABLE IF NOT EXISTS specification_options (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL REFERENCES specification_templates(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

-- Create index for faster lookups by template
CREATE INDEX IF NOT EXISTS idx_spec_options_template ON specification_options(template_id);

-- Create ad_specifications table
CREATE TABLE IF NOT EXISTS ad_specifications (
  id SERIAL PRIMARY KEY,
  ad_id INTEGER NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  template_id INTEGER NOT NULL REFERENCES specification_templates(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  UNIQUE(ad_id, template_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_ad_specs_ad ON ad_specifications(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_specs_template ON ad_specifications(template_id);

-- Create composite index for filtering by template and value
CREATE INDEX IF NOT EXISTS idx_ad_specs_template_value ON ad_specifications(template_id, value);
