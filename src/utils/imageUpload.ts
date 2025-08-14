import * as FileSystem from 'expo-file-system';
import { r2Service, PresignedUrlResult } from '../services/r2Service';

export interface ImageUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface ImageUploadOptions {
  prefix: string;
  fileName?: string;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
}

/**
 * Upload image to Cloudflare R2 using presigned URL
 */
export async function uploadImageToR2(
  imageUri: string,
  options: ImageUploadOptions
): Promise<ImageUploadResult> {
  try {
    // Validate image URI
    if (!imageUri) {
      return {
        success: false,
        error: 'Image URI is required'
      };
    }

    // Get file info
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    if (!fileInfo.exists) {
      return {
        success: false,
        error: 'Image file does not exist'
      };
    }

    // Generate filename if not provided
    const fileName = options.fileName || `image_${Date.now()}.jpg`;
    const contentType = getContentTypeFromFileName(fileName);

    // Get presigned upload URL
    const presignedResult: PresignedUrlResult = await r2Service.getPresignedUploadUrl(
      options.prefix,
      fileName,
      contentType
    );

    if (!presignedResult.success || !presignedResult.uploadUrl) {
      return {
        success: false,
        error: presignedResult.error || 'Failed to get upload URL'
      };
    }

    // Upload file using presigned URL
    const uploadResult = await FileSystem.uploadAsync(
      presignedResult.uploadUrl,
      imageUri,
      {
        httpMethod: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      }
    );

    if (uploadResult.status !== 200) {
      return {
        success: false,
        error: `Upload failed with status: ${uploadResult.status}`
      };
    }

    return {
      success: true,
      url: presignedResult.publicUrl
    };

  } catch (error) {
    console.error('Error uploading image to R2:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error'
    };
  }
}

/**
 * Get content type from file name
 */
function getContentTypeFromFileName(fileName: string): string {
  const extension = fileName.toLowerCase().split('.').pop();
  
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/jpeg'; // Default fallback
  }
}

/**
 * Delete image from R2 using URL
 */
export async function deleteImageFromR2(imageUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    const key = r2Service.extractKeyFromUrl(imageUrl);
    if (!key) {
      return {
        success: false,
        error: 'Invalid image URL or unable to extract key'
      };
    }

    return await r2Service.deleteFile(key);
  } catch (error) {
    console.error('Error deleting image from R2:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown deletion error'
    };
  }
}

/**
 * Validate image file before upload
 */
export async function validateImageFile(
  imageUri: string,
  maxSizeBytes: number = 10 * 1024 * 1024 // 10MB default
): Promise<{ valid: boolean; error?: string }> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    
    if (!fileInfo.exists) {
      return { valid: false, error: 'File does not exist' };
    }

    if (fileInfo.size && fileInfo.size > maxSizeBytes) {
      return { 
        valid: false, 
        error: `File size (${Math.round(fileInfo.size / 1024 / 1024)}MB) exceeds maximum allowed size (${Math.round(maxSizeBytes / 1024 / 1024)}MB)` 
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'File validation error'
    };
  }
}