import { z } from "zod";

export interface CategorySpec {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  required?: boolean;
  options?: string[];
  placeholder?: string;
}

export interface CategorySpecs {
  [category: string]: CategorySpec[];
}

// Category-specific specifications (using slug as key)
export const categorySpecs: CategorySpecs = {
  electronics: [
    { key: 'brand', label: 'Бренд', type: 'text', required: true, placeholder: 'Apple, Samsung, Xiaomi' },
    { key: 'model', label: 'Модель', type: 'text', required: true, placeholder: 'iPhone 14 Pro' },
    { key: 'condition', label: 'Состояние', type: 'select', required: true, options: ['Новый', 'Б/у', 'На запчасти'] },
    { key: 'color', label: 'Цвет', type: 'text', placeholder: 'Черный, Белый, Синий' },
    { key: 'weight', label: 'Вес (г)', type: 'number', placeholder: '200' },
    { key: 'country', label: 'Страна производитель', type: 'text', placeholder: 'Китай, США, Корея' },
    { key: 'warranty', label: 'Гарантия', type: 'select', options: ['Есть', 'Нет'] },
  ],
  
  cars: [
    { key: 'brand', label: 'Марка', type: 'text', required: true, placeholder: 'Toyota, BMW, Mercedes' },
    { key: 'model', label: 'Модель', type: 'text', required: true, placeholder: 'Camry, X5, C-Class' },
    { key: 'year', label: 'Год выпуска', type: 'number', required: true, placeholder: '2020' },
    { key: 'mileage', label: 'Пробег (км)', type: 'number', required: true, placeholder: '50000' },
    { key: 'engine', label: 'Двигатель', type: 'text', placeholder: '2.0L, 3.0L Turbo' },
    { key: 'transmission', label: 'Коробка передач', type: 'select', options: ['Автомат', 'Механика', 'Робот', 'Вариатор'] },
    { key: 'fuel', label: 'Топливо', type: 'select', options: ['Бензин', 'Дизель', 'Электричество', 'Гибрид'] },
    { key: 'color', label: 'Цвет', type: 'text', placeholder: 'Черный, Белый, Красный' },
    { key: 'vin', label: 'VIN номер', type: 'text', placeholder: 'ABCDE1234567890' },
  ],
  
  work: [
    { key: 'position', label: 'Должность', type: 'text', required: true, placeholder: 'Разработчик, Менеджер, Дизайнер' },
    { key: 'experience', label: 'Требуемый опыт', type: 'select', options: ['Без опыта', '1-3 года', '3-5 лет', '5+ лет'] },
    { key: 'employment', label: 'Тип занятости', type: 'select', options: ['Полная', 'Частичная', 'Удаленная', 'Проектная'] },
    { key: 'salary', label: 'Зарплата ($)', type: 'number', placeholder: '2000' },
    { key: 'schedule', label: 'График работы', type: 'text', placeholder: '5/2, сменный, гибкий' },
    { key: 'education', label: 'Образование', type: 'select', options: ['Не требуется', 'Среднее', 'Высшее', 'Магистратура'] },
    { key: 'skills', label: 'Ключевые навыки', type: 'text', placeholder: 'JavaScript, React, Python' },
  ],
  
  clothing: [
    { key: 'brand', label: 'Бренд', type: 'text', placeholder: 'Nike, Zara, H&M' },
    { key: 'size', label: 'Размер', type: 'text', required: true, placeholder: 'M, L, XL, 42, 44' },
    { key: 'color', label: 'Цвет', type: 'text', required: true, placeholder: 'Черный, Белый, Синий' },
    { key: 'material', label: 'Материал', type: 'text', placeholder: 'Хлопок, Шерсть, Синтетика' },
    { key: 'condition', label: 'Состояние', type: 'select', required: true, options: ['Новый', 'Б/у отличное', 'Б/у хорошее', 'На запчасти'] },
    { key: 'season', label: 'Сезон', type: 'select', options: ['Лето', 'Зима', 'Демисезон', 'Всесезонный'] },
    { key: 'gender', label: 'Пол', type: 'select', options: ['Мужской', 'Женский', 'Унисекс'] },
  ],
  
  home: [
    { key: 'type', label: 'Тип товара', type: 'text', required: true, placeholder: 'Мебель, Техника, Текстиль' },
    { key: 'brand', label: 'Бренд', type: 'text', placeholder: 'IKEA, Bosch, Samsung' },
    { key: 'material', label: 'Материал', type: 'text', placeholder: 'Дерево, Металл, Пластик' },
    { key: 'color', label: 'Цвет', type: 'text', placeholder: 'Белый, Коричневый, Черный' },
    { key: 'dimensions', label: 'Размеры (см)', type: 'text', placeholder: '100x50x200' },
    { key: 'weight', label: 'Вес (кг)', type: 'number', placeholder: '15' },
    { key: 'condition', label: 'Состояние', type: 'select', required: true, options: ['Новый', 'Б/у отличное', 'Б/у хорошее', 'Требует ремонта'] },
    { key: 'warranty', label: 'Гарантия', type: 'select', options: ['Есть', 'Нет'] },
  ],
  
  furniture: [
    { key: 'type', label: 'Тип мебели', type: 'text', required: true, placeholder: 'Диван, Стол, Стул, Шкаф' },
    { key: 'brand', label: 'Бренд', type: 'text', placeholder: 'IKEA, Ashley, Ethan Allen' },
    { key: 'material', label: 'Материал', type: 'text', required: true, placeholder: 'Дерево, Металл, Стекло, Кожа' },
    { key: 'color', label: 'Цвет', type: 'text', required: true, placeholder: 'Коричневый, Белый, Черный' },
    { key: 'dimensions', label: 'Размеры (см)', type: 'text', required: true, placeholder: '200x90x80' },
    { key: 'weight', label: 'Вес (кг)', type: 'number', placeholder: '50' },
    { key: 'style', label: 'Стиль', type: 'select', options: ['Современный', 'Классический', 'Минимализм', 'Лофт'] },
    { key: 'condition', label: 'Состояние', type: 'select', required: true, options: ['Новый', 'Б/у отличное', 'Б/у хорошее', 'Требует ремонта'] },
  ],
};

// Helper function to get specs for a category by slug
export function getCategorySpecs(categorySlug: string): CategorySpec[] {
  return categorySpecs[categorySlug] || [
    { key: 'brand', label: 'Бренд', type: 'text', placeholder: 'Бренд товара' },
    { key: 'model', label: 'Модель', type: 'text', placeholder: 'Модель товара' },
    { key: 'condition', label: 'Состояние', type: 'select', options: ['Новый', 'Б/у', 'На запчасти'] },
  ];
}

// Zod schema for validating specifications
export function createSpecsSchema(categorySlug: string) {
  const specs = getCategorySpecs(categorySlug);
  const schema: Record<string, z.ZodTypeAny> = {};
  
  specs.forEach(spec => {
    let validator: z.ZodTypeAny = z.any();
    
    switch (spec.type) {
      case 'text':
        validator = z.string().min(1, `${spec.label} обязательно для заполнения`);
        break;
      case 'number':
        validator = z.number().min(0, `${spec.label} должно быть положительным числом`);
        break;
      case 'select':
        validator = z.string().min(1, `${spec.label} обязательно для выбора`);
        break;
      case 'boolean':
        validator = z.boolean();
        break;
    }
    
    if (spec.required) {
      schema[spec.key] = validator;
    } else {
      schema[spec.key] = validator.optional();
    }
  });
  
  return z.object(schema);
}
