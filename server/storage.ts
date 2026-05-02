import {
  users, ads, cartItems, categories, images,
  specificationTemplates, specificationOptions, adSpecifications,
  orders, orderItems, addresses,
  type User, type InsertUser, type Ad, type InsertAd,
  type CartItem, type InsertCartItem, type Category, type InsertCategory,
  type Image, type InsertImage, type AdWithRelations,
  type SpecificationTemplate, type InsertSpecificationTemplate,
  type SpecificationOption, type InsertSpecificationOption,
  type AdSpecification, type InsertAdSpecification,
  type AdSpecificationWithTemplate,
  type Order, type InsertOrder,
  type OrderItem, type InsertOrderItem,
  type Address, type InsertAddress
} from "../shared/schema";
import { db } from "./db";
import { eq, ilike, and, or, asc, inArray } from "drizzle-orm";
import { logger } from "./logger"

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  
  // Category operations
  getCategories(): Promise<Category[]>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  getCategoryById(id: number): Promise<Category | undefined>;
  
  // Image operations
  getImagesByAdId(adId: number): Promise<Image[]>;
  addImage(image: InsertImage): Promise<Image>;
  addImages(imagesData: InsertImage[]): Promise<Image[]>;
  deleteImagesByAdId(adId: number): Promise<boolean>;
  
  // Ad operations
  getAds(category?: string, search?: string): Promise<AdWithRelations[]>;
  getAd(id: number): Promise<AdWithRelations | undefined>;
  createAd(ad: InsertAd): Promise<Ad>;
  getUserAds(userId: number): Promise<(Ad & { images: Image[] })[]>;
  updateAd(id: number, ad: Partial<Ad>): Promise<Ad | undefined>;
  deleteAd(id: number): Promise<boolean>;
  
  // Cart operations
  getCartItems(userId: number): Promise<CartItem[]>;
  addToCart(cartItem: InsertCartItem): Promise<CartItem>;
  removeFromCart(userId: number, adId: number): Promise<boolean>;
  clearCart(userId: number): Promise<boolean>;
  
  // Specification operations
  getSpecTemplates(categoryId: number): Promise<SpecificationTemplate[]>;
  getSpecTemplatesBySlug(categorySlug: string): Promise<SpecificationTemplate[]>;
  getSpecOptions(templateId: number): Promise<SpecificationOption[]>;
  getAdSpecifications(adId: number): Promise<AdSpecificationWithTemplate[]>;
  saveAdSpecifications(adId: number, specs: { templateId: number; value: string }[]): Promise<void>;
  deleteAdSpecifications(adId: number): Promise<boolean>;
  
  // Order operations
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order & { items: OrderItem[] }>;
  getOrders(userId: number): Promise<(Order & { items: OrderItem[] })[]>;
  getOrder(id: number): Promise<(Order & { items: OrderItem[] }) | undefined>;
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;
  
  // Address operations
  getAddresses(userId: number): Promise<Address[]>;
  createAddress(address: InsertAddress): Promise<Address>;
  updateAddress(id: number, updates: Partial<Address>): Promise<Address | undefined>;
  deleteAddress(id: number): Promise<boolean>;
  setDefaultAddress(userId: number, addressId: number): Promise<boolean>;
  getDefaultAddress(userId: number): Promise<Address | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private ads: Map<number, Ad>;
  private cartItems: Map<number, CartItem>;
  private categories: Map<number, Category>;
  private images: Map<number, Image>;
  private currentUserId: number;
  private currentAdId: number;
  private currentCartId: number;
  private currentCategoryId: number;
  private currentImageId: number;

  constructor() {
    this.users = new Map();
    this.ads = new Map();
    this.cartItems = new Map();
    this.categories = new Map();
    this.images = new Map();
    this.currentUserId = 1;
    this.currentAdId = 1;
    this.currentCartId = 1;
    this.currentCategoryId = 1;
    this.currentImageId = 1;
    
    // Initialize with some sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Sample categories
    const sampleCategories = [
      { id: 1, name: "Electronics", icon: "laptop", slug: "electronics", parentId: null },
      { id: 2, name: "Furniture", icon: "couch", slug: "furniture", parentId: null },
      { id: 3, name: "Cars", icon: "car", slug: "cars", parentId: null },
      { id: 4, name: "Work", icon: "briefcase", slug: "work", parentId: null },
      { id: 5, name: "Clothing", icon: "tshirt", slug: "clothing", parentId: null },
      { id: 6, name: "Home & Garden", icon: "home", slug: "home", parentId: null },
    ];
    
    sampleCategories.forEach(cat => {
      this.categories.set(cat.id, cat as Category);
    });

    // Sample users
    const sampleUsers = [
      { name: "Michael Johnson", phone: "+15551234567", password: "password123" },
      { name: "Sarah Wilson", phone: "+15557654321", password: "password123" },
    ];
    
    sampleUsers.forEach(user => {
      const newUser: User = {
        id: this.currentUserId++,
        ...user,
        createdAt: new Date(),
      };
      this.users.set(newUser.id, newUser);
    });

    // Sample ads
    const sampleAds = [
      {
        title: "iPhone 14 Pro Max",
        shortDescription: "Latest iPhone with advanced camera system and A16 Bionic chip. Excellent condition, barely used.",
        fullDescription: "Latest iPhone 14 Pro Max with advanced camera system and A16 Bionic chip. This phone is in excellent condition, barely used for 3 months. Comes with original box, charger, and unused EarPods. The device has been kept in a protective case and screen protector since day one. No scratches or dents visible. Battery health is at 98%. Perfect for anyone looking for a premium smartphone experience.",
        price: "899.00",
        categoryId: 1,
        location: "New York, NY",
        latitude: "40.7128",
        longitude: "-74.0060",
        specifications: JSON.stringify({
          brand: "Apple",
          model: "iPhone 14 Pro Max",
          storage: "256GB",
          condition: "Like New"
        }),
        userId: 1,
        isActive: true,
      },
      {
        title: "Modern Sectional Sofa",
        shortDescription: "Comfortable L-shaped sectional sofa in excellent condition. Perfect for modern living rooms.",
        fullDescription: "Beautiful modern sectional sofa in excellent condition. This L-shaped sofa is perfect for any contemporary living room. Made with high-quality fabric and sturdy frame construction. Very comfortable seating for up to 6 people. Dimensions: 120\" x 85\" x 35\". Non-smoking, pet-free home. Must be picked up due to size.",
        price: "1200.00",
        categoryId: 2,
        location: "Los Angeles, CA",
        latitude: "34.0522",
        longitude: "-118.2437",
        specifications: JSON.stringify({
          type: "Sofa",
          brand: "West Elm",
          material: "Fabric",
          color: "Gray",
          condition: "Excellent"
        }),
        userId: 2,
        isActive: true,
      },
      {
        title: "BMW 3 Series 2020",
        shortDescription: "Well-maintained BMW with low mileage. Full service history available.",
        fullDescription: "2020 BMW 3 Series 330i in excellent condition. This vehicle has been meticulously maintained with full service history. Low mileage at only 25,000 miles. Features include leather seats, navigation system, backup camera, and premium sound system. No accidents, clean title. Perfect for someone looking for a reliable luxury sedan.",
        price: "28500.00",
        categoryId: 3,
        location: "Chicago, IL",
        latitude: "41.8781",
        longitude: "-87.6298",
        specifications: JSON.stringify({
          brand: "BMW",
          model: "3 Series 330i",
          year: "2020",
          mileage: "25,000",
          condition: "Excellent"
        }),
        userId: 1,
        isActive: true,
      },
    ];

    sampleAds.forEach(ad => {
      const newAd: Ad = {
        id: this.currentAdId++,
        ...ad,
        createdAt: new Date(),
      };
      this.ads.set(newAd.id, newAd);
    });

    // Sample images - will be added after ads are created
    // Images are added dynamically when ads are fetched
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.phone === phone);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    return Array.from(this.categories.values()).find(cat => cat.slug === slug);
  }

  async getCategoryById(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  // Image operations
  async getImagesByAdId(adId: number): Promise<Image[]> {
    return Array.from(this.images.values())
      .filter(img => img.adId === adId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  async addImage(imageData: InsertImage): Promise<Image> {
    const id = this.currentImageId++;
    const image: Image = {
      ...imageData,
      id,
      order: imageData.order ?? 0,
      isPrimary: imageData.isPrimary ?? false,
    };
    this.images.set(id, image);
    return image;
  }

  async addImages(imagesData: InsertImage[]): Promise<Image[]> {
    return Promise.all(imagesData.map(img => this.addImage(img)));
  }

  async deleteImagesByAdId(adId: number): Promise<boolean> {
    const adImages = Array.from(this.images.entries()).filter(([_, img]) => img.adId === adId);
    adImages.forEach(([id, _]) => this.images.delete(id));
    return true;
  }

  // Ad operations with category and images
  async getAds(categorySlug?: string, search?: string): Promise<AdWithRelations[]> {
    let filteredAds = Array.from(this.ads.values()).filter(ad => ad.isActive);
    
    if (categorySlug && categorySlug !== "all") {
      const category = await this.getCategoryBySlug(categorySlug);
      if (category) {
        filteredAds = filteredAds.filter(ad => ad.categoryId === category.id);
      }
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredAds = filteredAds.filter(ad => 
        ad.title.toLowerCase().includes(searchLower) ||
        ad.shortDescription.toLowerCase().includes(searchLower) ||
        ad.location.toLowerCase().includes(searchLower)
      );
    }
    
    const adsWithDetails = await Promise.all(
      filteredAds
        .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime())
        .map(async ad => {
          const category = await this.getCategoryById(ad.categoryId) || { id: 0, name: "Unknown", icon: "", slug: "", parentId: null };
          const adImages = await this.getImagesByAdId(ad.id);
          return { ...ad, category, images: adImages };
        })
    );
    
    return adsWithDetails;
  }

  async getAd(id: number): Promise<AdWithRelations | undefined> {
    const ad = this.ads.get(id);
    if (!ad) return undefined;
    
    const category = await this.getCategoryById(ad.categoryId) || { id: 0, name: "Unknown", icon: "", slug: "", parentId: null };
    const adImages = await this.getImagesByAdId(ad.id);
    
    return { ...ad, category, images: adImages };
  }

  async createAd(insertAd: InsertAd): Promise<Ad> {
    const id = this.currentAdId++;
    const ad: Ad = { 
      ...insertAd, 
      id, 
      createdAt: new Date(),
      latitude: insertAd.latitude || null,
      longitude: insertAd.longitude || null,
      isActive: insertAd.isActive ?? true
    };
    this.ads.set(id, ad);
    return ad;
  }

  async getUserAds(userId: number): Promise<(Ad & { images: Image[] })[]> {
    const userAds = Array.from(this.ads.values()).filter(ad => ad.userId === userId);
    return Promise.all(
      userAds.map(async ad => ({
        ...ad,
        images: await this.getImagesByAdId(ad.id)
      }))
    );
  }

  async updateAd(id: number, updateData: Partial<Ad>): Promise<Ad | undefined> {
    const existingAd = this.ads.get(id);
    if (!existingAd) return undefined;
    
    const updatedAd = { ...existingAd, ...updateData };
    this.ads.set(id, updatedAd);
    return updatedAd;
  }

  async deleteAd(id: number): Promise<boolean> {
    await this.deleteImagesByAdId(id);
    return this.ads.delete(id);
  }

  async getCartItems(userId: number): Promise<CartItem[]> {
    return Array.from(this.cartItems.values()).filter(item => item.userId === userId);
  }

  async addToCart(insertCartItem: InsertCartItem): Promise<CartItem> {
    // Check if item already exists in cart
    const existing = Array.from(this.cartItems.values()).find(
      item => item.userId === insertCartItem.userId && item.adId === insertCartItem.adId
    );
    
    if (existing) {
      return existing;
    }
    
    const id = this.currentCartId++;
    const cartItem: CartItem = { 
      ...insertCartItem, 
      id, 
      createdAt: new Date() 
    };
    this.cartItems.set(id, cartItem);
    return cartItem;
  }

  async removeFromCart(userId: number, adId: number): Promise<boolean> {
    const item = Array.from(this.cartItems.entries()).find(
      ([_, item]) => item.userId === userId && item.adId === adId
    );
    
    if (item) {
      return this.cartItems.delete(item[0]);
    }
    
    return false;
  }

  async clearCart(userId: number): Promise<boolean> {
    const userItems = Array.from(this.cartItems.entries()).filter(
      ([_, item]) => item.userId === userId
    );
    
    userItems.forEach(([id, _]) => this.cartItems.delete(id));
    return true;
  }

  // Specification operations (stub implementations for MemStorage)
  async getSpecTemplates(categoryId: number): Promise<SpecificationTemplate[]> {
    // Return empty array - MemStorage doesn't support specifications
    return [];
  }

  async getSpecTemplatesBySlug(categorySlug: string): Promise<SpecificationTemplate[]> {
    return [];
  }

  async getSpecOptions(templateId: number): Promise<SpecificationOption[]> {
    return [];
  }

  async getAdSpecifications(adId: number): Promise<AdSpecificationWithTemplate[]> {
    return [];
  }

  async saveAdSpecifications(adId: number, specs: { templateId: number; value: string }[]): Promise<void> {
    // No-op for MemStorage
  }

  async deleteAdSpecifications(adId: number): Promise<boolean> {
    return true;
  }
  
  // Order operations (stub for MemStorage)
  async createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order & { items: OrderItem[] }> {
    throw new Error("Not implemented in MemStorage");
  }
  
  async getOrders(userId: number): Promise<(Order & { items: OrderItem[] })[]> {
    return [];
  }
  
  async getOrder(id: number): Promise<(Order & { items: OrderItem[] }) | undefined> {
    return undefined;
  }
  
  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    return undefined;
  }
  
  // Address operations (stub for MemStorage)
  async getAddresses(userId: number): Promise<Address[]> {
    return [];
  }
  
  async createAddress(address: InsertAddress): Promise<Address> {
    throw new Error("Not implemented in MemStorage");
  }
  
  async updateAddress(id: number, updates: Partial<Address>): Promise<Address | undefined> {
    return undefined;
  }
  
  async deleteAddress(id: number): Promise<boolean> {
    return false;
  }
  
  async setDefaultAddress(userId: number, addressId: number): Promise<boolean> {
    return false;
  }
  
  async getDefaultAddress(userId: number): Promise<Address | undefined> {
    return undefined;
  }
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    try{
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || undefined;
    }
    catch(error){
      logger.error('Database query failed', { 
      query: 'getUser',
      params: { id },
      error 
    });

    throw error;    
    }
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        name: insertUser.name,
        phone: insertUser.phone,
        password: insertUser.password
      })
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    try {
      const [user] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, id))
        .returning();
      return user || undefined;
    } catch (error) {
      logger.error('Database update failed', {
        query: 'updateUser',
        params: { id, updates },
        error
      });
      throw error;
    }
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(asc(categories.name));
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.slug, slug));
    return category || undefined;
  }

  async getCategoryById(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  // Image operations
  async getImagesByAdId(adId: number): Promise<Image[]> {
    return await db.select().from(images).where(eq(images.adId, adId)).orderBy(asc(images.order));
  }

  async addImage(imageData: InsertImage): Promise<Image> {
    const [image] = await db.insert(images).values(imageData).returning();
    return image;
  }

  async addImages(imagesData: InsertImage[]): Promise<Image[]> {
    if (imagesData.length === 0) return [];
    const inserted = await db.insert(images).values(imagesData).returning();
    return inserted;
  }

  async deleteImagesByAdId(adId: number): Promise<boolean> {
    await db.delete(images).where(eq(images.adId, adId));
    return true;
  }

  // Ad operations with category and images
  async getAds(categorySlug?: string, search?: string): Promise<AdWithRelations[]> {
    const conditions = [];
    
    if (categorySlug && categorySlug !== "all") {
      const category = await this.getCategoryBySlug(categorySlug);
      if (category) {
        conditions.push(eq(ads.categoryId, category.id));
      }
    }
    
    if (search) {
      conditions.push(
        or(
          ilike(ads.title, `%${search}%`),
          ilike(ads.fullDescription, `%${search}%`),
          ilike(ads.shortDescription, `%${search}%`)
        )
      );
    }
    
    const adsQuery = conditions.length > 0 
      ? await db.select().from(ads).where(and(...conditions))
      : await db.select().from(ads);

    // Get categories and images for each ad
    const adsWithDetails = await Promise.all(
      adsQuery.map(async ad => {
        const category = await this.getCategoryById(ad.categoryId) || { id: 0, name: "Unknown", icon: "", slug: "", parentId: null } as Category;
        const adImages = await this.getImagesByAdId(ad.id);
        return { ...ad, category, images: adImages };
      })
    );

    return adsWithDetails;
  }

  async getAd(id: number): Promise<AdWithRelations | undefined> {
    const [ad] = await db.select().from(ads).where(eq(ads.id, id));
    if (!ad) return undefined;
    
    const category = await this.getCategoryById(ad.categoryId) || { id: 0, name: "Unknown", icon: "", slug: "", parentId: null } as Category;
    const adImages = await this.getImagesByAdId(ad.id);
    
    return { ...ad, category, images: adImages };
  }

  async createAd(insertAd: InsertAd): Promise<Ad> {
    const [ad] = await db
      .insert(ads)
      .values(insertAd)
      .returning();
    return ad;
  }

  async getUserAds(userId: number): Promise<(Ad & { images: Image[] })[]> {
    const userAds = await db.select().from(ads).where(eq(ads.userId, userId));
    
    return Promise.all(
      userAds.map(async ad => ({
        ...ad,
        images: await this.getImagesByAdId(ad.id)
      }))
    );
  }

  async updateAd(id: number, updateData: Partial<Ad>): Promise<Ad | undefined> {
    const [ad] = await db
      .update(ads)
      .set(updateData)
      .where(eq(ads.id, id))
      .returning();
    return ad || undefined;
  }

  async deleteAd(id: number): Promise<boolean> {
    await this.deleteImagesByAdId(id);
    const result = await db.delete(ads).where(eq(ads.id, id));
    return (result.count || 0) > 0;
  }

  // Cart operations
  async getCartItems(userId: number): Promise<CartItem[]> {
    return await db.select().from(cartItems).where(eq(cartItems.userId, userId));
  }

  async addToCart(insertCartItem: InsertCartItem): Promise<CartItem> {
    const [cartItem] = await db
      .insert(cartItems)
      .values(insertCartItem)
      .returning();
    return cartItem;
  }

  async removeFromCart(userId: number, adId: number): Promise<boolean> {
    const result = await db
      .delete(cartItems)
      .where(and(eq(cartItems.userId, userId), eq(cartItems.adId, adId)));
    return (result.count || 0) > 0;
  }

  async clearCart(userId: number): Promise<boolean> {
    const result = await db.delete(cartItems).where(eq(cartItems.userId, userId));
    return (result.count || 0) > 0;
  }

  // Specification operations
  async getSpecTemplates(categoryId: number): Promise<SpecificationTemplate[]> {
    return await db
      .select()
      .from(specificationTemplates)
      .where(eq(specificationTemplates.categoryId, categoryId))
      .orderBy(asc(specificationTemplates.id));
  }

  async getSpecTemplatesBySlug(categorySlug: string): Promise<SpecificationTemplate[]> {
    const category = await this.getCategoryBySlug(categorySlug);
    if (!category) return [];
    
    return await this.getSpecTemplates(category.id);
  }

  async getSpecOptions(templateId: number): Promise<SpecificationOption[]> {
    return await db
      .select()
      .from(specificationOptions)
      .where(eq(specificationOptions.templateId, templateId))
      .orderBy(asc(specificationOptions.sortOrder));
  }

  async getAdSpecifications(adId: number): Promise<AdSpecificationWithTemplate[]> {
    const specs = await db
      .select({
        id: adSpecifications.id,
        adId: adSpecifications.adId,
        templateId: adSpecifications.templateId,
        value: adSpecifications.value,
        template: {
          id: specificationTemplates.id,
          categoryId: specificationTemplates.categoryId,
          key: specificationTemplates.key,
          label: specificationTemplates.label,
          type: specificationTemplates.type,
          required: specificationTemplates.required,
          placeholder: specificationTemplates.placeholder,
        },
      })
      .from(adSpecifications)
      .innerJoin(specificationTemplates, eq(adSpecifications.templateId, specificationTemplates.id))
      .where(eq(adSpecifications.adId, adId));

    return specs.map(spec => ({
      id: spec.id,
      adId: spec.adId,
      templateId: spec.templateId,
      value: spec.value,
      template: spec.template,
    }));
  }

  async saveAdSpecifications(adId: number, specs: { templateId: number; value: string }[]): Promise<void> {
    if (specs.length === 0) return;

    // Delete existing specifications for this ad
    await db.delete(adSpecifications).where(eq(adSpecifications.adId, adId));

    // Insert new specifications
    const values = specs.map(spec => ({
      adId,
      templateId: spec.templateId,
      value: spec.value,
    }));

    await db.insert(adSpecifications).values(values);
  }

  async deleteAdSpecifications(adId: number): Promise<boolean> {
    await db.delete(adSpecifications).where(eq(adSpecifications.adId, adId));
    return true;
  }
  
  // Order operations
  async createOrder(orderData: InsertOrder, itemsData: InsertOrderItem[]): Promise<Order & { items: OrderItem[] }> {
    // Create order
    const [order] = await db.insert(orders).values(orderData).returning();
    
    // Create order items
    const items = await Promise.all(
      itemsData.map(item =>
        db.insert(orderItems).values({ ...item, orderId: order.id }).returning()
          .then(res => res[0])
      )
    );
    
    return { ...order, items };
  }
  
  async getOrders(userId: number): Promise<(Order & { items: OrderItem[] })[]> {
    const userOrders = await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(orders.createdAt);
    
    return Promise.all(
      userOrders.map(async order => {
        const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
        return { ...order, items };
      })
    );
  }
  
  async getOrder(id: number): Promise<(Order & { items: OrderItem[] }) | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) return undefined;
    
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
    return { ...order, items };
  }
  
  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    const [order] = await db.update(orders).set({ status }).where(eq(orders.id, id)).returning();
    return order;
  }
  
  // Address operations
  async getAddresses(userId: number): Promise<Address[]> {
    return await db.select().from(addresses).where(eq(addresses.userId, userId)).orderBy(addresses.isDefault, addresses.createdAt);
  }
  
  async createAddress(addressData: InsertAddress): Promise<Address> {
    const [address] = await db.insert(addresses).values(addressData).returning();
    return address;
  }
  
  async updateAddress(id: number, updates: Partial<Address>): Promise<Address | undefined> {
    const [address] = await db.update(addresses).set(updates).where(eq(addresses.id, id)).returning();
    return address;
  }
  
  async deleteAddress(id: number): Promise<boolean> {
    const result = await db.delete(addresses).where(eq(addresses.id, id));
    return (result.count || 0) > 0;
  }
  
  async setDefaultAddress(userId: number, addressId: number): Promise<boolean> {
    // First, unset all default addresses for this user
    await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId));
    
    // Then set the specified address as default
    const [address] = await db.update(addresses)
      .set({ isDefault: true })
      .where(eq(addresses.id, addressId))
      .returning();
    
    return !!address;
  }
  
  async getDefaultAddress(userId: number): Promise<Address | undefined> {
    const [address] = await db.select().from(addresses)
      .where(eq(addresses.userId, userId))
      .where(eq(addresses.isDefault, true));
    return address;
  }
}

export const storage = new DatabaseStorage();
