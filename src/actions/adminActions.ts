/**
 * Admin Actions - Handle admin functionality for user verification management
 */

import { supabase } from '../config/supabase';
import { Database } from '../types/database';

type User = Database['public']['Tables']['users']['Row'];

/**
 * Utility function to validate and potentially fix image URLs
 */
const validateImageUrl = (url: string): { valid: boolean; fixedUrl?: string; error?: string } => {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is empty or not a string' };
  }

  try {
    const urlObj = new URL(url);
    
    // Check if it's a Supabase storage URL
    if (urlObj.hostname.includes('supabase')) {
      return { valid: true, fixedUrl: url };
    }
    
    // Check if it's a valid HTTP/HTTPS URL
    if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
      return { valid: true, fixedUrl: url };
    }
    
    return { valid: false, error: 'Invalid protocol' };
  } catch (error) {
    return { valid: false, error: `Invalid URL format: ${error}` };
  }
};

/**
 * Test if an image URL is accessible
 */
const testImageAccessibility = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('[AdminActions] Image accessibility test failed:', error);
    return false;
  }
};

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
    
    // Validate and log image URLs
    if (data && data.length > 0) {
      for (const user of data) {
        console.log(`[AdminActions] User ${user.user_id}:`);
        console.log(`  - Email: ${user.email}`);
        console.log(`  - Image URL: ${user.id_image_url}`);
        console.log(`  - URL length: ${user.id_image_url?.length || 0}`);
        console.log(`  - URL starts with: ${user.id_image_url?.substring(0, 50) || 'N/A'}`);
        
        // Validate URL format
        if (user.id_image_url) {
          const validation = validateImageUrl(user.id_image_url);
          console.log(`  - URL validation: ${validation.valid ? 'VALID' : 'INVALID'}`);
          if (!validation.valid) {
            console.log(`  - Validation error: ${validation.error}`);
          }
          
          // Test accessibility (only for first user to avoid too many requests)
          if (validation.valid && data.indexOf(user) === 0) {
            const accessible = await testImageAccessibility(user.id_image_url);
            console.log(`  - URL accessible: ${accessible ? 'YES' : 'NO'}`);
          }
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
 * Fix image URL by removing duplicate path segments
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
 * Check Supabase storage bucket accessibility
 */
export const checkStorageBucketAccess = async (): Promise<{
  success: boolean;
  accessible: boolean;
  error?: string;
}> => {
  try {
    console.log('[AdminActions] Checking storage bucket access...');
    
    // Try to list files in the id-verification bucket
    const { data, error } = await supabase.storage
      .from('id-verification')
      .list('', { limit: 1 });

    if (error) {
      console.error('[AdminActions] Storage bucket access error:', error);
      return { 
        success: false, 
        accessible: false, 
        error: error.message 
      };
    }

    console.log('[AdminActions] Storage bucket is accessible');
    return { success: true, accessible: true };
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