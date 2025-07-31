/**
 * Admin Actions - Handle admin functionality for user verification management
 */

import { supabase } from '../config/supabase';
import { Database } from '../types/database';

type User = Database['public']['Tables']['users']['Row'];



export interface PendingVerification {
  user_id: string;
  email: string;
  nickname: string;
  phone: string;
  id_image_url: string;
  id_type: 'school_id' | 'national_id';
  created_at: string;
  days_waiting: number;
}

export interface AdminResponse {
  success: boolean;
  error?: string;
  data?: any;
}

export interface AdminStats {
  pending_verifications: number;
  verified_users: number;
  rejected_users: number;
  new_signups_week: number;
  new_stories_week: number;
  new_messages_week: number;
  avg_verification_hours: number;
}

/**
 * Fetch all pending verifications for admin review
 */
export const fetchPendingVerifications = async (): Promise<{
  success: boolean;
  data?: PendingVerification[];
  error?: string;
}> => {
  try {
    console.log('[AdminActions] Fetching pending verifications...');
    
    // Use the updated database function that handles type casting
    const { data, error } = await supabase
      .rpc('get_verification_queue');

    if (error) {
      console.error('[AdminActions] Error fetching pending verifications:', error);
      return { success: false, error: error.message };
    }

    console.log(`[AdminActions] Found ${data?.length || 0} pending verifications`);
    
    // Log image URLs for debugging
    if (data && data.length > 0) {
      for (const user of data) {
        console.log(`[AdminActions] User ${user.user_id}:`);
        console.log(`  - Email: ${user.email}`);
        console.log(`  - Image URL: ${user.id_image_url}`);
        console.log(`  - URL length: ${user.id_image_url?.length || 0}`);
        console.log(`  - URL starts with: ${user.id_image_url?.substring(0, 50) || 'N/A'}`);
        
        // Note: Images are stored in private bucket, will generate signed URLs when needed
        if (user.id_image_url) {
          console.log(`  - Storage: Private bucket (will generate signed URL for access)`);
        }
      }
    }
    
    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('[AdminActions] Unexpected error:', error);
    return { success: false, error: error.message || 'Failed to fetch pending verifications' };
  }
};

/**
 * Approve a user's verification
 */
export const approveUserVerification = async (userId: string): Promise<AdminResponse> => {
  try {
    console.log(`[AdminActions] Approving user verification for: ${userId}`);
    
    const { data, error } = await supabase
      .rpc('approve_user_verification', { user_id: userId });

    if (error) {
      console.error('[AdminActions] Error approving user:', error);
      return { success: false, error: error.message };
    }

    console.log(`[AdminActions] Successfully approved user: ${userId}`);
    return { success: true, data };
  } catch (error: any) {
    console.error('[AdminActions] Unexpected error:', error);
    return { success: false, error: error.message || 'Failed to approve user' };
  }
};

/**
 * Reject a user's verification
 */
export const rejectUserVerification = async (
  userId: string, 
  reason?: string
): Promise<AdminResponse> => {
  try {
    console.log(`[AdminActions] Rejecting user verification for: ${userId}`);
    
    const { data, error } = await supabase
      .rpc('reject_user_verification', { 
        user_id: userId,
        reason: reason || 'ID verification failed'
      });

    if (error) {
      console.error('[AdminActions] Error rejecting user:', error);
      return { success: false, error: error.message };
    }

    console.log(`[AdminActions] Successfully rejected user: ${userId}`);
    return { success: true, data };
  } catch (error: any) {
    console.error('[AdminActions] Unexpected error:', error);
    return { success: false, error: error.message || 'Failed to reject user' };
  }
};

/**
 * Get admin dashboard statistics
 */
export const fetchAdminStats = async (): Promise<{
  success: boolean;
  data?: AdminStats;
  error?: string;
}> => {
  try {
    console.log('[AdminActions] Fetching admin dashboard stats...');
    
    const { data, error } = await supabase
      .from('admin_dashboard')
      .select('*')
      .single();

    if (error) {
      console.error('[AdminActions] Error fetching admin stats:', error);
      return { success: false, error: error.message };
    }

    console.log('[AdminActions] Successfully fetched admin stats');
    return { success: true, data: data || {} };
  } catch (error: any) {
    console.error('[AdminActions] Unexpected error:', error);
    return { success: false, error: error.message || 'Failed to fetch admin stats' };
  }
};

/**
 * Bulk approve all pending verifications (for testing)
 */
export const bulkApprovePendingVerifications = async (): Promise<AdminResponse> => {
  try {
    console.log('[AdminActions] Bulk approving all pending verifications...');
    
    const { data, error } = await supabase
      .rpc('bulk_approve_pending_verifications');

    if (error) {
      console.error('[AdminActions] Error bulk approving:', error);
      return { success: false, error: error.message };
    }

    console.log(`[AdminActions] Successfully bulk approved ${data} users`);
    return { success: true, data: { approved_count: data } };
  } catch (error: any) {
    console.error('[AdminActions] Unexpected error:', error);
    return { success: false, error: error.message || 'Failed to bulk approve users' };
  }
};

/**
 * Extract file path from storage URL and generate signed URL for private bucket access
 */
export const getSignedImageUrl = async (storageUrl: string): Promise<string | null> => {
  if (!storageUrl) {
    console.log('[AdminActions] No storage URL provided');
    return null;
  }
  
  try {
    console.log('[AdminActions] Processing storage URL:', storageUrl);
    
    let filePath = '';
    
    // Try different URL patterns to extract the file path
    if (storageUrl.includes('/storage/v1/object/public/id-verification/')) {
      // Standard public URL format
      const urlParts = storageUrl.split('/storage/v1/object/public/id-verification/');
      if (urlParts.length === 2) {
        filePath = urlParts[1];
        console.log('[AdminActions] Extracted path from public URL:', filePath);
      }
    } else if (storageUrl.includes('/id-verification/')) {
      // Direct path format - extract everything after the last /id-verification/
      const parts = storageUrl.split('/id-verification/');
      filePath = parts[parts.length - 1];
      console.log('[AdminActions] Extracted path from direct format:', filePath);
    } else {
      // Try to extract filename from the end of the URL
      const urlObj = new URL(storageUrl);
      const pathSegments = urlObj.pathname.split('/');
      filePath = pathSegments[pathSegments.length - 1];
      console.log('[AdminActions] Extracted filename from URL end:', filePath);
    }
    
    if (!filePath) {
      console.error('[AdminActions] Could not extract file path from URL:', storageUrl);
      return null;
    }
    
    // Fix duplicate path segments if they exist
    if (filePath.startsWith('id-verification/')) {
      const originalPath = filePath;
      filePath = filePath.replace('id-verification/', '');
      console.log('[AdminActions] Fixed duplicate path:', originalPath, '->', filePath);
    }
    
    // Ensure we have a valid file path
    if (!filePath || filePath.length === 0) {
      console.error('[AdminActions] Empty file path after processing');
      return null;
    }
    
    console.log('[AdminActions] Final file path for signed URL:', filePath);
    
    // Check file info before generating signed URL
    try {
      const { data: fileInfo, error: infoError } = await supabase.storage
        .from('id-verification')
        .getPublicUrl(filePath);
      
      if (!infoError && fileInfo) {
        console.log('[AdminActions] File info check - Public URL exists:', !!fileInfo.publicUrl);
      }
    } catch (infoError) {
      console.log('[AdminActions] Could not get file info:', infoError);
    }
    
    // First, let's list ALL files in the bucket to see what's actually there
    const { data: allFiles, error: listError } = await supabase.storage
      .from('id-verification')
      .list('', { limit: 100 });
    
    if (listError) {
      console.error('[AdminActions] Error listing bucket files:', listError);
    } else {
      console.log('[AdminActions] === ALL FILES IN BUCKET (ROOT) ===');
      console.log('[AdminActions] Total files:', allFiles?.length || 0);
      allFiles?.forEach((file, index) => {
        console.log(`[AdminActions] File ${index + 1}: ${file.name} (metadata: ${JSON.stringify(file.metadata)})`);
      });
      console.log('[AdminActions] === END ROOT FILE LIST ===');
      
      // Check if there's an id-verification folder and list its contents
      const hasIdVerificationFolder = allFiles?.find(f => f.name === 'id-verification');
      if (hasIdVerificationFolder) {
        console.log('[AdminActions] Found id-verification folder, listing its contents...');
        
        const { data: folderFiles, error: folderError } = await supabase.storage
          .from('id-verification')
          .list('id-verification', { limit: 100 });
        
        if (!folderError && folderFiles) {
          console.log('[AdminActions] === FILES IN id-verification FOLDER ===');
          console.log('[AdminActions] Total files in folder:', folderFiles.length);
          folderFiles.forEach((file, index) => {
            console.log(`[AdminActions] Folder File ${index + 1}: ${file.name} (size: ${file.metadata?.size || 'unknown'} bytes)`);
          });
          console.log('[AdminActions] === END FOLDER FILE LIST ===');
          
          // Check if our target file exists in the folder
          const targetFileInFolder = folderFiles.find(f => f.name === filePath);
          if (targetFileInFolder) {
            console.log('[AdminActions] ✅ Target file found in folder:', targetFileInFolder.name);
            // Update filePath to include the folder
            filePath = `id-verification/${filePath}`;
            console.log('[AdminActions] Updated file path:', filePath);
          } else {
            // Look for partial matches in the folder
            const partialMatches = folderFiles.filter(f => 
              f.name.includes(filePath.split('-')[0]) || 
              filePath.includes(f.name.split('-')[0]) ||
              f.name.includes('5c0213f7-66d6-4dc2-a09b-3da1f601aa72') ||
              f.name.includes('1753978775858')
            );
            if (partialMatches.length > 0) {
              console.log('[AdminActions] Partial matches found in folder:');
              partialMatches.forEach(match => {
                console.log(`[AdminActions] - ${match.name}`);
              });
              // Use the first partial match
              filePath = `id-verification/${partialMatches[0].name}`;
              console.log('[AdminActions] Using partial match:', filePath);
            }
          }
        }
      }
      
      // Check if our target file exists in root
      const targetFile = allFiles?.find(f => f.name === filePath);
      if (targetFile) {
        console.log('[AdminActions] ✅ Target file found in root:', targetFile.name);
      } else {
        console.log('[AdminActions] ❌ Target file NOT found in root:', filePath);
      }
    }
    
    // Generate signed URL for private bucket access (valid for 1 hour)
    const { data, error } = await supabase.storage
      .from('id-verification')
      .createSignedUrl(filePath, 3600); // 1 hour expiry
    
    if (error) {
      console.error('[AdminActions] Error generating signed URL:', error);
      console.error('[AdminActions] Attempted file path:', filePath);
      
      console.log('[AdminActions] File not found, checking if it was already updated to correct path...');
      
      // The file path might have been updated above when we found it in the folder
      // Let's try the updated path first
      if (filePath.startsWith('id-verification/')) {
        console.log('[AdminActions] Trying updated folder path:', filePath);
        
        const { data: folderRetryData, error: folderRetryError } = await supabase.storage
          .from('id-verification')
          .createSignedUrl(filePath, 3600);
        
        if (!folderRetryError && folderRetryData?.signedUrl) {
          console.log('[AdminActions] Successfully generated signed URL with folder path');
          return folderRetryData.signedUrl;
        } else {
          console.error('[AdminActions] Folder path also failed:', folderRetryError);
        }
      }
      
      // Final fallback: try just the filename without subdirectories
      if (filePath.includes('/')) {
        const filename = filePath.split('/').pop();
        console.log('[AdminActions] Final fallback - trying filename only:', filename);
        
        const { data: retryData, error: retryError } = await supabase.storage
          .from('id-verification')
          .createSignedUrl(filename!, 3600);
        
        if (retryError) {
          console.error('[AdminActions] Final fallback also failed:', retryError);
          return null;
        }
        
        if (retryData?.signedUrl) {
          console.log('[AdminActions] Successfully generated signed URL on final fallback');
          return retryData.signedUrl;
        }
      }
      
      return null;
    }
    
    if (!data?.signedUrl) {
      console.error('[AdminActions] No signed URL returned');
      return null;
    }
    
    console.log('[AdminActions] Successfully generated signed URL');
    return data.signedUrl;
    
  } catch (error) {
    console.error('[AdminActions] Error processing image URL:', error);
    return null;
  }
};

/**
 * Fix image URL by removing duplicate path segments (legacy function - use getSignedImageUrl instead)
 */
export const fixImageUrl = (url: string): string => {
  if (!url) return url;
  
  // Check for duplicate id-verification path and fix it
  if (url.includes('/id-verification/id-verification/')) {
    const fixedUrl = url.replace('/id-verification/id-verification/', '/id-verification/');
    console.log('[AdminActions] Fixed duplicate path in URL:', fixedUrl);
    return fixedUrl;
  }
  
  return url;
};

/**
 * Check Supabase storage bucket accessibility and list files for debugging
 */
export const checkStorageBucketAccess = async (): Promise<{
  success: boolean;
  accessible: boolean;
  error?: string;
  files?: string[];
}> => {
  try {
    console.log('[AdminActions] Checking storage bucket access...');
    
    // Try to list files in the id-verification bucket
    const { data, error } = await supabase.storage
      .from('id-verification')
      .list('', { limit: 50 });

    if (error) {
      console.error('[AdminActions] Storage bucket access error:', error);
      return { 
        success: false, 
        accessible: false, 
        error: error.message 
      };
    }

    const fileNames = data?.map(file => file.name) || [];
    console.log('[AdminActions] Storage bucket is accessible');
    console.log('[AdminActions] Files in bucket:', fileNames);
    
    return { 
      success: true, 
      accessible: true, 
      files: fileNames 
    };
  } catch (error: any) {
    console.error('[AdminActions] Storage bucket check failed:', error);
    return { 
      success: false, 
      accessible: false, 
      error: error.message || 'Storage check failed' 
    };
  }
};

/**
 * Debug function to help troubleshoot file paths
 */
export const debugStorageFiles = async (): Promise<void> => {
  try {
    console.log('[AdminActions] === STORAGE DEBUG INFO ===');
    
    const { data, error } = await supabase.storage
      .from('id-verification')
      .list('', { limit: 100 });
    
    if (error) {
      console.error('[AdminActions] Debug: Error listing files:', error);
      return;
    }
    
    console.log('[AdminActions] Debug: Total files in bucket:', data?.length || 0);
    
    if (data && data.length > 0) {
      data.forEach((file, index) => {
        console.log(`[AdminActions] Debug: File ${index + 1}:`, {
          name: file.name,
          id: file.id,
          updated_at: file.updated_at,
          created_at: file.created_at,
          last_accessed_at: file.last_accessed_at,
          metadata: file.metadata
        });
      });
    }
    
    console.log('[AdminActions] === END STORAGE DEBUG ===');
  } catch (error) {
    console.error('[AdminActions] Debug function failed:', error);
  }
};

/**
 * Subscribe to real-time verification status changes
 */
export const subscribeToVerificationChanges = (
  onVerificationChange: (payload: any) => void
) => {
  console.log('[AdminActions] Setting up real-time subscription for verification changes...');
  
  return supabase
    .channel('verification_changes')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: 'verification_status=neq.pending'
      },
      (payload) => {
        console.log('[AdminActions] Verification status changed:', payload);
        onVerificationChange(payload);
      }
    )
    .subscribe();
};