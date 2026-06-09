-- UP:
-- Гарантированное добавление ON DELETE CASCADE для ad_specifications
-- Эта миграция решает проблему с удалением объявлений, которые имеют спецификации
-- Миграция 0009 могла не сработать корректно, поэтому создаём новую миграцию

-- Проверяем и удаляем существующее ограничение на ad_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ad_specifications_ad_id_ads_id_fk'
        AND table_name = 'ad_specifications'
    ) THEN
        ALTER TABLE ad_specifications DROP CONSTRAINT ad_specifications_ad_id_ads_id_fk;
    END IF;
END $$;

-- Добавляем новое ограничение с ON DELETE CASCADE
ALTER TABLE ad_specifications
ADD CONSTRAINT ad_specifications_ad_id_ads_id_fk
FOREIGN KEY (ad_id) REFERENCES ads(id) ON DELETE CASCADE;

-- DOWN: Вернуть ограничение без CASCADE
ALTER TABLE ad_specifications DROP CONSTRAINT ad_specifications_ad_id_ads_id_fk;

ALTER TABLE ad_specifications
ADD CONSTRAINT ad_specifications_ad_id_ads_id_fk
FOREIGN KEY (ad_id) REFERENCES ads(id);
