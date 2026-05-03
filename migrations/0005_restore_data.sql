-- Restore data migration
-- This migration restores categories, specification_templates, and specification_options
-- It uses DELETE instead of TRUNCATE to avoid FK constraint issues
-- It also migrates existing JSON specifications from ads table to ad_specifications table

-- Step 1: Clear all data in reverse dependency order using DELETE
DELETE FROM ad_specifications;
DELETE FROM specification_options;
DELETE FROM specification_templates;

-- Add UNIQUE constraint to ad_specifications if it doesn't exist (required for ON CONFLICT)
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
  END IF;
END $$;

-- Step 2: Insert/Update categories (no delete to preserve FK with ads table)
INSERT INTO categories (id, name, icon, slug, parent_id) VALUES
  (1, 'Электроника', 'smartphone', 'electronics', NULL),
  (2, 'Автомобили', 'car', 'cars', NULL),
  (3, 'Работа', 'briefcase', 'work', NULL),
  (4, 'Одежда и обувь', 'shirt', 'clothing', NULL),
  (5, 'Дом и сад', 'home', 'home', NULL),
  (6, 'Мебель', 'chair', 'furniture', NULL)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  slug = EXCLUDED.slug,
  parent_id = EXCLUDED.parent_id;

-- Reset sequence for categories
SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));

-- Step 3: Reset sequence for specification_templates and insert data
SELECT setval('specification_templates_id_seq', 1, false);

INSERT INTO specification_templates (id, category_id, key, label, type, required, placeholder) VALUES
  -- Electronics (category_id = 1)
  (1, 1, 'brand', 'Бренд', 'text', true, 'Apple, Samsung, Xiaomi'),
  (2, 1, 'model', 'Модель', 'text', true, 'iPhone 14 Pro'),
  (3, 1, 'condition', 'Состояние', 'select', true, NULL),
  (4, 1, 'color', 'Цвет', 'text', false, 'Черный, Белый, Синий'),
  (5, 1, 'weight', 'Вес (г)', 'number', false, '200'),
  (6, 1, 'country', 'Страна производитель', 'text', false, 'Китай, США, Корея'),
  (7, 1, 'warranty', 'Гарантия', 'select', false, NULL),
  
  -- Cars (category_id = 2)
  (8, 2, 'brand', 'Марка', 'text', true, 'Toyota, BMW, Mercedes'),
  (9, 2, 'model', 'Модель', 'text', true, 'Camry, X5, C-Class'),
  (10, 2, 'year', 'Год выпуска', 'number', true, '2020'),
  (11, 2, 'mileage', 'Пробег (км)', 'number', true, '50000'),
  (12, 2, 'engine', 'Двигатель', 'text', false, '2.0L, 3.0L Turbo'),
  (13, 2, 'transmission', 'Коробка передач', 'select', false, NULL),
  (14, 2, 'fuel', 'Топливо', 'select', false, NULL),
  (15, 2, 'color', 'Цвет', 'text', false, 'Черный, Белый, Красный'),
  (16, 2, 'vin', 'VIN номер', 'text', false, 'ABCDE1234567890'),
  
  -- Work (category_id = 3)
  (17, 3, 'position', 'Должность', 'text', true, 'Разработчик, Менеджер, Дизайнер'),
  (18, 3, 'experience', 'Требуемый опыт', 'select', false, NULL),
  (19, 3, 'employment', 'Тип занятости', 'select', false, NULL),
  (20, 3, 'salary', 'Зарплата ($)', 'number', false, '2000'),
  (21, 3, 'schedule', 'График работы', 'text', false, '5/2, сменный, гибкий'),
  (22, 3, 'education', 'Образование', 'select', false, NULL),
  (23, 3, 'skills', 'Ключевые навыки', 'text', false, 'JavaScript, React, Python'),
  
  -- Clothing (category_id = 4)
  (24, 4, 'brand', 'Бренд', 'text', false, 'Nike, Zara, H&M'),
  (25, 4, 'size', 'Размер', 'text', true, 'M, L, XL, 42, 44'),
  (26, 4, 'color', 'Цвет', 'text', true, 'Черный, Белый, Синий'),
  (27, 4, 'material', 'Материал', 'text', false, 'Хлопок, Шерсть, Синтетика'),
  (28, 4, 'condition', 'Состояние', 'select', true, NULL),
  (29, 4, 'season', 'Сезон', 'select', false, NULL),
  (30, 4, 'gender', 'Пол', 'select', false, NULL),
  
  -- Home (category_id = 5)
  (31, 5, 'type', 'Тип товара', 'text', true, 'Мебель, Техника, Текстиль'),
  (32, 5, 'brand', 'Бренд', 'text', false, 'IKEA, Bosch, Samsung'),
  (33, 5, 'material', 'Материал', 'text', false, 'Дерево, Металл, Пластик'),
  (34, 5, 'color', 'Цвет', 'text', false, 'Белый, Коричневый, Черный'),
  (35, 5, 'dimensions', 'Размеры (см)', 'text', false, '100x50x200'),
  (36, 5, 'weight', 'Вес (кг)', 'number', false, '15'),
  (37, 5, 'condition', 'Состояние', 'select', true, NULL),
  (38, 5, 'warranty', 'Гарантия', 'select', false, NULL),
  
  -- Furniture (category_id = 6)
  (39, 6, 'type', 'Тип мебели', 'text', true, 'Диван, Стол, Стул, Шкаф'),
  (40, 6, 'brand', 'Бренд', 'text', false, 'IKEA, Ashley, Ethan Allen'),
  (41, 6, 'material', 'Материал', 'text', true, 'Дерево, Металл, Стекло, Кожа'),
  (42, 6, 'color', 'Цвет', 'text', true, 'Коричневый, Белый, Черный'),
  (43, 6, 'dimensions', 'Размеры (см)', 'text', true, '200x90x80'),
  (44, 6, 'weight', 'Вес (кг)', 'number', false, '50'),
  (45, 6, 'style', 'Стиль', 'select', false, NULL),
  (46, 6, 'condition', 'Состояние', 'select', true, NULL);

-- Reset sequence for specification_templates
SELECT setval('specification_templates_id_seq', (SELECT MAX(id) FROM specification_templates));

-- Step 4: Reset sequence for specification_options and insert data
SELECT setval('specification_options_id_seq', 1, false);

INSERT INTO specification_options (id, template_id, value, sort_order) VALUES
  -- Electronics options (template_id 3, 7)
  (1, 3, 'Новый', 1),
  (2, 3, 'Б/у', 2),
  (3, 3, 'На запчасти', 3),
  (4, 7, 'Есть', 1),
  (5, 7, 'Нет', 2),
  
  -- Cars options (template_id 13, 14)
  (6, 13, 'Автомат', 1),
  (7, 13, 'Механика', 2),
  (8, 13, 'Робот', 3),
  (9, 13, 'Вариатор', 4),
  (10, 14, 'Бензин', 1),
  (11, 14, 'Дизель', 2),
  (12, 14, 'Электричество', 3),
  (13, 14, 'Гибрид', 4),
  
  -- Work options (template_id 19, 20, 23)
  (14, 19, 'Без опыта', 1),
  (15, 19, '1-3 года', 2),
  (16, 19, '3-5 лет', 3),
  (17, 19, '5+ лет', 4),
  (18, 20, 'Полная', 1),
  (19, 20, 'Частичная', 2),
  (20, 20, 'Удаленная', 3),
  (21, 20, 'Проектная', 4),
  (22, 23, 'Не требуется', 1),
  (23, 23, 'Среднее', 2),
  (24, 23, 'Высшее', 3),
  (25, 23, 'Магистратура', 4),
  
  -- Clothing options (template_id 28, 29, 30)
  (26, 28, 'Новый', 1),
  (27, 28, 'Б/у отличное', 2),
  (28, 28, 'Б/у хорошее', 3),
  (29, 28, 'На запчасти', 4),
  (30, 29, 'Лето', 1),
  (31, 29, 'Зима', 2),
  (32, 29, 'Демисезон', 3),
  (33, 29, 'Всесезонный', 4),
  (34, 30, 'Мужской', 1),
  (35, 30, 'Женский', 2),
  (36, 30, 'Унисекс', 3),
  
  -- Home options (template_id 36, 37)
  (37, 37, 'Новый', 1),
  (38, 37, 'Б/у отличное', 2),
  (39, 37, 'Б/у хорошее', 3),
  (40, 37, 'Требует ремонта', 4),
  (41, 38, 'Есть', 1),
  (42, 38, 'Нет', 2),
  
  -- Furniture options (template_id 44, 45)
  (43, 44, 'Современный', 1),
  (44, 44, 'Классический', 2),
  (45, 44, 'Минимализм', 3),
  (46, 44, 'Лофт', 4),
  (47, 45, 'Новый', 1),
  (48, 45, 'Б/у отличное', 2),
  (49, 45, 'Б/у хорошее', 3),
  (50, 45, 'Требует ремонта', 4);

-- Reset sequence for specification_options
SELECT setval('specification_options_id_seq', (SELECT MAX(id) FROM specification_options));

-- Step 5: Migrate existing JSON specifications from ads table to ad_specifications table
-- Note: The specifications field contains a JSON string that needs to be unquoted first
DO $$
DECLARE
  ad_record RECORD;
  spec_key TEXT;
  spec_value TEXT;
  template_id INTEGER;
  json_data JSONB;
  clean_spec TEXT;
BEGIN
  -- Loop through all ads that have specifications
  FOR ad_record IN SELECT id, category_id, specifications FROM ads WHERE specifications IS NOT NULL AND specifications != ''
  LOOP
    -- Parse JSON specifications (handle quoted JSON string)
    BEGIN
      -- Remove surrounding quotes and unescape the JSON string
      clean_spec := trim(both '"' FROM ad_record.specifications);
      clean_spec := replace(clean_spec, '\\"', '"');
      clean_spec := replace(clean_spec, '\\', '\');
      
      -- Parse the cleaned JSON string
      json_data := clean_spec::JSONB;
      
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
