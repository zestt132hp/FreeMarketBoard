-- Migrate existing JSON specifications to ad_specifications table
-- This migration parses the JSON data from ads.specifications and inserts into ad_specifications

-- Note: This migration assumes that specification_templates have been seeded first (0003_seed_spec_templates.sql)

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
    -- Parse JSON specifications
    BEGIN
      json_data := ad_record.specifications::JSONB;
      
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
          ON CONFLICT (ad_id, template_id) DO NOTHING;
        END IF;
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue with next ad
      RAISE NOTICE 'Error processing ad_id=%: %', ad_record.id, SQLERRM;
    END;
  END LOOP;
END $$;

-- Optional: After successful migration, you can drop the old specifications column
-- Uncomment the following line if you want to remove the old column:
-- ALTER TABLE ads DROP COLUMN specifications;
