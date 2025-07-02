import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").notNull().primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ads = pgTable("ads", {
  id: serial("id").notNull().primaryKey(),
  title: text("title").notNull(),
  shortDescription: text("short_description").notNull(),
  fullDescription: text("full_description").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(),
  location: text("location").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  images: text("images").array().notNull(),
  specifications: text("specifications").notNull(), // JSON string
  userId: integer("user_id").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  adId: integer("ad_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertAdSchema = createInsertSchema(ads).omit({
  id: true,
  createdAt: true,
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
  createdAt: true,
});

// Login schema
export const loginSchema = z.object({
  phone: z.string().min(10, "Номер телефона должен содержать не менее 10 цифр."),
  password: z.string().min(6, "Пароль должен содержать не менее 6 символов"),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Ad = typeof ads.$inferSelect;
export type InsertAd = z.infer<typeof insertAdSchema>;
export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type LoginData = z.infer<typeof loginSchema>;

// Categories
export const categories = [
  { id: "all", name: "Все Категории", icon: "th-large" },
  { id: "electronics", name: "Электроника", icon: "laptop" },
  { id: "furniture", name: "Мебель", icon: "couch" },
  { id: "cars", name: "Автомобили", icon: "car" },
  { id: "work", name: "Работа", icon: "briefcase" },
  { id: "clothing", name: "Одежда", icon: "tshirt" },
  { id: "home", name: "Дом & Сад", icon: "home" },
];
