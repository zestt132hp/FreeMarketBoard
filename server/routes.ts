import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema, insertUserSchema, insertAdSchema, insertCartItemSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Extend Express Request interface to include user property
interface AuthenticatedRequest extends Request {
  user: { userId: number; phone: string };
}

// Middleware to verify JWT token
function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }
    (req as AuthenticatedRequest).user = user;
    next();
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByPhone(userData.phone);
      if (existingUser) {
        return res.status(400).json({ message: "User with this phone number already exists" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });
      
      // Generate token
      const token = jwt.sign({ userId: user.id, phone: user.phone }, JWT_SECRET);
      
      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
        },
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid registration data" });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const loginData = loginSchema.parse(req.body);
      
      // Find user
      const user = await storage.getUserByPhone(loginData.phone);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Verify password
      const validPassword = await bcrypt.compare(loginData.password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Generate token
      const token = jwt.sign({ userId: user.id, phone: user.phone }, JWT_SECRET);
      
      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
        },
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid login data" });
    }
  });

  app.get("/api/me", authenticateToken, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = await storage.getUser(authReq.user.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({
        id: user.id,
        name: user.name,
        phone: user.phone,
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Ad routes
  app.get("/api/ads", async (req, res) => {
    try {
      const { category, search } = req.query;
      const ads = await storage.getAds(
        category as string,
        search as string
      );
      res.json(ads);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/ads/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const ad = await storage.getAd(id);
      
      if (!ad) {
        return res.status(404).json({ message: "Ad not found" });
      }
      
      // Get seller info
      const seller = await storage.getUser(ad.userId);
      
      res.json({
        ...ad,
        seller: seller ? {
          id: seller.id,
          name: seller.name,
          phone: seller.phone,
        } : null,
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/ads", authenticateToken, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const adData = insertAdSchema.parse({
        ...req.body,
        userId: authReq.user.userId,
      });
      
      const ad = await storage.createAd(adData);
      res.status(201).json(ad);
    } catch (error) {
      res.status(400).json({ message: "Invalid ad data" });
    }
  });

  app.get("/api/my-ads", authenticateToken, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const ads = await storage.getUserAds(authReq.user.userId);
      res.json(ads);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Cart routes
  app.get("/api/cart", authenticateToken, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const cartItems = await storage.getCartItems(authReq.user.userId);
      
      // Get ad details for each cart item
      const itemsWithAds = await Promise.all(
        cartItems.map(async (item) => {
          const ad = await storage.getAd(item.adId);
          return {
            ...item,
            ad,
          };
        })
      );
      
      res.json(itemsWithAds);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/cart", authenticateToken, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const cartData = insertCartItemSchema.parse({
        ...req.body,
        userId: authReq.user.userId,
      });
      
      const cartItem = await storage.addToCart(cartData);
      res.status(201).json(cartItem);
    } catch (error) {
      res.status(400).json({ message: "Invalid cart data" });
    }
  });

  app.delete("/api/cart/:adId", authenticateToken, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const adId = parseInt(req.params.adId);
      const success = await storage.removeFromCart(authReq.user.userId, adId);
      
      if (!success) {
        return res.status(404).json({ message: "Item not found in cart" });
      }
      
      res.json({ message: "Item removed from cart" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/cart", authenticateToken, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      await storage.clearCart(authReq.user.userId);
      res.json({ message: "Cart cleared" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
