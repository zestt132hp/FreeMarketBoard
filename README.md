# FreeMarketBoard — Клиент-серверное приложение доски объявлений

## Оглавление

- [0. Описание технологий и преимущества React](#0-описание-технологий-и-преимущества-react)
- [1. Работа сервера](#1-работа-сервера)
- [2. Работа клиента](#2-работа-клиента)
- [3. Контейнеризация](#3-контейнеризация)
- [4. База данных](#4-база-данных)
- [5. Организация и хранение данных](#5-организация-и-хранение-данных)
- [6. Интеграция с Яндекс Картами](#6-интеграция-с-яндекс-картами)
- [7. Интеграция с платёжной системой](#7-интеграция-с-платёжной-системой)
- [8. Sequence диаграммы](#8-sequence-диаграммы)
- [9. Описание CSS стилей дизайна](#9-описание-css-стилей-дизайна)
- [10. Пошаговая инструкция запуска в Docker](#10-пошаговая-инструкция-запуска-в-docker)
- [11. Топ 10 мануальных тест-кейсов](#11-топ-10-мануальных-тест-кейсов)
- [12. Безопасность приложения](#12-безопасность-приложения)
- [13. Оптимизация веб-приложения](#13-оптимизация-веб-приложения)

---

## 0. Описание технологий и преимущества React

### Стек технологий приложения

| Компонент | Технология | Назначение |
|-----------|------------|------------|
| **Frontend** | React 18.3.1 | Библиотека для построения пользовательского интерфейса |
| **Сборщик** | Vite 5.4.19 | Быстрый инструмент сборки для современных веб-приложений |
| **Стили** | Tailwind CSS 3.4.17 | Утилитарный CSS-фреймворк |
| **UI компоненты** | Radix UI + shadcn/ui | Набор доступных UI компонентов |
| **HTTP запросы** | TanStack Query (React Query) 5.60.5 | Управление состоянием сервера и кэширование запросов |
| **Роутинг** | Wouter 3.3.5 | Легковесный роутер для React |
| **Формы** | React Hook Form 7.55.0 | Управление формами и валидация |
| **Валидация** | Zod 3.24.2 | Валидация схем данных TypeScript |
| **Backend** | Express 4.21.2 | Веб-фреймворк для Node.js |
| **База данных** | PostgreSQL 15 | Реляционная база данных |
| **ORM** | Drizzle ORM 0.39.3 | Типобезопасная ORM для TypeScript |
| **Аутентификация** | JWT + bcrypt | Токены и хеширование паролей |
| **Загрузка файлов** | Multer + Sharp | Обработка и сжатие изображений |
| **Контейнеризация** | Docker + Docker Compose | Изоляция и оркестрация сервисов |

### Преимущества React для данного проекта

**1. Компонентный подход**
- Приложение состоит из переиспользуемых компонентов: [`AdCard`](client/src/components/ad-card.tsx), [`ShoppingCart`](client/src/components/shopping-cart.tsx), [`AuthModal`](client/src/components/auth-modal.tsx)
- Каждый компонент инкапсулирует свою логику и стили
- Упрощает поддержку и масштабирование кода

**2. Виртуальный DOM**
- React эффективно обновляет только изменённые части страницы
- Критично для доски объявлений с частыми обновлениями (фильтры, поиск, корзина)

**3. Одностраничное приложение (SPA)**
- Мгновенные переходы между страницами без перезагрузки
- Плавная работа корзины и модальных окон
- [`App.tsx`](client/src/App.tsx) использует роутер wouter для навигации

**4. Экосистема и хуки**
- Хуки состояния: [`useAuth`](client/src/hooks/use-auth.ts), [`useCart`](client/src/hooks/use-cart.ts), [`useCheckout`](client/src/hooks/use-checkout.ts)
- Хук геолокации: [`useGeolocation`](client/src/hooks/use-geolocation.ts)
- Кастомные хуки для переиспользования логики

**5. React Query для работы с сервером**
- Автоматическое кэширование ответов API
- Фоновое обновление данных
- Оптимистичные обновления UI (добавление в корзину)

**6. Типобезопасность**
- Полная типизация через TypeScript
- Общие типы между клиентом и сервером через [`shared/schema.ts`](shared/schema.ts)

---

## 1. Работа сервера

### Архитектура сервера

Сервер представляет собой Express.js приложение, которое обрабатывает HTTP запросы от клиента и взаимодействует с базой данных PostgreSQL.

```
┌─────────────────────────────────────────────────────────────┐
│                     Express Server                          │
│  Port: 5000                                                 │
├─────────────────────────────────────────────────────────────┤
│  Middleware Layer:                                          │
│  • CORS (разрешает запросы с localhost:3000, 3001)         │
│  • JSON Parser                                              │
│  • URL Encoded Parser                                       │
│  • Logger (логирует API запросы)                           │
├─────────────────────────────────────────────────────────────┤
│  Routes Layer (server/routes.ts):                           │
│  • /api/register, /api/login, /api/me                      │
│  • /api/ads, /api/categories, /api/specs                   │
│  • /api/cart, /api/orders, /api/addresses                  │
│  • /api/upload/images, /api/images/*                       │
│  • /api/geocode, /api/route                                │
├─────────────────────────────────────────────────────────────┤
│  Storage Layer (server/storage.ts):                         │
│  • DatabaseStorage — работа с PostgreSQL через Drizzle ORM │
│  • MemStorage — память (для тестирования)                  │
├─────────────────────────────────────────────────────────────┤
│  Database Layer (server/db.ts):                             │
│  • PostgreSQL подключение через postgres.js                │
│  • Drizzle ORM для типобезопасных запросов                 │
└─────────────────────────────────────────────────────────────┘
```

### Запуск сервера

**Разработка:**
```bash
npm run dev:server        # Запуск только сервера на порту 5000
npm run dev:both          # Сервер + клиент одновременно
```

**Продакшн:**
```bash
npm start                 # Запуск собранного сервера
```

### Компоненты сервера

| Файл | Назначение |
|------|------------|
| [`server/index.ts`](server/index.ts) | Точка входа, настройка Express middleware |
| [`server/routes.ts`](server/routes.ts) | Все API эндпоинты (аутентификация, объявления, корзина, заказы) |
| [`server/storage.ts`](server/storage.ts) | Слой доступа к данным (DatabaseStorage, MemStorage) |
| [`server/db.ts`](server/db.ts) | Подключение к PostgreSQL через Drizzle ORM |
| [`server/logger.ts`](server/logger.ts) | Winston логгер для записи логов |
| [`server/file-utils.ts`](server/file-utils.ts) | Обработка и хранение изображений |
| [`server/upload-middleware.ts`](server/upload-middleware.ts) | Multer middleware для загрузки файлов |
| [`server/vite.ts`](server/vite.ts) | Интеграция Vite для разработки |

### Хостинг сервера

Сервер может быть развёрнут:
1. **Локально** — для разработки
2. **В Docker контейнере** — через docker-compose
3. **На облачном хостинге** — Heroku, Railway, Render, VPS

---

## 2. Работа клиента

### Архитектура клиента

Клиентское приложение — это React SPA (Single Page Application), которое собирается через Vite и общается с сервером через HTTP запросы.

```
┌─────────────────────────────────────────────────────────────┐
│                    React Application                        │
│  Port: 3001 (dev) / обслуживается сервером (prod)          │
├─────────────────────────────────────────────────────────────┤
│  Entry Point:                                               │
│  • client/src/main.tsx — рендеринг App                     │
│  • client/src/App.tsx — корневой компонент с роутингом     │
├─────────────────────────────────────────────────────────────┤
│  Pages:                                                     │
│  • Home — главная страница с объявлениями                  │
│  • Dashboard — панель управления                           │
│  • NotFound — страница 404                                 │
├─────────────────────────────────────────────────────────────┤
│  Components:                                                │
│  • AdCard, AdModal, AdCheckout                             │
│  • ShoppingCart, FiltersPanel, CategoryNav                 │
│  • AuthModal, LocationMapSelector, ImageUploader           │
│  • UI компоненты (shadcn/ui)                               │
├─────────────────────────────────────────────────────────────┤
│  Hooks:                                                     │
│  • useAuth — аутентификация                                │
│  • useCart — управление корзиной                           │
│  • useCheckout — оформление заказа                         │
│  • useGeolocation — геолокация                             │
│  • useFiltersLocalStorage — сохранение фильтров            │
├─────────────────────────────────────────────────────────────┤
│  API Client:                                                │
│  • lib/queryClient — TanStack Query настройка              │
│  • lib/auth — управление JWT токеном                       │
└─────────────────────────────────────────────────────────────┘
```

### Запуск клиента

**Разработка:**
```bash
npm run dev:client        # Запуск клиента на порту 3001
npm run dev               # Vite dev сервер
```

**Сборка:**
```bash
npm run build             # Сборка в папку dist/
npm run preview           # Предпросмотр собранной версии
```

### Клиентский модуль для запросов

Все HTTP запросы к серверу выполняются через [`lib/queryClient.ts`](client/src/lib/queryClient.ts) с использованием TanStack Query.

**Пример запроса:**
```typescript
// client/src/hooks/use-auth.ts
const response = await fetch("/api/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ phone, password }),
});
const data = await response.json();
authStorage.setToken(data.token);
```

**Аутентифицированные запросы:**
```typescript
// client/src/lib/auth.ts
export function createAuthHeaders() {
  const token = authStorage.getToken();
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  };
}
```

---

## 3. Контейнеризация

### Dockerfile (сервер)

[`Dockerfile`](Dockerfile) — многоэтапная сборка сервера:

```dockerfile
# Этап сборки сервера
FROM node:20-bullseye AS server-builder
WORKDIR /app
COPY package*.json ./
COPY server/ ./server/
COPY shared/ ./shared/
RUN npm install --no-optional

# Финальный образ
FROM node:20-bullseye
WORKDIR /app
COPY --from=server-builder /app/package*.json ./
COPY --from=server-builder /app/node_modules ./node_modules
COPY --from=server-builder /app/server ./server
COPY --from=server-builder /app/shared ./shared
EXPOSE 5000
CMD ["npx", "tsx", "server/index.ts"]
```

### Dockerfile.client (клиент)

[`Dockerfile.client`](Dockerfile.client) — сборка и хостинг клиента:

```dockerfile
# Этап сборки клиента
FROM node:20-bullseye AS client-builder
WORKDIR /app
COPY package*.json ./
COPY client/ ./client/
COPY shared/ ./shared/
COPY vite.config.ts ./
RUN npm install --no-optional
RUN npm run build

# Финальный образ с serve
FROM node:20-bullseye
WORKDIR /app
RUN npm install -g serve
COPY --from=client-builder /app/dist ./dist
EXPOSE 3001
CMD ["serve", "-s", "dist", "-l", "3001"]
```

### Docker Compose

[`docker-compose-fixed.yml`](docker-compose-fixed.yml) — оркестрация сервисов:

```yaml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgres://admin:StrongPass123!@postgres:5432/freemarketboards
      - JWT_SECRET=your-super-secret-jwt-key
    depends_on:
      - postgres
    networks:
      - freemarketboard-network

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=admin
      - POSTGRES_PASSWORD=StrongPass123!
      - POSTGRES_DB=freemarketboards
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - freemarketboard-network

volumes:
  postgres_data:

networks:
  freemarketboard-network:
    driver: bridge
```

**Как работает docker-compose:**
1. Создаёт сеть `freemarketboard-network` для изоляции сервисов
2. Запускает PostgreSQL с постоянным томом `postgres_data`
3. Запускает сервер, который подключается к БД через внутреннее имя `postgres`
4. Сервер доступен на порту 5000, БД — на 5432

---

## 4. База данных

### Таблицы базы данных

#### users — Пользователи
| Колонка | Тип | Описание |
|---------|-----|----------|
| id | SERIAL PRIMARY KEY | Уникальный идентификатор |
| name | TEXT NOT NULL | Имя пользователя |
| phone | TEXT UNIQUE NOT NULL | Номер телефона (логин) |
| password | TEXT NOT NULL | Хешированный пароль (bcrypt) |
| created_at | TIMESTAMP DEFAULT NOW() | Дата регистрации |

#### categories — Категории объявлений
| Колонка | Тип | Описание |
|---------|-----|----------|
| id | SERIAL PRIMARY KEY | Уникальный идентификатор |
| name | TEXT NOT NULL | Название категории |
| icon | TEXT NOT NULL | Иконка (Lucide React) |
| slug | TEXT UNIQUE NOT NULL | URL-идентификатор |
| parent_id | INTEGER REFERENCES categories(id) | Родительская категория |

#### ads — Объявления
| Колонка | Тип | Описание |
|---------|-----|----------|
| id | SERIAL PRIMARY KEY | Уникальный идентификатор |
| title | TEXT NOT NULL | Заголовок |
| short_description | TEXT NOT NULL | Краткое описание |
| full_description | TEXT NOT NULL | Полное описание |
| price | DECIMAL(10,2) NOT NULL | Цена |
| category_id | INTEGER REFERENCES categories(id) | Категория |
| location | TEXT NOT NULL | Местоположение |
| latitude | DECIMAL(10,8) | Широта |
| longitude | DECIMAL(11,8) | Долгота |
| specifications | TEXT NOT NULL | JSON со спецификациями |
| user_id | INTEGER NOT NULL | Владелец объявления |
| is_active | BOOLEAN DEFAULT TRUE | Активность |
| created_at | TIMESTAMP DEFAULT NOW() | Дата создания |

#### images — Изображения объявлений
| Колонка | Тип | Описание |
|---------|-----|----------|
| id | SERIAL PRIMARY KEY | Уникальный идентификатор |
| path | TEXT NOT NULL | Путь к файлу |
| ad_id | INTEGER REFERENCES ads(id) | Объявление |
| order | INTEGER DEFAULT 0 | Порядок сортировки |
| is_primary | BOOLEAN DEFAULT FALSE | Главное изображение |

#### cart_items — Корзина
| Колонка | Тип | Описание |
|---------|-----|----------|
| id | SERIAL PRIMARY KEY | Уникальный идентификатор |
| user_id | INTEGER NOT NULL | Пользователь |
| ad_id | INTEGER NOT NULL | Объявление в корзине |
| created_at | TIMESTAMP DEFAULT NOW() | Дата добавления |

#### specification_templates — Шаблоны спецификаций
| Колонка | Тип | Описание |
|---------|-----|----------|
| id | SERIAL PRIMARY KEY | Уникальный идентификатор |
| category_id | INTEGER REFERENCES categories(id) | Категория |
| key | TEXT NOT NULL | Ключ спецификации |
| label | TEXT NOT NULL | Отображаемое название |
| type | TEXT NOT NULL | Тип (text/number/select/boolean) |
| required | BOOLEAN DEFAULT FALSE | Обязательность |
| placeholder | TEXT | Подсказка |

#### specification_options — Опции спецификаций
| Колонка | Тип | Описание |
|---------|-----|----------|
| id | SERIAL PRIMARY KEY | Уникальный идентификатор |
| template_id | INTEGER REFERENCES specification_templates(id) | Шаблон |
| value | TEXT NOT NULL | Значение опции |
| sort_order | INTEGER DEFAULT 0 | Порядок сортировки |

#### ad_specifications — Спецификации объявлений
| Колонка | Тип | Описание |
|---------|-----|----------|
| id | SERIAL PRIMARY KEY | Уникальный идентификатор |
| ad_id | INTEGER REFERENCES ads(id) | Объявление |
| template_id | INTEGER REFERENCES specification_templates(id) | Шаблон |
| value | TEXT NOT NULL | Значение |

#### addresses — Адреса доставки
| Колонка | Тип | Описание |
|---------|-----|----------|
| id | SERIAL PRIMARY KEY | Уникальный идентификатор |
| user_id | INTEGER NOT NULL | Пользователь |
| recipient_name | TEXT NOT NULL | ФИО получателя |
| recipient_phone | TEXT NOT NULL | Телефон |
| recipient_email | TEXT NOT NULL | Email |
| region | TEXT NOT NULL | Регион |
| city | TEXT NOT NULL | Город |
| district | TEXT | Район |
| street | TEXT NOT NULL | Улица |
| building | TEXT NOT NULL | Дом |
| apartment | TEXT | Квартира |
| is_default | BOOLEAN DEFAULT FALSE | Адрес по умолчанию |
| created_at | TIMESTAMP DEFAULT NOW() | Дата создания |

#### orders — Заказы
| Колонка | Тип | Описание |
|---------|-----|----------|
| id | SERIAL PRIMARY KEY | Уникальный идентификатор |
| user_id | INTEGER NOT NULL | Пользователь |
| status | TEXT NOT NULL DEFAULT 'pending' | Статус (pending/paid/shipped/delivered/cancelled) |
| total_amount | DECIMAL(10,2) NOT NULL | Общая сумма |
| payment_method | TEXT NOT NULL | Способ оплаты (sbp/card/installments) |
| delivery_method | TEXT NOT NULL DEFAULT 'courier' | Способ доставки |
| recipient_name | TEXT NOT NULL | ФИО получателя |
| recipient_phone | TEXT NOT NULL | Телефон |
| recipient_email | TEXT NOT NULL | Email |
| delivery_region | TEXT NOT NULL | Регион доставки |
| delivery_city | TEXT NOT NULL | Город доставки |
| delivery_district | TEXT | Район доставки |
| delivery_street | TEXT NOT NULL | Улица доставки |
| delivery_building | TEXT NOT NULL | Дом доставки |
| delivery_apartment | TEXT | Квартира доставки |
| address_id | INTEGER | Ссылка на сохранённый адрес |
| qr_code | TEXT | QR код для оплаты СБП |
| created_at | TIMESTAMP DEFAULT NOW() | Дата создания |

#### order_items — Элементы заказа
| Колонка | Тип | Описание |
|---------|-----|----------|
| id | SERIAL PRIMARY KEY | Уникальный идентификатор |
| order_id | INTEGER REFERENCES orders(id) ON DELETE CASCADE | Заказ |
| ad_id | INTEGER NOT NULL | Объявление |
| title | TEXT NOT NULL | Название товара |
| price | DECIMAL(10,2) NOT NULL | Цена |
| quantity | INTEGER DEFAULT 1 | Количество |
| image_path | TEXT | Путь к изображению |

### Миграции базы данных

Миграции хранятся в папке [`migrations/`](migrations/):

| Файл | Описание |
|------|----------|
| [`0001_split_ads_table.sql`](migrations/0001_split_ads_table.sql) | Разделение таблицы ads |
| [`0002_add_specifications_tables.sql`](migrations/0002_add_specifications_tables.sql) | Таблицы спецификаций |
| [`0003_seed_spec_templates.sql`](migrations/0003_seed_spec_templates.sql) | Начальные данные спецификаций |
| [`0004_migrate_json_data.sql`](migrations/0004_migrate_json_data.sql) | Миграция JSON данных |
| [`0005_restore_data.sql`](migrations/0005_restore_data.sql) | Восстановление данных |
| [`0006_migrate_json_specs.sql`](migrations/0006_migrate_json_specs.sql) | Миграция JSON спецификаций |
| [`0007_add_orders_and_addresses.sql`](migrations/0007_add_orders_and_addresses.sql) | Таблицы заказов и адресов |

### Применение миграций

```bash
# Автоматическое применение миграций
npm run db:push

# Ручное применение через скрипт
npx tsx scripts/apply-migration.ts
```

### Подключение к базе данных

[`server/db.ts`](server/db.ts):
```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, {
  onnotice: (notice) => logger.info('Postgres Notice:', notice),
  debug: (connection, query, params) => {
    logger.debug('Executing query:', query);
  },
});

export const db = drizzle(client, { schema });
```

**Переменные окружения:**
```env
DATABASE_URL=postgres://admin:StrongPass123!@localhost:5432/freemarketboards
```

---

## 5. Организация и хранение данных

### Структура данных

```
┌─────────────────────────────────────────────────────────────┐
│                    База данных PostgreSQL                   │
├─────────────────────────────────────────────────────────────┤
│  users (пользователи)                                       │
│    └── 1:N → ads (объявления пользователя)                 │
│    └── 1:N → cart_items (корзина)                          │
│    └── 1:N → orders (заказы)                               │
│    └── 1:N → addresses (адреса)                            │
├─────────────────────────────────────────────────────────────┤
│  categories (категории)                                     │
│    └── 1:N → ads (объявления категории)                    │
│    └── 1:N → specification_templates                       │
├─────────────────────────────────────────────────────────────┤
│  ads (объявления)                                           │
│    └── 1:N → images (изображения)                          │
│    └── 1:N → ad_specifications (спецификации)              │
│    └── N:1 → users (владелец)                              │
│    └── N:1 → categories (категория)                        │
├─────────────────────────────────────────────────────────────┤
│  specification_templates                                    │
│    └── 1:N → specification_options                         │
│    └── 1:N → ad_specifications                             │
├─────────────────────────────────────────────────────────────┤
│  orders (заказы)                                            │
│    └── 1:N → order_items                                   │
│    └── N:1 → users                                         │
│    └── N:1 → addresses (опционально)                       │
└─────────────────────────────────────────────────────────────┘
```

### Хранение изображений

Изображения хранятся на файловой системе в структуре:

```
FreeMarketBoardFiles/
├── temp/
│   └── {userId}/
│       ├── {uuid}.jpg          # Временное изображение
│       └── thumbnails/
│           └── {uuid}.jpg      # Миниатюра
└── {userId}/
    └── {adId}/
        ├── {uuid}.jpg          # Основное изображение
        └── thumbnails/
            └── {uuid}.jpg      # Миниатюра
```

**Обработка изображений:**
1. Загрузка через Multer во временную папку
2. Сжатие через Sharp (макс. 1200px, качество 80%)
3. Создание миниатюры (макс. 300px, качество 70%)
4. Перемещение в папку объявления при сохранении

### Сессионные данные

- **JWT токены** хранятся в localStorage клиента
- **Корзина** хранится в базе данных (cart_items)
- **Фильтры** сохраняются в localStorage через [`useFiltersLocalStorage`](client/src/hooks/use-filters-local-storage.ts)

---

## 6. Интеграция с Яндекс Картами

### Компоненты карт

Интеграция реализована через библиотеку [`@pbe/react-yandex-maps`](https://github.com/pbe/react-yandex-maps).

**Основные компоненты:**
- [`LocationMapSelector`](client/src/components/location-map-selector.tsx) — выбор местоположения на карте
- [`LocationView`](client/src/components/location-view.tsx) — отображение местоположения
- [`AdModal`](client/src/components/ad-modal-v2.tsx) — карта в модальном окне объявления

### Инициализация карт

[`client/src/App.tsx`](client/src/App.tsx):
```tsx
<YMaps
  query={{
    apikey: import.meta.env.VITE_YANDEX_MAPS_API_KEY,
    lang: "ru_RU",
    coordorder: "latlong",
  }}
>
  {/* Приложение */}
</YMaps>
```

### Геокодинг (координаты → адрес)

**Серверный API:**
```typescript
// server/routes.ts:1341-1397
app.get("/api/geocode", async (req, res) => {
  const { latitude, longitude } = req.query;
  const yandexUrl = `https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&geocode=${lon},${lat}&kind=house&format=json&lang=ru_RU`;
  const response = await fetch(yandexUrl);
  const data = await response.json();
  const address = data.response.GeoObjectCollection.featureMember?.[0]?.GeoObject.metaDataProperty.GeocoderMetaData.text;
  res.json({ address, latitude, longitude });
});
```

**Клиент:**
```typescript
// client/src/components/location-map-selector.tsx:60-86
const performGeocoding = async (lat: number, lng: number) => {
  const response = await fetch(`/api/geocode?latitude=${lat}&longitude=${lng}`);
  const data = await response.json();
  setAddress(data.address);
  onLocationChange({ latitude: lat, longitude: lng, address: data.address });
};
```

### Построение маршрутов

**Серверный API:**
```typescript
// server/routes.ts:1400-1508
app.get("/api/route", async (req, res) => {
  const { fromLat, fromLng, toLat, toLng } = req.query;
  const yandexUrl = `https://router.browser.yandex.net/v2?apikey=${apiKey}&mode=auto&origin=${fromLng},${fromLat}&destination=${toLng},${toLat}`;
  const response = await fetch(yandexUrl);
  const data = await response.json();
  res.json({
    distance: data.routes?.[0]?.distance?.value,
    duration: data.routes?.[0]?.duration?.value,
    polyline: data.routes?.[0]?.polyline,
  });
});
```

**Fallback:** При недоступности API используется формула Haversine для расчёта расстояния между точками.

### Геолокация

[`useGeolocation`](client/src/hooks/use-geolocation.ts) — хук для получения текущего местоположения пользователя через браузерный Geolocation API.

---

## 7. Интеграция с платёжной системой

### Способы оплаты

Приложение поддерживает три способа оплаты:
1. **СБП (Система Быстрых Платежей)** — оплата по QR коду
2. **Карта** — оплата банковской картой
3. **Рассрочка** — оплата в рассрочку (0%)

### Процесс оплаты

**Sequence оформления заказа:**

```
Клиент                    Сервер                    Платёжная система
   │                         │                            │
   │──POST /api/orders──────▶│                            │
   │  (данные заказа)        │                            │
   │                         │──Генерация QR кода────────▶│
   │                         │  (mock для СБП)             │
   │◀─Order с QR кодом───────│                            │
   │                         │                            │
   │  [Сканирование QR]      │                            │
   │──────────────────────────────────────────────────────▶│
   │                         │                            │
   │  [Подтверждение]        │◀─Webhook───────────────────│
   │                         │  (статус оплаты)           │
   │◀─Обновление статуса─────│                            │
   │   заказа                │                            │
```

### Реализация

**Создание заказа:**
```typescript
// server/routes.ts:1113-1188
app.post("/api/orders", authenticateToken, async (req, res) => {
  const checkoutData = checkoutDtoSchema.parse(req.body);
  const totalAmount = checkoutData.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  // Генерация mock QR кода
  const mockQrCode = `data:image/png;base64,${Buffer.from(`MOCK_QR_${Date.now()}_${userId}`).toString('base64')}`;
  
  const order = await storage.createOrder({
    ...orderData,
    qrCode: mockQrCode,
  }, orderItemsData);
  
  res.status(201).json(order);
});
```

**Компонент оплаты:**
[`AdCheckout`](client/src/components/ad-checkout.tsx) — форма оформления заказа с выбором способа оплаты и отображением QR кода.

### Интеграция в продакшене

Для реальной интеграции необходимо:
1. Подключить платёжный провайдер (ЮKassa, CloudPayments, Тинькофф Касса)
2. Настроить webhook для получения статуса оплаты
3. Заменить mock QR на реальный от платёжной системы
4. Реализовать обработку успешной/неуспешной оплаты

---

## 8. Sequence диаграммы

### 8.1 Регистрация пользователя, восстановление пароля, вход

```mermaid
sequenceDiagram
    participant U as Пользователь
    participant C as Клиент (React)
    participant S as Сервер (Express)
    participant DB as База данных

    Note over U,DB: Регистрация
    U->>C: Ввод данных (имя, телефон, пароль)
    C->>S: POST /api/register
    S->>DB: Проверка существования пользователя
    DB-->>S: Пользователь не найден
    S->>S: Хеширование пароля (bcrypt)
    S->>DB: INSERT INTO users
    DB-->>S: Новый пользователь
    S->>S: Генерация JWT токена
    S-->>C: Токен + данные пользователя
    C->>C: Сохранение токена в localStorage
    C-->>U: Успешная регистрация

    Note over U,DB: Вход
    U->>C: Ввод телефона и пароля
    C->>S: POST /api/login
    S->>DB: SELECT user by phone
    DB-->>S: Данные пользователя
    S->>S: Проверка пароля (bcrypt.compare)
    S->>S: Генерация JWT токена
    S-->>C: Токен + данные пользователя
    C->>C: Сохранение токена
    C-->>U: Успешный вход

    Note over U,DB: Восстановление пароля
    U->>C: Ввод телефона
    C->>S: POST /api/reset-password
    S->>DB: SELECT user by phone
    DB-->>S: Пользователь найден
    S->>S: Генерация временного пароля
    S->>DB: UPDATE user password
    DB-->>S: Успешно
    S-->>C: Сообщение об успехе
    C-->>U: Новый пароль показан
```

### 8.2 Создание карточки товара

```mermaid
sequenceDiagram
    participant U as Пользователь
    participant C as Клиент (React)
    participant S as Сервер (Express)
    participant DB as База данных
    participant FS as Файловая система

    U->>C: Заполнение формы объявления
    U->>C: Загрузка изображений
    C->>S: POST /api/upload/images (изображения)
    S->>FS: Сохранение во временную папку
    FS-->>S: Пути к изображениям
    S-->>C: Список загруженных изображений

    U->>C: Нажатие "Создать объявление"
    C->>S: POST /api/ads (FormData)
    S->>S: Проверка JWT токена
    S->>S: Парсинг данных объявления
    S->>DB: INSERT INTO ads
    DB-->>S: ID нового объявления
    S->>FS: Перемещение изображений в папку объявления
    FS-->>S: Пути к изображениям
    S->>DB: INSERT INTO images
    DB-->>S: Успешно
    S-->>C: Данные объявления
    C-->>U: Объявление создано
```

### 8.3 Добавление карточки товара в корзину

```mermaid
sequenceDiagram
    participant U as Пользователь
    participant C as Клиент (React)
    participant S as Сервер (Express)
    participant DB as База данных

    U->>C: Нажатие "В корзину"
    C->>C: Проверка аутентификации
    alt Не аутентифицирован
        C-->>U: Сообщение о необходимости входа
    else Аутентифицирован
        C->>C: Проверка: не своё объявление
        alt Своё объявление
            C-->>U: "Нельзя добавить своё объявление"
        else Чужое объявление
            C->>S: POST /api/cart
            S->>S: Проверка JWT токена
            S->>DB: Проверка существования объявления
            DB-->>S: Объявление найдено
            S->>DB: INSERT INTO cart_items
            DB-->>S: Элемент корзины
            S-->>C: Данные товара
            C->>C: Открытие диалога подтверждения
            C-->>U: Диалог "Добавлено в корзину"
        end
    end
```

### 8.4 Оформление заказа из корзины

```mermaid
sequenceDiagram
    participant U as Пользователь
    participant C as Клиент (React)
    participant S as Сервер (Express)
    participant DB as База данных

    U->>C: Нажатие "Перейти к оформлению"
    C->>C: Открытие модального окна AdCheckout
    U->>C: Заполнение данных доставки
    U->>C: Выбор способа оплаты
    U->>C: Нажатие "Оплатить онлайн"
    C->>S: POST /api/orders
    S->>S: Валидация checkoutDtoSchema
    S->>S: Расчёт общей суммы
    S->>DB: INSERT INTO orders
    DB-->>S: ID заказа
    S->>DB: INSERT INTO order_items
    DB-->>S: Успешно
    S->>S: Генерация QR кода (mock)
    S->>DB: DELETE FROM cart_items
    DB-->>S: Корзина очищена
    S-->>C: Заказ с QR кодом
    C->>C: Открытие модального окна QR
    C-->>U: QR код для оплаты
    opt Сохранение адреса
        C->>S: POST /api/addresses
        S->>DB: INSERT INTO addresses
        DB-->>S: Успешно
    end
```

---

## 9. Описание CSS стилей дизайна

### Tailwind CSS

Приложение использует утилитарный CSS-фреймворк **Tailwind CSS** с кастомной темой.

**Конфигурация:** [`tailwind.config.ts`](tailwind.config.ts)

### Цветовая палитра

CSS переменные определены в [`client/src/index.css`](client/src/index.css):

| Переменная | Светлая тема | Тёмная тема | Назначение |
|------------|--------------|-------------|------------|
| `--background` | hsl(0, 0%, 100%) | hsl(240, 10%, 3.9%) | Фон страницы |
| `--foreground` | hsl(20, 14.3%, 4.1%) | hsl(0, 0%, 98%) | Основной текст |
| `--primary` | hsl(215, 90%, 54%) | hsl(215, 90%, 54%) | Акцентный синий |
| `--secondary` | hsl(37, 90%, 54%) | hsl(240, 3.7%, 15.9%) | Вторичный жёлтый |
| `--accent` | hsl(168, 90%, 54%) | hsl(240, 3.7%, 15.9%) | Акцентный бирюзовый |
| `--destructive` | hsl(0, 84.2%, 60.2%) | hsl(0, 62.8%, 30.6%) | Ошибки/удаление |
| `--border` | hsl(20, 5.9%, 90%) | hsl(240, 3.7%, 15.9%) | Границы |
| `--ring` | hsl(20, 14.3%, 4.1%) | hsl(240, 4.9%, 83.9%) | Обводка фокуса |

### Компоненты UI

Все UI компоненты основаны на **Radix UI** и стилизованы через Tailwind:

- **Button** — кнопки с вариантами: default, secondary, outline, ghost, destructive
- **Input** — поля ввода с фокусом через ring
- **Card** — карточки с border и shadow
- **Dialog/Sheet** — модальные окна и боковые панели
- **Badge** — метки/теги
- **Separator** — разделители

### Утилитарные классы

**Типографика:**
```html
<h1 class="text-2xl font-bold">Заголовок</h1>
<p class="text-sm text-muted-foreground">Описание</p>
```

**Отступы:**
```html
<div class="p-4 m-2 space-y-4">Контент</div>
```

**Flexbox/Grid:**
```html
<div class="flex items-center justify-between gap-2">
  <span>Текст</span>
  <Button>Действие</Button>
</div>
```

**Адаптивность:**
```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

### Анимации

```css
@keyframes accordion-down {
  from { height: 0; }
  to { height: var(--radix-accordion-content-height); }
}

@keyframes accordion-up {
  from { height: var(--radix-accordion-content-height); }
  to { height: 0; }
}

.animate-accordion-down {
  animation: accordion-down 0.2s ease-out;
}
```

---

## 10. Пошаговая инструкция запуска в Docker

### Предварительные требования

1. Установленный **Docker Desktop** (Windows/Mac) или **Docker + Docker Compose** (Linux)
2. Установленный **Git** для клонирования репозитория

### Шаг 1: Клонирование репозитория

```bash
git clone <repository-url>
cd FreeMarketBoard
```

### Шаг 2: Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```env
# База данных
DATABASE_URL=postgres://admin:StrongPass123!@postgres:5432/freemarketboards

# JWT секрет (замените на случайную строку)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Яндекс Карты API ключ (получите на https://developer.tech.yandex.ru/)
YANDEX_MAPS_API_KEY=ваш-api-ключ
```

### Шаг 3: Запуск через Docker Compose

```bash
docker-compose -f docker-compose-fixed.yml up --build
```

**Флаги:**
- `-f docker-compose-fixed.yml` — использование исправленного файла compose
- `--build` — принудительная пересборка образов

### Шаг 4: Проверка запуска

После запуска вы увидите логи:

```
postgres    | database system is ready to accept connections
app         | serving on port 5000
```

### Шаг 5: Доступ к приложению

| Сервис | URL | Описание |
|--------|-----|----------|
| **Приложение** | http://localhost:5000 | Веб-интерфейс |
| **API** | http://localhost:5000/api | REST API |
| **База данных** | localhost:5432 | PostgreSQL |

### Шаг 6: Применение миграций (если требуется)

```bash
# Внутри контейнера
docker-compose -f docker-compose-fixed.yml exec app npx tsx scripts/apply-migration.ts
```

### Остановка сервисов

```bash
# Остановка без удаления томов
docker-compose -f docker-compose-fixed.yml down

# Остановка с удалением томов (данные БД будут удалены)
docker-compose -f docker-compose-fixed.yml down -v
```

### Запуск в фоновом режиме

```bash
docker-compose -f docker-compose-fixed.yml up -d --build
```

**Просмотр логов:**
```bash
docker-compose -f docker-compose-fixed.yml logs -f app
docker-compose -f docker-compose-fixed.yml logs -f postgres
```

---

## 11. Топ 10 мануальных тест-кейсов

### Тест-кейс 1: Регистрация нового пользователя

**Цель:** Проверить успешную регистрацию нового пользователя

**Шаги:**
1. Открыть http://localhost:5000
2. Нажать кнопку "Вход" в хедере
3. Переключиться на вкладку "Регистрация"
4. Ввести имя: "Тестовый Пользователь"
5. Ввести телефон: "+79991234567"
6. Ввести пароль: "test123456"
7. Нажать кнопку "Регистрация"

**Ожидаемый результат:**
- Пользователь зарегистрирован
- Токен сохранён в localStorage
- Отображается имя пользователя в хедере
- Появляется toast "Добро пожаловать!"

---

### Тест-кейс 2: Вход в систему

**Цель:** Проверить успешный вход существующего пользователя

**Шаги:**
1. Открыть http://localhost:5000
2. Нажать кнопку "Вход" в хедере
3. Ввести телефон: "+79991234567"
4. Ввести пароль: "test123456"
5. Нажать кнопку "Вход"

**Ожидаемый результат:**
- Пользователь вошёл в систему
- Токен сохранён в localStorage
- Отображается имя пользователя в хедере
- Появляется toast "С возвращением!"

---

### Тест-кейс 3: Восстановление пароля

**Цель:** Проверить работу восстановления пароля

**Шаги:**
1. Открыть форму входа
2. Нажать "Забыли пароль?"
3. Ввести телефон: "+79991234567"
4. Нажать "Сбросить пароль"

**Ожидаемый результат:**
- Пароль сброшен на временный "temp123"
- Появляется toast с новым паролем
- Можно войти с новым паролем

---

### Тест-кейс 4: Создание объявления

**Цель:** Проверить создание нового объявления с изображениями

**Шаги:**
1. Войти в систему
2. Нажать "Подать объявление"
3. Выбрать категорию (например, "Electronics")
4. Заполнить поля:
   - Заголовок: "iPhone 14 Pro"
   - Краткое описание: "Телефон в отличном состоянии"
   - Полное описание: "Подробное описание..."
   - Цена: "80000"
   - Местоположение: выбрать на карте
5. Загрузить 2-3 изображения
6. Заполнить спецификации
7. Нажать "Создать объявление"

**Ожидаемый результат:**
- Объявление создано
- Изображения загружены и отображаются
- Объявление появилось в ленте
- Появляется toast об успехе

---

### Тест-кейс 5: Добавление товара в корзину

**Цель:** Проверить добавление объявления в корзину

**Шаги:**
1. Открыть главную страницу
2. Найти объявление (не своё)
3. Нажать кнопку "В корзину"

**Ожидаемый результат:**
- Открывается диалог подтверждения
- Товар добавлен в корзину
- Счётчик корзины в хедере увеличился
- Появляется toast "Добавлено в корзину"

---

### Тест-кейс 6: Просмотр корзины

**Цель:** Проверить отображение и управление корзиной

**Шаги:**
1. Нажать на иконку корзины в хедере
2. Проверить список товаров
3. Нажать "Удалить" на одном товаре
4. Нажать "Очистить корзину"

**Ожидаемый результат:**
- Боковая панель корзины открывается
- Товары отображаются с изображениями и ценами
- Удаление товара работает
- Очистка корзины работает

---

### Тест-кейс 7: Оформление заказа

**Цель:** Проверить процесс оформления заказа

**Шаги:**
1. Добавить товар в корзину
2. Открыть корзину
3. Нажать "Перейти к оформлению"
4. Заполнить форму:
   - ФИО: "Иванов Иван"
   - Телефон: "+79991234567"
   - Email: "test@example.com"
   - Регион: "Москва"
   - Город: "Москва"
   - Улица: "ул. Ленина"
   - Дом: "10"
5. Выбрать способ оплаты: "СБП"
6. Нажать "Оплатить онлайн"

**Ожидаемый результат:**
- Заказ создан
- Открывается модальное окно с QR кодом
- Корзина очищена
- Появляется toast "Заказ оформлен"

---

### Тест-кейс 8: Фильтрация объявлений

**Цель:** Проверить работу фильтров и поиска

**Шаги:**
1. Открыть главную страницу
2. Выбрать категорию из навигации
3. Ввести текст в поиск
4. Изменить сортировку

**Ожидаемый результат:**
- Фильтр по категории работает
- Поиск по названию/описанию работает
- Объявления фильтруются корректно

---

### Тест-кейс 9: Просмотр своих объявлений (Dashboard)

**Цель:** Проверить панель управления объявлениями

**Шаги:**
1. Войти в систему
2. Создать 1-2 объявления
3. Перейти в Dashboard
4. Нажать "Редактировать" на объявлении
5. Изменить данные и сохранить
6. Нажать "Удалить" на объявлении

**Ожидаемый результат:**
- Отображаются только свои объявления
- Редактирование работает
- Удаление работает с подтверждением

---

### Тест-кейс 10: Работа с картой и геолокацией

**Цель:** Проверить выбор местоположения на карте

**Шаги:**
1. Открыть форму создания объявления
2. Нажать "Моё местоположение" (разрешить доступ в браузере)
3. Перетащить метку на карте
4. Проверить отображение адреса

**Ожидаемый результат:**
- Геолокация определяет текущие координаты
- При перетаскивании метки обновляется адрес
- Геокодинг работает корректно

---

## 12. Безопасность приложения

### Реализованные меры безопасности

#### 1. Аутентификация и авторизация

**JWT токены:**
- Токены генерируются с использованием библиотеки `jsonwebtoken`
- Срок действия токена настраивается через `JWT_EXPIRES_IN`
- Токены хранятся в `localStorage` на клиенте
- Каждый защищённый эндпоинт проверяет токен через middleware [`authenticateToken`](server/routes.ts:40)

```typescript
// server/routes.ts:40-55
function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token required' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
}
```

**Хеширование паролей:**
- Пароли хешируются через `bcrypt` с солью (10 раундов)
- Исходные пароли никогда не хранятся в базе данных
- При восстановлении пароля генерируется временный пароль

```typescript
// server/routes.ts:93
const hashedPassword = await bcrypt.hash(userData.password, 10);
```

#### 2. Валидация данных

**Zod схемы:**
- Все входящие данные валидируются через Zod схемы
- Схемы определены в [`shared/schema.ts`](shared/schema.ts)
- Невалидные данные отклоняются с ошибкой 400

```typescript
// server/routes.ts:83
const userData = insertUserSchema.parse(req.body);
```

**Типизация данных:**
- TypeScript обеспечивает типобезопасность на уровне компиляции
- Общие типы между клиентом и сервером через `shared/schema.ts`

#### 3. CORS (Cross-Origin Resource Sharing)

**Настройка CORS:**
```typescript
// server/index.ts:10-14
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001"],
  credentials: true
}));
```

- Разрешены запросы только с доверенных источников
- В продакшене необходимо ограничить список origin

#### 4. Защита от SQL-инъекций

**Drizzle ORM:**
- Использование параметризированных запросов
- Все данные экранируются автоматически
- Raw SQL запросы минимизированы

```typescript
// server/storage.ts:494-497
const [user] = await db
  .select()
  .from(users)
  .where(eq(users.phone, phone))
  .limit(1);
```

#### 5. Логирование и мониторинг

**Winston логгер:**
- Логирование всех API запросов
- Логирование ошибок базы данных
- Отладочные логи для критичных операций

```typescript
// server/routes.ts:59-62
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});
```

#### 6. Обработка ошибок

**Глобальный обработчик ошибок:**
```typescript
// server/routes.ts:65-77
app.use((err, req, res, next) => {
  logger.error('Database error', {
    error: err.message,
    stack: err.stack,
    query: err.query,
    parameters: err.parameters
  });
  
  if (err.name === 'DatabaseError') {
    return res.status(503).json({ message: "Service temporarily unavailable" });
  }
  next(err);
});
```

#### 7. Безопасное хранение файлов

**Изоляция загрузок:**
- Временные файлы хранятся отдельно от постоянных
- Структура: `FreeMarketBoardFiles/{userId}/{adId}/`
- Проверка типа файлов через Multer
- Сжатие изображений через Sharp

### Рекомендуемые улучшения безопасности

| Приоритет | Мера | Описание |
|-----------|------|----------|
| 🔴 Высокий | Helmet.js | Добавить HTTP заголовки безопасности (Content-Security-Policy, X-Frame-Options) |
| 🔴 Высокий | Rate Limiting | Ограничение запросов для защиты от brute-force и DDoS |
| 🔴 Высокий | HTTPS | Принудительное использование HTTPS в продакшене |
| 🟡 Средний | Input Sanitization | Дополнительная очистка пользовательских данных от XSS |
| 🟡 Средний | Refresh Tokens | Использовать refresh токены для обновления access токенов |
| 🟡 Средний | Password Policy | Требовать сложные пароли (мин. длина, спецсимволы) |
| 🟢 Низкий | 2FA | Двухфакторная аутентификация через SMS/TOTP |
| 🟢 Низкий | Audit Logs | Детальное логирование действий пользователей |

### Пример добавления Helmet и Rate Limiting

```typescript
// server/index.ts (рекомендуемое улучшение)
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Защита HTTP заголовками
app.use(helmet());

// Ограничение запросов
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100 // максимум 100 запросов
});
app.use('/api/', limiter);

// Строгое ограничение для аутентификации
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5 // максимум 5 попыток входа
});
app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);
```

---

## 13. Оптимизация веб-приложения

### Реализованные оптимизации

#### 1. Сборка и бандлинг (Vite)

**Преимущества Vite:**
- Мгновенный запуск dev-сервера через ES modules
- Быстрая HMR (Hot Module Replacement)
- Оптимизированная продакшн сборка через Rollup

**Конфигурация:**
```typescript
// vite.config.ts:23-29
build: {
  outDir: path.join(__dirname, "dist"),
  emptyOutDir: true,
  rollupOptions: {
    input: path.join(__dirname, "client/index.html")
  }
}
```

#### 2. Код-сплиттинг

**Динамические импорты:**
- Компоненты загружаются по требованию
- Роутинг через wouter уменьшает размер бандла

#### 3. Кэширование API запросов

**TanStack Query:**
- Автоматическое кэширование ответов сервера
- Фоновое обновление устаревших данных
- Оптимистичные обновления UI

```typescript
// client/src/hooks/use-auth.ts:33-50
const query = useQuery({
  queryKey: ['auth'],
  queryFn: async () => {
    const response = await fetch('/api/me', {
      headers: createAuthHeaders()
    });
    return response.json();
  },
  staleTime: 5 * 60 * 1000, // 5 минут
  retry: false
});
```

#### 4. Оптимизация изображений

**Sharp обработка:**
- Сжатие изображений до 1200px (качество 80%)
- Создание миниатюр 300px (качество 70%)
- Формат JPEG для совместимости

```typescript
// server/file-utils.ts:56-103
await sharp(file.buffer)
  .resize({ width: 1200, height: 1200, fit: 'inside' })
  .jpeg({ quality: 80 })
  .toFile(outputPath);
```

#### 5. Локальное состояние

**localStorage:**
- JWT токены хранятся локально
- Фильтры сохраняются через [`useFiltersLocalStorage`](client/src/hooks/use-filters-local-storage.ts)
- Сокращение unnecessary API запросов за счёт локального хранения

#### 6. Компонентная оптимизация

**React.memo и useCallback:**
- Мемоизация тяжёлых компонентов
- Предотвращение лишних ре-рендеров

```typescript
// client/src/components/location-map-selector.tsx:89-98
const handlePlacemarkDrag = useCallback((evt: any) => {
  const coords = evt.get('coords');
  // ...
}, [performGeocoding]);
```

### Рекомендуемые улучшения оптимизации

| Приоритет | Оптимизация | Описание | Ожидаемый эффект |
|-----------|-------------|----------|------------------|
| 🔴 Высокий | Image Lazy Loading | Ленивая загрузка изображений в списке объявлений | -30% начального веса страницы |
| 🔴 Высокий | CDN для статики | Размещение изображений и бандлов на CDN | -50% времени загрузки |
| 🔴 Высокий | Database Indexes | Индексы на часто используемых полях (category_id, user_id, created_at) | -70% времени запросов |
| 🟡 Средний | Virtual Scrolling | Виртуализация длинных списков объявлений | Плавная прокрутка при 100+ элементах |
| 🟡 Средний | Service Worker | Offline режим и кэширование статики | Работа без интернета, мгновенная загрузка |
| 🟡 Средний | Gzip/Brotli | Сжатие текстовых ресурсов на сервере | -60% размера HTML/CSS/JS |
| 🟡 Средний | React Query Prefetch | Предзагрузка данных при наведении на категорию | Мгновенный переход между страницами |
| 🟢 Низкий | WebP формат | Конвертация изображений в WebP/AVIF | -25% размера изображений |
| 🟢 Низкий | Tree Shaking | Удаление неиспользуемого кода | -10% размера бандла |
| 🟢 Низкий | Preload критичных ресурсов | Предзагрузка шрифтов и критичных стилей | Улучшение LCP |

### Пример ленивой загрузки изображений

```tsx
// client/src/components/ad-card.tsx (рекомендуемое улучшение)
<img
  src={imageUrl}
  alt={title}
  loading="lazy"
  decoding="async"
  className="w-full h-48 object-cover"
/>
```

### Пример виртуализации списка

```tsx
// client/src/pages/home.tsx (рекомендуемое улучшение)
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualAdList({ ads }) {
  const parentRef = useRef(null);
  
  const virtualizer = useVirtualizer({
    count: ads.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 300,
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <AdCard
            key={ads[virtualRow.index].id}
            ad={ads[virtualRow.index]}
            style={{ transform: `translateY(${virtualRow.start}px)` }}
          />
        ))}
      </div>
    </div>
  );
}
```

### Пример добавления индексов БД

```sql
-- migrations/0008_add_indexes.sql (рекомендуемая миграция)
CREATE INDEX IF NOT EXISTS idx_ads_category_id ON ads(category_id);
CREATE INDEX IF NOT EXISTS idx_ads_user_id ON ads(user_id);
CREATE INDEX IF NOT EXISTS idx_ads_created_at ON ads(created_at);
CREATE INDEX IF NOT EXISTS idx_ads_location ON ads(location);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
```

### Метрики производительности

**Целевые значения:**

| Метрика | Текущее | Цель | Приоритет |
|---------|---------|------|-----------|
| LCP (Largest Contentful Paint) | ~2.5s | <1.5s | Высокий |
| FID (First Input Delay) | ~100ms | <50ms | Средний |
| CLS (Cumulative Layout Shift) | ~0.1 | <0.1 | Средний |
| TTI (Time to Interactive) | ~3.5s | <2.0s | Высокий |
| TTFB (Time to First Byte) | ~200ms | <100ms | Высокий |

---

## Заключение

Данное клиент-серверное приложение представляет собой современную доску объявлений с полным набором функций:

- **Аутентификация** через JWT токены
- **Управление объявлениями** с изображениями и спецификациями
- **Корзина покупок** с возможностью оформления заказа
- **Интеграция с Яндекс Картами** для выбора местоположения
- **Платёжная система** с поддержкой СБП
- **Контейнеризация** для простого развёртывания

Архитектура приложения следует лучшим практикам:
- Разделение на клиент и сервер
- Типобезопасность через TypeScript и общие схемы
- REST API для коммуникации
- PostgreSQL для надёжного хранения данных
- Docker для изоляции и оркестрации
