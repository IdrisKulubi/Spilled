/**
 * Story image utilities for handling image uploads, updates, and deletions
 */

import { uploadImageToR2, deleteImageFromR2, validateImageFile } from './imageUpload';

export interface StoryImageUploadResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

export interface StoryImageUpdateResult {
  success: boolean;
  newImageUrl?: string;
  error?: string;
}

/**
 * Upload a new story image
 */
export async function uploadStoryImageWithValidation(
  imageUri: string,
  storyId: string
): Promise<StoryImageUploadResult> {
  try {
    // Validate image file before upload
    const validation = await validateImageFile(imageUri, 15 * 1024 * 1024); // 15MB limit
    
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error || 'Invalid image file'
      };
    }

    // Upload image to R2
    const uploadResult = await uploadImageToR2(imageUri, {
      prefix: 'story-images',
      fileName: `story_${storyId}_${Date.now()}.jpg`
    });

    if (!uploadResult.success) {
      return {
        success: false,
        error: uploadResult.error || 'Failed to upload image'
      };
    }

    return {
      success: true,
      imageUrl: uploadResult.url
    };

  } catch (error) {
    console.error('Error uploading story image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error'
    };
  }
}

/**
 * Update story image (handles deletion of old image and upload of new one)
 */
export async function updateStoryImage(
  newImageUri: string | null,
  currentImageUrl: string | null,
  storyId: string
): Promise<StoryImageUpdateResult> {
  try {
    let newImageUrl: string | null = null;

    // If there's a new image to upload
    if (newImageUri) {
      const uploadResult = await uploadStoryImageWithValidation(newImageUri, storyId);
      
      if (!uploadResult.success) {
        return {
          success: false,
          error: uploadResult.error
        };
      }
      
      newImageUrl = uploadResult.imageUrl || null;
    }

    // Delete old image if it exists and we have a new image or are removing the image
    if (currentImageUrl && (newImageUri || newImageUri === null)) {
      try {
        await deleteImageFromR2(currentImageUrl);
        console.log('Old story image deleted:', currentImageUrl);
      } catch (error) {
        // Log error but don't fail the update - old image cleanup is not critical
        console.warn('Failed to delete old story image:', error);
      }
    }

    return {
      success: true,
      newImageUrl: newImageUrl || undefined
    };

  } catch (error) {
    console.error('Error updating story image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown update error'
    };
  }
}

/**
 * Delete story image
 */
export async function deleteStoryImage(imageUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!imageUrl) {
      return { success: true }; // Nothing to delete
    }

    const result = await deleteImageFromR2(imageUrl);
    return result;

  } catch (error) {
    console.error('Error deleting story image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown deletion error'
    };
  }
}

/**
 * Validate story image before processing
 */
export async function validateStoryImage(
  imageUri: string
): Promise<{ valid: boolean; error?: string }> {
  return await validateImageFile(imageUri, 15 * 1024 * 1024); // 15MB limit for story images
}

/**
 * Get optimized image URL for display (if using CDN features)
 */
export function getOptimizedImageUrl(
  imageUrl: string,
  width?: number,
  height?: number,
  quality?: number
): string {
  // For now, return the original URL
  // In the future, this could add Cloudflare Image Resizing parameters
  // Example: https://imagedelivery.net/your-account/image-id/w=400,h=300,q=80
  
  if (!imageUrl) return imageUrl;
  
  // If using Cloudflare Image Resizing, you could modify the URL here
  // For basic R2 storage, return as-is
  return imageUrl;
}

/**
 * Extract image metadata for debugging
 */
export function extractImageMetadata(imageUrl: string): {
  isR2Url: boolean;
  bucket?: string;
  key?: string;
  domain?: string;
} {
  if (!imageUrl) {
    return { isR2Url: false };
  }

  try {
    const url = new URL(imageUrl);
    
    // Check if it's an R2 URL pattern
    const isR2Url = url.hostname.includes('r2.cloudflarestorage.com') || 
                    url.hostname.includes('.r2.dev') ||
                    // Custom domain check - you might need to adjust this
                    process.env.EXPO_PUBLIC_R2_PUBLIC_URL?.includes(url.hostname);

    if (isR2Url) {
      const pathParts = url.pathname.split('/').filter(part => part.length > 0);
      const key = pathParts.join('/');
      
      return {
        isR2Url: true,
        domain: url.hostname,
        key: key,
        bucket: process.env.EXPO_PUBLIC_R2_BUCKET_NAME
      };
    }

    return { isR2Url: false };

  } catch (error) {
    console.error('Error extracting image metadata:', error);
    return { isR2Url: false };
  }
}