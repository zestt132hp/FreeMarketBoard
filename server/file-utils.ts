import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

export interface UploadedFile {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
  size: number;
}

export interface ProcessedImage {
  filename: string;
  path: string;
  thumbnailPath: string;
  originalName: string;
}

export class FileService {
  public basePath: string;

  constructor(basePath: string = './FreeMarketBoardFiles') {
    this.basePath = basePath;
  }

  /**
   * Get the full path for temp directory
   */
  getTempDir(userId: number): string {
    return path.join(this.basePath, 'temp', userId.toString());
  }

  /**
   * Get the full path for ad directory
   */
  getAdDir(userId: number, adId: number): string {
    return path.join(this.basePath, userId.toString(), adId.toString());
  }

  /**
   * Get the full path for thumbnails directory
   */
  getThumbnailsDir(userId: number, adId: number): string {
    return path.join(this.basePath, userId.toString(), adId.toString(), 'thumbnails');
  }

  async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  async processAndSaveImage(
    file: UploadedFile,
    userId: number,
    adId: number
  ): Promise<ProcessedImage> {
    const userDir = path.join(this.basePath, userId.toString());
    const adDir = path.join(userDir, adId.toString());
    const thumbnailsDir = path.join(adDir, 'thumbnails');

    // Ensure directories exist
    await this.ensureDirectoryExists(userDir);
    await this.ensureDirectoryExists(adDir);
    await this.ensureDirectoryExists(thumbnailsDir);

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const uniqueFilename = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(adDir, uniqueFilename);
    const thumbnailPath = path.join(thumbnailsDir, uniqueFilename);

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

    // Create thumbnail (max width 300px)
    await sharp(file.buffer)
      .resize(300, null, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 70, progressive: true })
      .toFile(thumbnailPath);

    return {
      filename: uniqueFilename,
      path: filePath,
      thumbnailPath,
      originalName: file.originalname
    };
  }

  async deleteAdFiles(userId: number, adId: number): Promise<void> {
    const adDir = path.join(this.basePath, userId.toString(), adId.toString());
    
    try {
      await fs.rm(adDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Could not delete ad files for user ${userId}, ad ${adId}:`, error);
    }
  }

  async getImageUrl(userId: number, adId: number, filename: string): Promise<string> {
    return `/api/images/${userId}/${adId}/${filename}`;
  }

  async getThumbnailUrl(userId: number, adId: number, filename: string): Promise<string> {
    return `/api/images/${userId}/${adId}/thumbnails/${filename}`;
  }

  async readImageFile(filePath: string): Promise<Buffer> {
    return fs.readFile(filePath);
  }

  async imageExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

// Global file service instance
export const fileService = new FileService();