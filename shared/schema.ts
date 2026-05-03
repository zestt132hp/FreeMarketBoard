import { pgTable, text, serial, integer, boolean, timestamp, decimal, foreignKey, jsonb, index } from "drizzle-orm/pg-core";
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

// Addresses table - stored delivery addresses for users
export const addresses = pgTable("addresses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  recipientName: text("recipient_name").notNull(),
  recipientPhone: text("recipient_phone").notNull(),
  recipientEmail: text("recipient_email").notNull(),
  region: text("region").notNull(),
  city: text("city").notNull(),
  district: text("district"),
  street: text("street").notNull(),
  building: text("building").notNull(),
  apartment: text("apartment"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("addresses_user_id_idx").on(table.userId),
  isDefaultIdx: index("addresses_is_default_idx").on(table.userId, table.isDefault),
}));

// Orders table
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  status: text("status").notNull().default('pending'), // pending, paid, shipped, delivered, cancelled
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(), // sbp, card, installments
  deliveryMethod: text("delivery_method").notNull().default('courier'),
  recipientName: text("recipient_name").notNull(),
  recipientPhone: text("recipient_phone").notNull(),
  recipientEmail: text("recipient_email").notNull(),
  deliveryRegion: text("delivery_region").notNull(),
  deliveryCity: text("delivery_city").notNull(),
  deliveryDistrict: text("delivery_district"),
  deliveryStreet: text("delivery_street").notNull(),
  deliveryBuilding: text("delivery_building").notNull(),
  deliveryApartment: text("delivery_apartment"),
  addressId: integer("address_id"), // reference to saved address
  qrCode: text("qr_code"), // QR code for payment
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("orders_user_id_idx").on(table.userId),
  statusIdx: index("orders_status_idx").on(table.status),
  createdAtIdx: index("orders_created_at_idx").on(table.createdAt),
}));

// Order items table
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  adId: integer("ad_id").notNull(),
  title: text("title").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  imagePath: text("image_path"),
}, (table) => ({
  orderIdIdx: index("order_items_order_id_idx").on(table.orderId),
  adIdIdx: index("order_items_ad_id_idx").on(table.adId),
}));

// Specification templates - defines what specs each category has
export const specificationTemplates = pgTable("specification_templates", {
  id: serial("id").notNull().primaryKey(),
  categoryId: integer("category_id").notNull().references(() => categories.id),
  key: text("key").notNull(),
  label: text("label").notNull(),
  type: text("type").notNull(), // 'text' | 'number' | 'select' | 'boolean'
  required: boolean("required").default(false),
  placeholder: text("placeholder"),
});

// Specification options - values for select-type specs
export const specificationOptions = pgTable("specification_options", {
  id: serial("id").notNull().primaryKey(),
  templateId: integer("template_id").notNull().references(() => specificationTemplates.id),
  value: text("value").notNull(),
  sortOrder: integer("sort_order").default(0),
});

// Ad specifications - actual values for each ad
export const adSpecifications = pgTable("ad_specifications", {
  id: serial("id").notNull().primaryKey(),
  adId: integer("ad_id").notNull().references(() => ads.id),
  templateId: integer("template_id").notNull().references(() => specificationTemplates.id),
  value: text("value").notNull(),
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
  latitude: z.string()
    .optional()
    .refine(
      (val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= -90 && parseFloat(val) <= 90),
      { message: "Широта должна быть между -90 и 90" }
    ),
  longitude: z.string()
    .optional()
    .refine(
      (val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= -180 && parseFloat(val) <= 180),
      { message: "Долгота должна быть между -180 и 180" }
    ),
  // Allow both file objects and string paths for images
  images: z.array(z.union([z.instanceof(File), z.string()])).optional(),
}).omit({ userId: true });

// Dynamic form schema with category-specific validation
export function createAdFormSchema(category: string) {
  const baseSchema = insertAdSchema.extend({
    specifications: z.record(z.any()).optional(),
    price: z.string().min(1, "Price is required").regex(/^\d+(\.\d{1,2})?$/, "Price must be a number"),
    latitude: z.string()
      .optional()
      .refine(
        (val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= -90 && parseFloat(val) <= 90),
        { message: "Широта должна быть между -90 и 90" }
      ),
    longitude: z.string()
      .optional()
      .refine(
        (val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= -180 && parseFloat(val) <= 180),
        { message: "Долгота должна быть между -180 и 180" }
      ),
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

export const insertAddressSchema = createInsertSchema(addresses).omit({
  id: true,
  createdAt: true,
  isDefault: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  qrCode: true,
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
});

// Checkout DTO schema
export const checkoutDtoSchema = z.object({
  paymentMethod: z.enum(['sbp', 'card', 'installments']),
  recipientName: z.string().min(1, "ФИО обязательно"),
  recipientPhone: z.string().min(8, "Номер телефона обязателен"),
  recipientEmail: z.string().email("Некорректный email"),
  deliveryRegion: z.string().min(1, "Регион обязателен"),
  deliveryCity: z.string().min(1, "Город обязателен"),
  deliveryDistrict: z.string().optional(),
  deliveryStreet: z.string().min(1, "Улица обязательна"),
  deliveryBuilding: z.string().min(1, "Дом обязателен"),
  deliveryApartment: z.string().optional(),
  saveAddress: z.boolean().default(false),
  items: z.array(z.object({
    adId: z.number(),
    title: z.string(),
    price: z.string(),
    quantity: z.number().default(1),
    imagePath: z.string().optional(),
  })),
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
export type Address = typeof addresses.$inferSelect;
export type InsertAddress = z.infer<typeof insertAddressSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type CheckoutDto = z.infer<typeof checkoutDtoSchema>;
export type SpecificationTemplate = typeof specificationTemplates.$inferSelect;
export type InsertSpecificationTemplate = z.infer<typeof createInsertSchema<typeof specificationTemplates>>;
export type SpecificationOption = typeof specificationOptions.$inferSelect;
export type InsertSpecificationOption = z.infer<typeof createInsertSchema<typeof specificationOptions>>;
export type AdSpecification = typeof adSpecifications.$inferSelect;
export type InsertAdSpecification = z.infer<typeof createInsertSchema<typeof adSpecifications>>;

// Extended types with relations (for API responses)
export type AdWithRelations = Ad & {
  category?: Category;
  images?: Image[];
  seller?: User;
  specifications?: AdSpecificationWithTemplate[];
};

export type AdSpecificationWithTemplate = AdSpecification & {
  template?: SpecificationTemplate;
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
