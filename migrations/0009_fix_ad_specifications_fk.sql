-- UP:
-- Fix ad_specifications foreign key to add ON DELETE CASCADE
-- This migration fixes the issue where deleting an ad fails due to foreign key constraint
-- from ad_specifications table referencing the ad.

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE ad_specifications 
DROP CONSTRAINT IF EXISTS ad_specifications_ad_id_ads_id_fk;

-- Step 2: Add the foreign key constraint with ON DELETE CASCADE
ALTER TABLE ad_specifications
ADD CONSTRAINT ad_specifications_ad_id_ads_id_fk
FOREIGN KEY (ad_id) REFERENCES ads(id) ON DELETE CASCADE;

-- Step 3: Also ensure the template_id foreign key has ON DELETE CASCADE
ALTER TABLE ad_specifications 
DROP CONSTRAINT IF EXISTS ad_specifications_template_id_specification_templates_id_fk;

ALTER TABLE ad_specifications
ADD CONSTRAINT ad_specifications_template_id_specification_templates_id_fk
FOREIGN KEY (template_id) REFERENCES specification_templates(id) ON DELETE CASCADE;

-- DOWN: Revert to original constraints without CASCADE
ALTER TABLE ad_specifications 
DROP CONSTRAINT IF EXISTS ad_specifications_ad_id_ads_id_fk;

ALTER TABLE ad_specifications
ADD CONSTRAINT ad_specifications_ad_id_ads_id_fk
FOREIGN KEY (ad_id) REFERENCES ads(id);

ALTER TABLE ad_specifications 
DROP CONSTRAINT IF EXISTS ad_specifications_template_id_specification_templates_id_fk;

ALTER TABLE ad_specifications
ADD CONSTRAINT ad_specifications_template_id_specification_templates_id_fk
FOREIGN KEY (template_id) REFERENCES specification_templates(id);
