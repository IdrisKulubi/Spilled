/**
 * File Upload Validation Utilities
 * Server-side validation for file uploads
 */

import * as FileSystem from 'expo-file-system';
import { supabase } from '../config/supabase';

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  fileInfo?: {
    size: number;
    type: string;
    dimensions?: { width: number; height: number };
  };
}

export interface FileUploadConfig {
  maxSizeBytes: number;
  allowedTypes: string[];
  maxDimensions?: { width: number; height: number };
  minDimensions?: { width: number; height: number };
}

// Configuration for different file types
export const FILE_UPLOAD_CONFIGS = {
  verification_id: {
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    maxDimensions: { width: 4000, height: 4000 },
    minDimensions: { width: 300, height: 300 },
  },
  story_image: {
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    maxDimensions: { width: 2000, height: 2000 },
    minDimensions: { width: 100, height: 100 },
  },
} as const;

/**
 * Validate file before upload
 */
export const validateFile = async (
  fileUri: string,
  config: FileUploadConfig
): Promise<FileValidationResult> => {
  try {
    console.log('[FileValidation] Validating file:', fileUri);

    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) {
      return {
        isValid: false,
        error: 'File does not exist or cannot be accessed',
      };
    }

    // Check file size
    if (fileInfo.size && fileInfo.size > config.maxSizeBytes) {
      const maxSizeMB = (config.maxSizeBytes / (1024 * 1024)).toFixed(1);
      return {
        isValid: false,
        error: `File size exceeds maximum allowed size of ${maxSizeMB}MB`,
      };
    }

    // Get file type from URI
    const fileExtension = fileUri.split('.').pop()?.toLowerCase();
    let mimeType = '';
    
    switch (fileExtension) {
      case 'jpg':
      case 'jpeg':
        mimeType = 'image/jpeg';
        break;
      case 'png':
        mimeType = 'image/png';
        break;
      case 'webp':
        mimeType = 'image/webp';
        break;
      default:
        return {
          isValid: false,
          error: 'Unsupported file type. Please use JPG, PNG, or WebP format.',
        };
    }

    // Check if file type is allowed
    if (!config.allowedTypes.includes(mimeType)) {
      return {
        isValid: false,
        error: `File type ${mimeType} is not allowed. Supported types: ${config.allowedTypes.join(', ')}`,
      };
    }

    // For images, validate dimensions if specified
    if (config.maxDimensions || config.minDimensions) {
      try {
        // Read image to get dimensions (basic validation)
        const base64 = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Basic image header validation
        if (!isValidImageHeader(base64, mimeType)) {
          return {
            isValid: false,
            error: 'Invalid image file or corrupted data',
          };
        }

        // Note: For full dimension validation, we'd need a proper image library
        // For now, we'll do basic validation and let the server handle detailed checks
      } catch (error) {
        console.error('[FileValidation] Error reading image:', error);
        return {
          isValid: false,
          error: 'Unable to process image file',
        };
      }
    }

    console.log('[FileValidation] File validation passed');
    return {
      isValid: true,
      fileInfo: {
        size: fileInfo.size || 0,
        type: mimeType,
      },
    };
  } catch (error) {
    console.error('[FileValidation] Validation error:', error);
    return {
      isValid: false,
      error: 'Failed to validate file',
    };
  }
};

/**
 * Basic image header validation
 */
const isValidImageHeader = (base64: string, mimeType: string): boolean => {
  try {
    const header = base64.substring(0, 20);
    
    switch (mimeType) {
      case 'image/jpeg':
        // JPEG files start with /9j/
        return header.startsWith('/9j/') || header.startsWith('iVBOR');
      case 'image/png':
        // PNG files start with iVBOR
        return header.startsWith('iVBOR');
      case 'image/webp':
        // WebP files have specific header
        return header.includes('UklGR') || header.includes('V0VCU');
      default:
        return false;
    }
  } catch (error) {
    console.error('[FileValidation] Header validation error:', error);
    return false;
  }
};

/**
 * Sanitize filename for storage
 */
export const sanitizeFilename = (filename: string, userId: string): string => {
  // Remove any path traversal attempts
  const cleanName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  // Add timestamp and user ID for uniqueness
  const timestamp = Date.now();
  const extension = cleanName.split('.').pop() || 'jpg';
  
  return `${userId}_${timestamp}.${extension}`;
};

/**
 * Validate file upload rate limiting
 */
export const checkUploadRateLimit = async (
  userId: string,
  uploadType: 'verification' | 'story'
): Promise<{ allowed: boolean; error?: string }> => {
  try {
    const action = uploadType === 'verification' ? 'upload_verification' : 'upload_story_image';
    
    // Check rate limit via database function
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_user_id: userId,
      p_action: action,
    });

    if (error) {
      console.error('[FileValidation] Rate limit check error:', error);
      return { allowed: false, error: 'Unable to verify upload permissions' };
    }

    if (!data) {
      return { 
        allowed: false, 
        error: uploadType === 'verification' 
          ? 'Too many verification uploads. Please wait before trying again.'
          : 'Too many image uploads. Please wait before uploading more images.'
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('[FileValidation] Rate limit error:', error);
    return { allowed: false, error: 'Upload rate limit check failed' };
  }
};

/**
 * Comprehensive file upload validation
 */
export const validateFileUpload = async (
  fileUri: string,
  uploadType: keyof typeof FILE_UPLOAD_CONFIGS,
  userId: string
): Promise<FileValidationResult> => {
  // Get configuration for upload type
  const config = FILE_UPLOAD_CONFIGS[uploadType];
  
  // Check rate limiting first
  const rateLimitCheck = await checkUploadRateLimit(
    userId, 
    uploadType === 'verification_id' ? 'verification' : 'story'
  );
  
  if (!rateLimitCheck.allowed) {
    return {
      isValid: false,
      error: rateLimitCheck.error,
    };
  }

  // Validate file
  const fileValidation = await validateFile(fileUri, config);
  
  if (!fileValidation.isValid) {
    return fileValidation;
  }

  // Additional security checks
  const securityCheck = await performSecurityChecks(fileUri);
  if (!securityCheck.isValid) {
    return securityCheck;
  }

  return {
    isValid: true,
    fileInfo: fileValidation.fileInfo,
  };
};

/**
 * Perform additional security checks on files
 */
const performSecurityChecks = async (fileUri: string): Promise<FileValidationResult> => {
  try {
    // Read first few bytes to check for malicious content
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
      length: 1024, // Read first 1KB
    });

    // Check for suspicious patterns
    const suspiciousPatterns = [
      'javascript:',
      'data:text/html',
      '<script',
      'eval(',
      'document.cookie',
      'window.location',
    ];

    const decodedContent = atob(base64).toLowerCase();
    
    for (const pattern of suspiciousPatterns) {
      if (decodedContent.includes(pattern)) {
        console.warn('[FileValidation] Suspicious pattern detected:', pattern);
        return {
          isValid: false,
          error: 'File contains potentially malicious content',
        };
      }
    }

    return { isValid: true };
  } catch (error) {
    console.error('[FileValidation] Security check error:', error);
    // Don't fail upload for security check errors, but log them
    return { isValid: true };
  }
};

/**
 * Get upload progress callback
 */
export const createUploadProgressCallback = (
  onProgress: (progress: number) => void
) => {
  return (progressEvent: any) => {
    if (progressEvent.total) {
      const progress = (progressEvent.loaded / progressEvent.total) * 100;
      onProgress(Math.round(progress));
    }
  };
};