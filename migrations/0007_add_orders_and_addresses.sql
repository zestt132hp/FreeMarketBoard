-- Migration 0007: Add orders and addresses tables

-- Create addresses table
CREATE TABLE IF NOT EXISTS addresses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  region TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT,
  street TEXT NOT NULL,
  building TEXT NOT NULL,
  apartment TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  delivery_method TEXT NOT NULL DEFAULT 'courier',
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  delivery_region TEXT NOT NULL,
  delivery_city TEXT NOT NULL,
  delivery_district TEXT,
  delivery_street TEXT NOT NULL,
  delivery_building TEXT NOT NULL,
  delivery_apartment TEXT,
  address_id INTEGER,
  qr_code TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  ad_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  image_path TEXT
);

-- Create indexes for addresses table
CREATE INDEX IF NOT EXISTS addresses_user_id_idx ON addresses(user_id);
CREATE INDEX IF NOT EXISTS addresses_is_default_idx ON addresses(user_id, is_default);

-- Create indexes for orders table
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders(user_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at);

-- Create indexes for order_items table
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id);
CREATE INDEX IF NOT EXISTS order_items_ad_id_idx ON order_items(ad_id);
