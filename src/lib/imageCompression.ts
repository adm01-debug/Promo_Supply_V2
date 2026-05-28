/**
 * Image Compression and WebP Conversion Utility
 * Provides automatic image optimization for better performance
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  convertToWebP?: boolean;
  preserveExif?: boolean;
}

export interface CompressedImage {
  blob: Blob;
  file: File;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  format: string;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.8,
  convertToWebP: true,
  preserveExif: false,
};

/**
 * Check if browser supports WebP
 */
export function supportsWebP(): boolean {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}

/**
 * Load image from file
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => resolve(img);
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Calculate new dimensions maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;

  // Only resize if image is larger than max dimensions
  if (width > maxWidth || height > maxHeight) {
    const aspectRatio = width / height;

    if (width > height) {
      width = maxWidth;
      height = Math.round(width / aspectRatio);
      if (height > maxHeight) {
        height = maxHeight;
        width = Math.round(height * aspectRatio);
      }
    } else {
      height = maxHeight;
      width = Math.round(height * aspectRatio);
      if (width > maxWidth) {
        width = maxWidth;
        height = Math.round(width / aspectRatio);
      }
    }
  }

  return { width, height };
}

/**
 * Compress and optionally convert image to WebP
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressedImage> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Skip non-image files
  if (!file.type.startsWith('image/')) {
    throw new Error('File is not an image');
  }

  // Skip already small images (less than 100KB)
  const skipCompression = file.size < 100 * 1024;
  
  // Load the image
  const img = await loadImage(file);
  const originalWidth = img.width;
  const originalHeight = img.height;

  // Calculate new dimensions
  const { width, height } = calculateDimensions(
    originalWidth,
    originalHeight,
    opts.maxWidth!,
    opts.maxHeight!
  );

  // Create canvas for compression
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Enable image smoothing for better quality
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw image on canvas
  ctx.drawImage(img, 0, 0, width, height);

  // Clean up object URL
  URL.revokeObjectURL(img.src);

  // Determine output format
  const useWebP = opts.convertToWebP && supportsWebP();
  const mimeType = useWebP ? 'image/webp' : 'image/jpeg';
  const extension = useWebP ? '.webp' : '.jpg';

  // Convert to blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Failed to create blob'));
      },
      mimeType,
      skipCompression ? 1 : opts.quality
    );
  });

  // Create new filename
  const originalName = file.name.replace(/\.[^/.]+$/, '');
  const newFileName = `${originalName}${extension}`;

  // Create new file
  const compressedFile = new File([blob], newFileName, {
    type: mimeType,
    lastModified: Date.now(),
  });

  return {
    blob,
    file: compressedFile,
    width,
    height,
    originalSize: file.size,
    compressedSize: blob.size,
    compressionRatio: Math.round((1 - blob.size / file.size) * 100),
    format: useWebP ? 'webp' : 'jpeg',
  };
}

/**
 * Compress multiple images
 */
export async function compressImages(
  files: File[],
  options: CompressionOptions = {}
): Promise<CompressedImage[]> {
  const imageFiles = files.filter((f) => f.type.startsWith('image/'));
  return Promise.all(imageFiles.map((file) => compressImage(file, options)));
}

/**
 * Get image preview URL (with optional compression)
 */
export async function getCompressedPreviewUrl(
  file: File,
  maxSize: number = 400
): Promise<string> {
  try {
    const compressed = await compressImage(file, {
      maxWidth: maxSize,
      maxHeight: maxSize,
      quality: 0.7,
      convertToWebP: true,
    });
    return URL.createObjectURL(compressed.blob);
  } catch {
    // Fallback to original if compression fails
    return URL.createObjectURL(file);
  }
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
