import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import { authenticate } from '../middleware/auth';

const router = Router();

// Configure Cloudinary if credentials are available
const useCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET &&
  process.env.CLOUDINARY_CLOUD_NAME !== 'sua_cloud_name'
);

if (useCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('✅ Cloudinary configured for image uploads');
} else {
  console.log('⚠️ Cloudinary not configured - using local storage (images will be lost on redeploy)');
}

// Configure storage - use memory storage for Cloudinary, disk for local
const storage = useCloudinary 
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (_req: any, _file: any, cb: any) => {
        const uploadDir = path.join(__dirname, '../../uploads');
        
        // Create uploads directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        cb(null, uploadDir);
      },
      filename: (_req: any, file: any, cb: any) => {
        // Generate unique filename: timestamp-randomstring-originalname
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = path.extname(file.originalname);
        const nameWithoutExt = path.basename(file.originalname, ext);
        cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
      }
    });

// File filter - accept only images
const fileFilter = (_req: any, file: any, cb: any) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF and WebP images are allowed.'));
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  }
});

// Helper function to upload to Cloudinary
const uploadToCloudinary = (buffer: Buffer, originalname: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const publicId = `techtrust/${path.basename(originalname, path.extname(originalname))}-${uniqueSuffix}`;
    
    cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        folder: 'techtrust',
        resource_type: 'image',
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ]
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    ).end(buffer);
  });
};

// POST /api/upload - Upload single image
router.post('/', authenticate, upload.single('image'), async (req: any, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let imageUrl: string;
    let filename: string;

    if (useCloudinary && req.file.buffer) {
      // Upload to Cloudinary
      const result = await uploadToCloudinary(req.file.buffer, req.file.originalname);
      imageUrl = result.secure_url;
      filename = result.public_id;
      
      console.log(`✅ Image uploaded to Cloudinary: ${imageUrl}`);
    } else {
      // Local storage fallback
      const protocol = req.protocol;
      const host = req.get('host');
      const baseUrl = `${protocol}://${host}`;
      
      imageUrl = `${baseUrl}/uploads/${req.file.filename}`;
      filename = req.file.filename!;
      
      console.log(`📁 Image saved locally: ${imageUrl}`);
    }
    
    return res.json({
      success: true,
      imageUrl,
      filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      storage: useCloudinary ? 'cloudinary' : 'local'
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: error.message || 'Error uploading file' });
  }
});

// DELETE /api/upload/:filename - Delete uploaded image
router.delete('/:filename', authenticate, async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    
    if (useCloudinary) {
      // Delete from Cloudinary
      // The filename might be a public_id like "techtrust/image-123456789"
      const publicId = filename.includes('/') ? filename : `techtrust/${filename}`;
      await cloudinary.uploader.destroy(publicId);
      console.log(`✅ Image deleted from Cloudinary: ${publicId}`);
    } else {
      // Delete from local storage
      const filePath = path.join(__dirname, '../../uploads', filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      fs.unlinkSync(filePath);
    }
    
    return res.json({ success: true, message: 'File deleted successfully' });
  } catch (error: any) {
    console.error('Delete error:', error);
    return res.status(500).json({ error: error.message || 'Error deleting file' });
  }
});

export default router;
