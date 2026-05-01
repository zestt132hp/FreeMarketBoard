import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs/promises";
import { storage } from "./storage";
import { db } from "./db";
import { loginSchema, insertUserSchema, insertAdSchema, insertCartItemSchema, insertImageSchema, type AdWithRelations, images } from "../shared/schema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import { logger } from './logger';
import { fileService } from './file-utils';
import { multipleUpload, handleUploadError } from './upload-middleware';
import { eq, inArray } from "drizzle-orm";

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
  // Добавляем middleware для логирования запросов
    app.use((req, res, next) => {
    logger.info(`${req.method} ${req.originalUrl}`);
    next();
  });

  // Добавляем обработчик ошибок БД
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
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

  // Auth routes
  app.post("/api/register", async (req, res) => {
    try {
      logger.debug('Registration attempt', { phone: req.body.phone });
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByPhone(userData.phone);
      if (existingUser) {
        logger.warn('Registration failed - user exists', { phone: userData.phone });
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
      logger.info('User registered successfully', { userId: user.id });

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
        },
      });
    } catch (error) {
      logger.error('Registration error', { error });
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
      logger.error('Invalid login data', { error });
      res.status(400).json({ message: "Invalid login data" });
    }
  });

  // Password reset endpoint (for development/testing)
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { phone, newPassword } = req.body;
      
      if (!phone || !newPassword) {
        return res.status(400).json({ message: "Phone and new password are required" });
      }
      
      // Find user by phone
      const user = await storage.getUserByPhone(phone);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update user password
      const updatedUser = await storage.updateUser(user.id, { password: hashedPassword });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update password" });
      }
      
      res.json({ message: "Password reset successfully" });
    } catch (error) {
      logger.error('Password reset error', { error });
      res.status(500).json({ message: "Internal server error" });
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
      logger.error('Server error', { error });
      res.status(500).json({ message: "Server error" });
    }
  });

  // Category routes
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      logger.error('Categories fetch error', { error });
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
      logger.error('Server error', { 
        error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        ...(error as any).response?.data && { response: (error as any).response.data }
  } : error});
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
      logger.error('Server error', { error });
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/ads", authenticateToken, multipleUpload, handleUploadError, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const files = req.files as Express.Multer.File[];
      const userId = authReq.user.userId;
      
      logger.info('Create ad request', {
        userId,
        hasFiles: files && files.length > 0,
        filesCount: files?.length,
        bodyKeys: Object.keys(req.body || {})
      });
      
      // Parse ad data from FormData или JSON
      let adData;
      let imagesData: Array<{ filename: string; originalName: string; order: number; isPrimary: boolean }> = [];
      
      // Проверяем, есть ли данные об изображениях в формате images[0][filename] или JSON-массиве
      if (req.body && typeof req.body === 'object') {
        logger.info('Request body', { body: req.body });
        
        // Проверяем, есть ли images (может быть строкой JSON или уже распарсенным массивом)
        if (req.body.images) {
          let parsedImages = req.body.images;
          // Если это строка, парсим JSON
          if (typeof req.body.images === 'string') {
            try {
              parsedImages = JSON.parse(req.body.images);
            } catch (err) {
              logger.warn('Failed to parse images JSON', { error: err });
            }
          }
          // Если это массив, обрабатываем
          if (Array.isArray(parsedImages)) {
            imagesData = parsedImages
              .filter(img => img.filename)
              .map((img: any, index: number) => ({
                filename: img.filename,
                originalName: img.originalName || img.filename,
                order: parseInt(img.order) || index,
                isPrimary: img.isPrimary === 'true' || img.isPrimary === true || index === 0
              }));
            logger.info('Parsed images', { imagesData });
          } else {
            logger.warn('Images is not an array', { images: parsedImages });
          }
        }
        
        // Если не найдено в JSON, проверяем формат images[0][filename]
        if (imagesData.length === 0) {
          const imageKeys = Object.keys(req.body).filter(key => key.startsWith('images['));
          
          // Группируем данные по изображениям
          const imagesMap = new Map<number, any>();
          imageKeys.forEach(key => {
            const match = key.match(/images\[(\d+)\]\[(\w+)\]/);
            if (match) {
              const index = parseInt(match[1]);
              const field = match[2];
              if (!imagesMap.has(index)) {
                imagesMap.set(index, {});
              }
              imagesMap.get(index)[field] = req.body[key];
            }
          });
          
          // Преобразуем в массив
          imagesData = Array.from(imagesMap.values())
            .filter(img => img.filename)
            .map((img, index) => ({
              filename: img.filename,
              originalName: img.originalName || img.filename,
              order: parseInt(img.order) || index,
              isPrimary: img.isPrimary === 'true' || index === 0
            }));
        }
        
        // Извлекаем данные объявления
        adData = insertAdSchema.parse({
          title: req.body.title,
          shortDescription: req.body.shortDescription,
          fullDescription: req.body.fullDescription,
          price: req.body.price,
          categoryId: parseInt(req.body.categoryId),
          location: req.body.location,
          latitude: req.body.latitude || null,
          longitude: req.body.longitude || null,
          specifications: req.body.specifications || '{}',
          isActive: req.body.isActive === 'true' || req.body.isActive === true,
          userId: userId,
        });
      } else {
        adData = insertAdSchema.parse({
          ...JSON.parse(req.body as any),
          userId: userId,
        });
      }
      
      // Create ad first to get the ad ID
      const ad = await storage.createAd(adData);
      
      // Process uploaded files (если есть новые файлы)
      if (files && files.length > 0) {
        const processedImages = await Promise.all(
          files.map((file, index) =>
            fileService.processAndSaveImage(
              {
                originalname: file.originalname,
                buffer: file.buffer,
                mimetype: file.mimetype,
                size: file.size
              },
              userId,
              ad.id
            )
          )
        );
        
        // Create image records in database
        const imageRecords = await Promise.all(
          processedImages.map((img, index) =>
            storage.addImage({
              adId: ad.id,
              path: `/api/images/${userId}/${ad.id}/${img.filename}`,
              order: index,
              isPrimary: index === 0
            })
          )
        );
        
        const updatedAd = await storage.getAd(ad.id);
        res.status(201).json(updatedAd);
      }
      // Если изображения уже загружены (через /api/upload/images)
      else if (imagesData.length > 0) {
        // Перемещаем файлы из временной папки в постоянную
        const tempDir = fileService.getTempDir(userId);
        const adDir = fileService.getAdDir(userId, ad.id);
        const thumbnailsDir = fileService.getThumbnailsDir(userId, ad.id);
        
        await fileService.ensureDirectoryExists(adDir);
        await fileService.ensureDirectoryExists(thumbnailsDir);
        
        // Перемещаем каждое изображение
        for (const imgData of imagesData) {
          const tempFilePath = path.join(tempDir, imgData.filename);
          const tempThumbnailPath = path.join(tempDir, 'thumbnails', imgData.filename);
          const newFilePath = path.join(adDir, imgData.filename);
          const newThumbnailPath = path.join(thumbnailsDir, imgData.filename);
          
          try {
            // Проверяем существование файлов
            const exists = await fileService.imageExists(tempFilePath);
            if (exists) {
              // Перемещаем основной файл
              await fs.rename(tempFilePath, newFilePath);
              
              // Перемещаем миниатюру если существует
              const thumbExists = await fileService.imageExists(tempThumbnailPath);
              if (thumbExists) {
                await fs.rename(tempThumbnailPath, newThumbnailPath);
              }
              
              // Создаём запись в БД
              await storage.addImage({
                adId: ad.id,
                path: `/api/images/${userId}/${ad.id}/${imgData.filename}`,
                order: imgData.order,
                isPrimary: imgData.isPrimary
              });
            }
          } catch (err) {
            logger.error('Error moving image', { filename: imgData.filename, error: err });
            // Продолжаем с остальными изображениями
          }
        }
        
        const updatedAd = await storage.getAd(ad.id);
        res.status(201).json(updatedAd);
      }
      else {
        res.status(201).json(ad);
      }
    } catch (error) {
      logger.error('Ad creation error', { error });
      res.status(400).json({ message: "Invalid ad data" });
    }
  });

  app.get("/api/my-ads", authenticateToken, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const ads = await storage.getUserAds(authReq.user.userId);
      res.json(ads);
    } catch (error) {
      logger.error('Server error', { error });
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/ads/:id", authenticateToken, multipleUpload, handleUploadError, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user.userId;
      const id = parseInt(req.params.id);
      const files = req.files as Express.Multer.File[];
      
      // Get existing ad to verify ownership
      const existingAd = await storage.getAd(id);
      if (!existingAd) {
        return res.status(404).json({ message: "Ad not found" });
      }
      
      // Verify ownership
      if (existingAd.userId !== userId) {
        return res.status(403).json({ message: "You can only edit your own ads" });
      }
      
      // Parse ad data from FormData
      let updateData: any = {};
      let imagesData: Array<{ filename: string; originalName: string; order: number; isPrimary: boolean; dbId?: number }> = [];
      
      if (req.body && typeof req.body === 'object') {
        logger.info('Update ad request', {
          bodyKeys: Object.keys(req.body),
          hasImages: !!req.body.images,
          imagesType: typeof req.body.images,
          hasFiles: files?.length > 0
        });
        
        // Сначала пробуем формат images[0][filename] (FormData)
        const imageKeys = Object.keys(req.body).filter(key => key.startsWith('images['));
        if (imageKeys.length > 0) {
          logger.info('Found FormData images format', { imageKeys });
          
          // Группируем данные по изображениям
          const imagesMap = new Map<number, any>();
          imageKeys.forEach(key => {
            const match = key.match(/images\[(\d+)\]\[(\w+)\]/);
            if (match) {
              const index = parseInt(match[1]);
              const field = match[2];
              if (!imagesMap.has(index)) {
                imagesMap.set(index, {});
              }
              imagesMap.get(index)[field] = req.body[key];
            }
          });
          
          // Преобразуем в массив
          imagesData = Array.from(imagesMap.values())
            .filter(img => img.filename)
            .map((img, index) => ({
              filename: img.filename,
              originalName: img.originalName || img.filename,
              order: parseInt(img.order) || index,
              isPrimary: img.isPrimary === 'true' || img.isPrimary === true || index === 0,
              dbId: img.dbId ? parseInt(img.dbId) : undefined
            }));
          logger.info('Parsed images from FormData', { imagesData });
        }
        // Если не нашли FormData формат, пробуем JSON-массив
        else if (req.body.images) {
          let parsedImages = req.body.images;
          // Если это строка, парсим JSON
          if (typeof req.body.images === 'string') {
            try {
              parsedImages = JSON.parse(req.body.images);
            } catch (err) {
              logger.warn('Failed to parse images JSON', { error: err });
            }
          }
          // Если это массив, обрабатываем
          if (Array.isArray(parsedImages)) {
            imagesData = parsedImages
              .filter(img => img.filename)
              .map((img: any, index: number) => ({
                filename: img.filename,
                originalName: img.originalName || img.filename,
                order: parseInt(img.order) || index,
                isPrimary: img.isPrimary === 'true' || img.isPrimary === true || index === 0,
                dbId: img.dbId ? parseInt(img.dbId) : undefined
              }));
            logger.info('Parsed images from JSON array', { imagesData });
          } else {
            logger.warn('Images is not an array', { images: parsedImages });
          }
        }
        
        // Извлекаем данные объявления для обновления
        updateData = {
          title: req.body.title,
          shortDescription: req.body.shortDescription,
          fullDescription: req.body.fullDescription,
          price: req.body.price ? parseFloat(req.body.price) : undefined,
          categoryId: req.body.categoryId ? parseInt(req.body.categoryId) : undefined,
          location: req.body.location,
          latitude: req.body.latitude || null,
          longitude: req.body.longitude || null,
          specifications: req.body.specifications || '{}',
          isActive: req.body.isActive === 'true' || req.body.isActive === true,
        };
        
        // Удаляем undefined значения
        Object.keys(updateData).forEach(key => {
          if (updateData[key] === undefined) {
            delete updateData[key];
          }
        });
      }
      
      // Обновляем данные объявления
      if (Object.keys(updateData).length > 0) {
        const updatedAd = await storage.updateAd(id, updateData);
        if (!updatedAd) {
          return res.status(404).json({ message: "Failed to update ad" });
        }
      }
      
      // Обработка изображений
      if (imagesData.length > 0 || (files && files.length > 0)) {
        // Получаем текущие изображения объявления
        const currentImages = await storage.getImagesByAdId(id);
        
        // Определяем изображения для удаления (те, что есть в БД, но нет в новых данных)
        const imagesToDelete = currentImages.filter(img =>
          !imagesData.some(newImg => newImg.dbId === img.id)
        );
        
        // Удаляем файлы и записи в БД
        for (const img of imagesToDelete) {
          try {
            const filename = img.path.split('/').pop();
            if (filename) {
              const adDir = fileService.getAdDir(userId, id);
              const thumbnailsDir = fileService.getThumbnailsDir(userId, id);
              const filePath = path.join(adDir, filename);
              const thumbnailPath = path.join(thumbnailsDir, filename);
              
              // Удаляем файлы если они существуют
              try {
                await fs.unlink(filePath);
              } catch (e) {
                // Файл не существует, игнорируем
              }
              try {
                await fs.unlink(thumbnailPath);
              } catch (e) {
                // Файл не существует, игнорируем
              }
            }
            // Удаляем запись из БД
            await db.delete(images).where(eq(images.id, img.id));
          } catch (err) {
            logger.error('Error deleting image', { imageId: img.id, error: err });
          }
        }
        
        // Обработка новых загруженных файлов
        if (files && files.length > 0) {
          const processedImages = await Promise.all(
            files.map((file, index) =>
              fileService.processAndSaveImage(
                {
                  originalname: file.originalname,
                  buffer: file.buffer,
                  mimetype: file.mimetype,
                  size: file.size
                },
                userId,
                id
              )
            )
          );
          
          // Добавляем записи в БД
          await Promise.all(
            processedImages.map((img, index) =>
              storage.addImage({
                adId: id,
                path: `/api/images/${userId}/${id}/${img.filename}`,
                order: imagesData.length + index,
                isPrimary: imagesData.length === 0 && index === 0
              })
            )
          );
        }
        
        // Обработка существующих изображений (обновление порядка и isPrimary)
        for (const imgData of imagesData) {
          if (imgData.dbId) {
            // Обновляем существующее изображение
            await db.update(images)
              .set({
                order: imgData.order,
                isPrimary: imgData.isPrimary
              })
              .where(eq(images.id, imgData.dbId));
          } else if (imgData.filename) {
            // Перемещаем из временной папки
            const tempDir = fileService.getTempDir(userId);
            const adDir = fileService.getAdDir(userId, id);
            const thumbnailsDir = fileService.getThumbnailsDir(userId, id);
            
            // Используем path.resolve для абсолютных путей
            const tempFilePath = path.resolve(path.join(tempDir, imgData.filename));
            const tempThumbnailPath = path.resolve(path.join(tempDir, 'thumbnails', imgData.filename));
            const newFilePath = path.resolve(path.join(adDir, imgData.filename));
            const newThumbnailPath = path.resolve(path.join(thumbnailsDir, imgData.filename));
            
            logger.info('Moving temp image to ad directory', {
              userId,
              adId: id,
              filename: imgData.filename,
              tempDir,
              tempFilePath,
              tempThumbnailPath,
              adDir,
              newFilePath,
              newThumbnailPath
            });
            
            try {
              // Обеспечиваем существование целевой директории
              await fileService.ensureDirectoryExists(adDir);
              await fileService.ensureDirectoryExists(thumbnailsDir);
              
              // Копируем файл вместо переименования, чтобы избежать проблем с блокировками
              await fs.copyFile(tempFilePath, newFilePath);
              logger.info('Temp file copied', { tempFilePath, newFilePath });
              
              // Копируем миниатюру
              try {
                await fs.copyFile(tempThumbnailPath, newThumbnailPath);
                logger.info('Temp thumbnail copied', { tempThumbnailPath, newThumbnailPath });
              } catch (thumbErr: any) {
                if (thumbErr.code === 'ENOENT') {
                  logger.warn('Temp thumbnail not found, skipping', { tempThumbnailPath });
                } else {
                  throw thumbErr;
                }
              }
              
              // Добавляем запись в БД
              await storage.addImage({
                adId: id,
                path: `/api/images/${userId}/${id}/${imgData.filename}`,
                order: imgData.order,
                isPrimary: imgData.isPrimary
              });
              logger.info('Image added to database', { adId: id, filename: imgData.filename });
              
              // Удаляем временные файлы после успешного копирования
              try {
                await fs.unlink(tempFilePath);
                logger.info('Temp file deleted', { tempFilePath });
              } catch (delErr) {
                logger.warn('Failed to delete temp file', { tempFilePath, error: delErr });
              }
              try {
                await fs.unlink(tempThumbnailPath);
                logger.info('Temp thumbnail deleted', { tempThumbnailPath });
              } catch (delErr) {
                logger.warn('Failed to delete temp thumbnail', { tempThumbnailPath, error: delErr });
              }
            } catch (err: any) {
              if (err.code === 'ENOENT') {
                logger.error('Temp file not found', {
                  tempFilePath,
                  tempDirContents: await fs.readdir(tempDir).catch(() => 'unable to read')
                });
              }
              logger.error('Error moving image during update', { filename: imgData.filename, error: err });
            }
          }
        }
      }
      
      // Возвращаем обновлённое объявление
      const updatedAd = await storage.getAd(id);
      res.json(updatedAd);
    } catch (error) {
      logger.error('Update ad error', { error });
      res.status(400).json({ message: "Invalid ad data" });
    }
  });

  app.delete("/api/ads/:id", authenticateToken, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const id = parseInt(req.params.id);
      
      // Get existing ad to verify ownership
      const existingAd = await storage.getAd(id);
      if (!existingAd) {
        return res.status(404).json({ message: "Ad not found" });
      }
      
      // Verify ownership
      if (existingAd.userId !== authReq.user.userId) {
        return res.status(403).json({ message: "You can only delete your own ads" });
      }
      
      // Delete associated files
      await fileService.deleteAdFiles(authReq.user.userId, id);
      
      const success = await storage.deleteAd(id);
      
      if (!success) {
        return res.status(404).json({ message: "Failed to delete ad" });
      }
      
      res.json({ message: "Ad deleted successfully" });
    } catch (error) {
      logger.error('Delete ad error', { error });
      res.status(500).json({ message: "Server error" });
    }
  });

  // File upload routes - загрузка изображений во временную папку
  app.post("/api/upload/images", authenticateToken, multipleUpload, handleUploadError, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const files = req.files as Express.Multer.File[];
      const userId = authReq.user.userId;
      
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      // Сохраняем изображения во временную папку
      const tempDir = fileService.getTempDir(userId);
      const tempThumbnailsDir = path.join(tempDir, 'thumbnails');
      
      await fileService.ensureDirectoryExists(tempDir);
      await fileService.ensureDirectoryExists(tempThumbnailsDir);

      // Обрабатываем и сохраняем каждое изображение
      const processedImages = await Promise.all(
        files.map(async (file, index) => {
          const fileExtension = path.extname(file.originalname);
          const uniqueFilename = `${uuidv4()}${fileExtension}`;
          const filePath = path.join(tempDir, uniqueFilename);
          const thumbnailPath = path.join(tempThumbnailsDir, uniqueFilename);

          logger.info('Processing image', {
            originalname: file.originalname,
            tempDir,
            tempThumbnailsDir,
            filePath,
            thumbnailPath
          });

          try {
            // Process image with compression
            const processedImage = sharp(file.buffer);
            
            // Resize and compress main image (max width 1200px, quality 80%)
            await processedImage
              .resize(1200, null, {
                fit: 'inside',
                withoutEnlargement: true
              })
              .jpeg({ quality: 80, progressive: true })
              .toFile(filePath);

            logger.info('Main image saved', { filePath });

            // Create thumbnail (max width 300px)
            await sharp(file.buffer)
              .resize(300, null, {
                fit: 'inside',
                withoutEnlargement: true
              })
              .jpeg({ quality: 70, progressive: true })
              .toFile(thumbnailPath);

            logger.info('Thumbnail saved', { thumbnailPath });
          } catch (err) {
            logger.error('Image processing error', { error: err, filePath, thumbnailPath });
            throw err;
          }

          return {
            id: `temp-${Date.now()}-${index}`,
            filename: uniqueFilename,
            originalName: file.originalname,
            path: `/api/images/temp/${userId}/${uniqueFilename}`,
            thumbnailPath: `/api/images/temp/${userId}/thumbnails/${uniqueFilename}`,
            status: 'uploaded'
          };
        })
      );

      res.json({
        message: "Files uploaded successfully",
        images: processedImages
      });
    } catch (error) {
      logger.error('File upload error', { error });
      res.status(500).json({ message: "File upload failed" });
    }
  });

  // Endpoint для отдачи временных изображений
  app.get("/api/images/temp/:userId/:filename", async (req, res) => {
    try {
      const { userId, filename } = req.params;
      const tempDir = fileService.getTempDir(parseInt(userId));
      const filePath = path.resolve(path.join(tempDir, filename));
      
      logger.info('Serving temp image', { userId, filename, filePath });
      
      if (await fileService.imageExists(filePath)) {
        res.sendFile(filePath);
      } else {
        res.status(404).json({ message: "Image not found" });
      }
    } catch (error: any) {
      logger.error('Temp image serve error', { error: error?.message || error });
      res.status(500).json({ message: "Failed to serve temp image" });
    }
  });

  // Endpoint для отдачи временных миниатюр
  app.get("/api/images/temp/:userId/thumbnails/:filename", async (req, res) => {
    try {
      const { userId, filename } = req.params;
      const tempDir = fileService.getTempDir(parseInt(userId));
      const thumbnailPath = path.resolve(path.join(tempDir, 'thumbnails', filename));
      
      logger.info('Serving temp thumbnail', { userId, filename, thumbnailPath });
      
      if (await fileService.imageExists(thumbnailPath)) {
        logger.info('Thumbnail found, sending file', { thumbnailPath });
        res.sendFile(thumbnailPath);
      } else {
        logger.warn('Thumbnail not found', { thumbnailPath });
        res.status(404).json({ message: "Thumbnail not found" });
      }
    } catch (error: any) {
      logger.error('Temp thumbnail serve error', { error: error?.message || error });
      res.status(500).json({ message: "Failed to serve temp thumbnail" });
    }
  });

  // Image serving endpoint
  app.get("/api/images/:userId/:adId/:filename", async (req, res) => {
    try {
      const { userId, adId, filename } = req.params;
      const adDir = fileService.getAdDir(parseInt(userId), parseInt(adId));
      const filePath = path.resolve(path.join(adDir, filename));
      
      logger.info('Serving image', { filename, adDir, filePath, userId, adId });
      
      if (await fileService.imageExists(filePath)) {
        res.sendFile(filePath);
      } else {
        logger.warn('Image not found', { filePath });
        res.status(404).json({ message: "Image not found" });
      }
    } catch (error) {
      logger.error('Image serve error', { error });
      res.status(500).json({ message: "Failed to serve image" });
    }
  });

  // Thumbnail serving endpoint
  app.get("/api/images/:userId/:adId/thumbnails/:filename", async (req, res) => {
    try {
      const { userId, adId, filename } = req.params;
      const adDir = fileService.getAdDir(parseInt(userId), parseInt(adId));
      const thumbnailPath = path.resolve(path.join(adDir, 'thumbnails', filename));
      
      logger.info('Serving thumbnail', { filename, thumbnailPath, userId, adId });
      
      if (await fileService.imageExists(thumbnailPath)) {
        res.sendFile(thumbnailPath);
      } else {
        logger.warn('Thumbnail not found', { thumbnailPath });
        res.status(404).json({ message: "Thumbnail not found" });
      }
    } catch (error) {
      logger.error('Thumbnail serve error', { error });
      res.status(500).json({ message: "Failed to serve thumbnail" });
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
      logger.error('Server error', { error });
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

  httpServer.on('listening', () => {
    const addr = httpServer.address();
    const bind = typeof addr === 'string' ? addr : `${addr?.port}`;
    logger.info(`Server started on port ${bind}`);
  });

  httpServer.on('error', (error) => {
    logger.error('Server error', { error });
  });

  return httpServer;
}
