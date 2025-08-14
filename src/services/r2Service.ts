import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, r2Config, validateR2Config } from '../config/r2';

export interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

export interface PresignedUrlResult {
  success: boolean;
  uploadUrl?: string;
  publicUrl?: string;
  key?: string;
  error?: string;
}

export class R2Service {
  private static instance: R2Service;
  private isConfigValid: boolean;

  private constructor() {
    this.isConfigValid = validateR2Config();
    if (!this.isConfigValid) {
      console.warn('R2Service: Configuration validation failed. File upload functionality will be disabled.');
    }
  }

  public static getInstance(): R2Service {
    if (!R2Service.instance) {
      R2Service.instance = new R2Service();
    }
    return R2Service.instance;
  }

  /**
   * Generate a unique file key for storage
   */
  private generateFileKey(prefix: string, fileName: string): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const extension = fileName.split('.').pop();
    return `${prefix}/${timestamp}-${randomId}.${extension}`;
  }

  /**
   * Get presigned URL for direct upload from client
   */
  async getPresignedUploadUrl(
    prefix: string,
    fileName: string,
    contentType: string,
    expiresIn: number = 3600 // 1 hour default
  ): Promise<PresignedUrlResult> {
    if (!this.isConfigValid) {
      return {
        success: false,
        error: 'R2 configuration is invalid'
      };
    }

    try {
      const key = this.generateFileKey(prefix, fileName);
      
      const command = new PutObjectCommand({
        Bucket: r2Config.bucketName,
        Key: key,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn });
      const publicUrl = `${r2Config.publicUrl}/${key}`;

      return {
        success: true,
        uploadUrl,
        publicUrl,
        key,
      };
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate presigned URL'
      };
    }
  }

  /**
   * Upload file directly to R2 (for server-side uploads)
   */
  async uploadFile(
    prefix: string,
    fileName: string,
    fileBuffer: Buffer,
    contentType: string
  ): Promise<UploadResult> {
    if (!this.isConfigValid) {
      return {
        success: false,
        error: 'R2 configuration is invalid'
      };
    }

    try {
      const key = this.generateFileKey(prefix, fileName);
      
      const command = new PutObjectCommand({
        Bucket: r2Config.bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
      });

      await r2Client.send(command);
      
      const url = `${r2Config.publicUrl}/${key}`;

      return {
        success: true,
        url,
        key,
      };
    } catch (error) {
      console.error('Error uploading file to R2:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload file'
      };
    }
  }

  /**
   * Delete file from R2
   */
  async deleteFile(key: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigValid) {
      return {
        success: false,
        error: 'R2 configuration is invalid'
      };
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: r2Config.bucketName,
        Key: key,
      });

      await r2Client.send(command);

      return { success: true };
    } catch (error) {
      console.error('Error deleting file from R2:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete file'
      };
    }
  }

  /**
   * Get presigned URL for file access (for private files)
   */
  async getPresignedDownloadUrl(
    key: string,
    expiresIn: number = 3600
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    if (!this.isConfigValid) {
      return {
        success: false,
        error: 'R2 configuration is invalid'
      };
    }

    try {
      const command = new GetObjectCommand({
        Bucket: r2Config.bucketName,
        Key: key,
      });

      const url = await getSignedUrl(r2Client, command, { expiresIn });

      return {
        success: true,
        url,
      };
    } catch (error) {
      console.error('Error generating presigned download URL:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate download URL'
      };
    }
  }

  /**
   * Extract key from public URL
   */
  extractKeyFromUrl(url: string): string | null {
    try {
      const publicUrlBase = r2Config.publicUrl;
      if (url.startsWith(publicUrlBase)) {
        return url.replace(`${publicUrlBase}/`, '');
      }
      return null;
    } catch (error) {
      console.error('Error extracting key from URL:', error);
      return null;
    }
  }
}

// Export singleton instance
export const r2Service = R2Service.getInstance();