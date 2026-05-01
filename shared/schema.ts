import { pgTable, text, serial, integer, boolean, timestamp, decimal, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { createSpecsSchema } from "./category-specs";

export const users = pgTable("users", {
  id: serial("id").notNull().primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").notNull().primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  slug: text("slug").notNull().unique(),
  parentId: integer("parent_id").references((): any => categories.id),
});

export const ads = pgTable("ads", {
  id: serial("id").notNull().primaryKey(),
  title: text("title").notNull(),
  shortDescription: text("short_description").notNull(),
  fullDescription: text("full_description").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  categoryId: integer("category_id").notNull().references(() => categories.id),
  location: text("location").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  specifications: text("specifications").notNull(), // JSON string
  userId: integer("user_id").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const images = pgTable("images", {
  id: serial("id").notNull().primaryKey(),
  path: text("path").notNull(),
  adId: integer("ad_id").notNull().references(() => ads.id),
  order: integer("order").default(0),
  isPrimary: boolean("is_primary").default(false),
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
}).extend({
  phone: z.string()
    .min(8, "Phone number must contain at least 8 digits")
    .max(15, "Phone number must contain no more than 15 digits")
    .regex(/^\d+$/, "Phone number must contain only digits"),
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
});

export const insertAdSchema = createInsertSchema(ads).omit({
  id: true,
  createdAt: true,
});

export const insertImageSchema = createInsertSchema(images).omit({
  id: true,
});

// Form schema for client-side validation (accepts object for specifications)
export const adFormSchema = insertAdSchema.extend({
  specifications: z.record(z.any()).optional(),
  price: z.string().min(1, "Price is required").regex(/^\d+(\.\d{1,2})?$/, "Price must be a number"),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  // Allow both file objects and string paths for images
  images: z.array(z.union([z.instanceof(File), z.string()])).optional(),
}).omit({ userId: true });

// Dynamic form schema with category-specific validation
export function createAdFormSchema(category: string) {
  const baseSchema = insertAdSchema.extend({
    specifications: z.record(z.any()).optional(),
    price: z.string().min(1, "Price is required").regex(/^\d+(\.\d{1,2})?$/, "Price must be a number"),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
    // Allow both file objects and string paths for images
    images: z.array(z.union([z.instanceof(File), z.string()])).optional(),
  }).omit({ userId: true });
  
  // Add category-specific validation for specifications
  const specsSchema = createSpecsSchema(category);
  
  return baseSchema.extend({
    specifications: specsSchema.optional()
  });
}

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
  createdAt: true,
});

// Login schema
export const loginSchema = z.object({
  phone: z.string()
    .min(8, "Phone number must contain at least 8 digits")
    .max(15, "Phone number must contain no more than 15 digits")
    .regex(/^\d+$/, "Phone number must contain only digits"),
  password: z.string().min(6, "Password must contain at least 6 characters"),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Ad = typeof ads.$inferSelect;
export type InsertAd = z.infer<typeof insertAdSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Image = typeof images.$inferSelect;
export type InsertImage = z.infer<typeof insertImageSchema>;
export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type LoginData = z.infer<typeof loginSchema>;

// Extended types with relations (for API responses)
export type AdWithRelations = Ad & {
  category?: Category;
  images?: Image[];
  seller?: User;
};

// Categories data (for reference - will be stored in database)
export const categoriesData = [
  { id: "all", name: "All Categories", icon: "th-large", slug: "all" },
  { id: "electronics", name: "Electronics", icon: "laptop", slug: "electronics" },
  { id: "furniture", name: "Furniture", icon: "couch", slug: "furniture" },
  { id: "cars", name: "Cars", icon: "car", slug: "cars" },
  { id: "work", name: "Work", icon: "briefcase", slug: "work" },
  { id: "clothing", name: "Clothing", icon: "tshirt", slug: "clothing" },
  { id: "home", name: "Home & Garden", icon: "home", slug: "home" },
];
