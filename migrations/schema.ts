import { pgTable, serial, integer, timestamp, unique, text, foreignKey, numeric, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const cartItems = pgTable("cart_items", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	adId: integer("ad_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	phone: text().notNull(),
	password: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("users_phone_unique").on(table.phone),
]);

export const ads = pgTable("ads", {
	id: serial().primaryKey().notNull(),
	title: text().notNull(),
	shortDescription: text("short_description").notNull(),
	fullDescription: text("full_description").notNull(),
	price: numeric({ precision: 10, scale:  2 }).notNull(),
	location: text().notNull(),
	latitude: numeric({ precision: 10, scale:  8 }),
	longitude: numeric({ precision: 11, scale:  8 }),
	specifications: text().notNull(),
	userId: integer("user_id").notNull(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	categoryId: integer("category_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "ads_category_id_categories_id_fk"
		}),
]);

export const categories = pgTable("categories", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	icon: text().notNull(),
	slug: text().notNull(),
	parentId: integer("parent_id"),
}, (table) => [
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "categories_parent_id_categories_id_fk"
		}),
	unique("categories_slug_unique").on(table.slug),
]);

export const images = pgTable("images", {
	id: serial().primaryKey().notNull(),
	path: text().notNull(),
	adId: integer("ad_id").notNull(),
	order: integer().default(0),
	isPrimary: boolean("is_primary").default(false),
}, (table) => [
	foreignKey({
			columns: [table.adId],
			foreignColumns: [ads.id],
			name: "images_ad_id_ads_id_fk"
		}),
]);

export const adSpecifications = pgTable("ad_specifications", {
	id: serial().primaryKey().notNull(),
	adId: integer("ad_id").notNull(),
	templateId: integer("template_id").notNull(),
	value: text().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.adId],
			foreignColumns: [ads.id],
			name: "ad_specifications_ad_id_ads_id_fk"
		}),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [specificationTemplates.id],
			name: "ad_specifications_template_id_specification_templates_id_fk"
		}),
]);

export const specificationTemplates = pgTable("specification_templates", {
	id: serial().primaryKey().notNull(),
	categoryId: integer("category_id").notNull(),
	key: text().notNull(),
	label: text().notNull(),
	type: text().notNull(),
	required: boolean().default(false),
	placeholder: text(),
}, (table) => [
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "specification_templates_category_id_categories_id_fk"
		}),
]);

export const specificationOptions = pgTable("specification_options", {
	id: serial().primaryKey().notNull(),
	templateId: integer("template_id").notNull(),
	value: text().notNull(),
	sortOrder: integer("sort_order").default(0),
}, (table) => [
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [specificationTemplates.id],
			name: "specification_options_template_id_specification_templates_id_fk"
		}),
]);
