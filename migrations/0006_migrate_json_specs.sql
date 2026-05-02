-- Migration: Migrate JSON specifications from ads table to ad_specifications table
-- The specifications field contains a JSON string stored as JSONB
-- We need to extract the string value and parse it again as JSONB

-- Step 1: Add UNIQUE constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'ad_specifications' 
    AND constraint_name = 'ad_specifications_ad_id_template_id_key'
    AND constraint_type = 'UNIQUE'
  ) THEN
    ALTER TABLE ad_specifications 
    ADD CONSTRAINT ad_specifications_ad_id_template_id_key 
    UNIQUE (ad_id, template_id);
    RAISE NOTICE 'Added UNIQUE constraint to ad_specifications';
  END IF;
END $$;

-- Step 2: Migrate data
DO $$
DECLARE
  ad_record RECORD;
  spec_key TEXT;
  spec_value TEXT;
  template_id INTEGER;
  json_data JSONB;
BEGIN
  -- Loop through all ads that have specifications
  FOR ad_record IN SELECT id, category_id, specifications FROM ads WHERE specifications IS NOT NULL AND specifications != ''
  LOOP
    BEGIN
      -- Extract the JSON string from the JSONB wrapper and parse it as JSONB
      -- specifications::jsonb #>> '{}' extracts the text value
      -- ::jsonb parses it as a JSONB object
      json_data := (ad_record.specifications::jsonb #>> '{}')::jsonb;
      
      -- Loop through each key-value pair in the JSON
      FOR spec_key, spec_value IN SELECT key, value::text FROM jsonb_each_text(json_data)
      LOOP
        -- Find the template_id for this spec key and category
        SELECT id INTO template_id 
        FROM specification_templates 
        WHERE category_id = ad_record.category_id AND key = spec_key;
        
        -- If template found, insert the specification value
        IF template_id IS NOT NULL THEN
          INSERT INTO ad_specifications (ad_id, template_id, value)
          VALUES (ad_record.id, template_id, spec_value)
          ON CONFLICT (ad_id, template_id) DO UPDATE SET value = EXCLUDED.value;
        END IF;
      END LOOP;
      
      RAISE NOTICE 'Migrated ad_id=%', ad_record.id;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue with next ad
      RAISE NOTICE 'Error processing ad_id=%: %', ad_record.id, SQLERRM;
    END;
  END LOOP;
END $$;
