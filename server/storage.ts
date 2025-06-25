import { users, ads, cartItems, type User, type InsertUser, type Ad, type InsertAd, type CartItem, type InsertCartItem } from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Ad operations
  getAds(category?: string, search?: string): Promise<Ad[]>;
  getAd(id: number): Promise<Ad | undefined>;
  createAd(ad: InsertAd): Promise<Ad>;
  getUserAds(userId: number): Promise<Ad[]>;
  updateAd(id: number, ad: Partial<Ad>): Promise<Ad | undefined>;
  deleteAd(id: number): Promise<boolean>;
  
  // Cart operations
  getCartItems(userId: number): Promise<CartItem[]>;
  addToCart(cartItem: InsertCartItem): Promise<CartItem>;
  removeFromCart(userId: number, adId: number): Promise<boolean>;
  clearCart(userId: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private ads: Map<number, Ad>;
  private cartItems: Map<number, CartItem>;
  private currentUserId: number;
  private currentAdId: number;
  private currentCartId: number;

  constructor() {
    this.users = new Map();
    this.ads = new Map();
    this.cartItems = new Map();
    this.currentUserId = 1;
    this.currentAdId = 1;
    this.currentCartId = 1;
    
    // Initialize with some sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
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
        category: "electronics",
        location: "New York, NY",
        latitude: "40.7128",
        longitude: "-74.0060",
        images: ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400"],
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
        category: "furniture",
        location: "Los Angeles, CA",
        latitude: "34.0522",
        longitude: "-118.2437",
        images: ["https://images.unsplash.com/photo-1555041469-a586c61ea9bc?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400"],
        specifications: JSON.stringify({
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
        category: "cars",
        location: "Chicago, IL",
        latitude: "41.8781",
        longitude: "-87.6298",
        images: ["https://images.unsplash.com/photo-1555215695-3004980ad54e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400"],
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

  async getAds(category?: string, search?: string): Promise<Ad[]> {
    let filteredAds = Array.from(this.ads.values()).filter(ad => ad.isActive);
    
    if (category && category !== "all") {
      filteredAds = filteredAds.filter(ad => ad.category === category);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredAds = filteredAds.filter(ad => 
        ad.title.toLowerCase().includes(searchLower) ||
        ad.shortDescription.toLowerCase().includes(searchLower) ||
        ad.location.toLowerCase().includes(searchLower)
      );
    }
    
    return filteredAds.sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async getAd(id: number): Promise<Ad | undefined> {
    return this.ads.get(id);
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

  async getUserAds(userId: number): Promise<Ad[]> {
    return Array.from(this.ads.values()).filter(ad => ad.userId === userId);
  }

  async updateAd(id: number, updateData: Partial<Ad>): Promise<Ad | undefined> {
    const existingAd = this.ads.get(id);
    if (!existingAd) return undefined;
    
    const updatedAd = { ...existingAd, ...updateData };
    this.ads.set(id, updatedAd);
    return updatedAd;
  }

  async deleteAd(id: number): Promise<boolean> {
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
}

export const storage = new MemStorage();
