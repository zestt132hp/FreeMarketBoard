import { relations } from "drizzle-orm/relations";
import { categories, ads, images, adSpecifications, specificationTemplates, specificationOptions } from "./schema";

export const adsRelations = relations(ads, ({one, many}) => ({
	category: one(categories, {
		fields: [ads.categoryId],
		references: [categories.id]
	}),
	images: many(images),
	adSpecifications: many(adSpecifications),
}));

export const categoriesRelations = relations(categories, ({one, many}) => ({
	ads: many(ads),
	category: one(categories, {
		fields: [categories.parentId],
		references: [categories.id],
		relationName: "categories_parentId_categories_id"
	}),
	categories: many(categories, {
		relationName: "categories_parentId_categories_id"
	}),
	specificationTemplates: many(specificationTemplates),
}));

export const imagesRelations = relations(images, ({one}) => ({
	ad: one(ads, {
		fields: [images.adId],
		references: [ads.id]
	}),
}));

export const adSpecificationsRelations = relations(adSpecifications, ({one}) => ({
	ad: one(ads, {
		fields: [adSpecifications.adId],
		references: [ads.id]
	}),
	specificationTemplate: one(specificationTemplates, {
		fields: [adSpecifications.templateId],
		references: [specificationTemplates.id]
	}),
}));

export const specificationTemplatesRelations = relations(specificationTemplates, ({one, many}) => ({
	adSpecifications: many(adSpecifications),
	category: one(categories, {
		fields: [specificationTemplates.categoryId],
		references: [categories.id]
	}),
	specificationOptions: many(specificationOptions),
}));

export const specificationOptionsRelations = relations(specificationOptions, ({one}) => ({
	specificationTemplate: one(specificationTemplates, {
		fields: [specificationOptions.templateId],
		references: [specificationTemplates.id]
	}),
}));