/**
 * Admin Actions - Handle admin functionality for user verification management
 */

import { UserRepository } from "../repositories/UserRepository";
import { db } from "../database/connection";
import { users, stories, messages } from "../database/schema";
import { sql, gte, eq } from "drizzle-orm";
import type { User } from "../database/schema";

// Initialize repositories
const userRepository = new UserRepository();

export interface PendingVerification {
  user_id: string;
  email: string;
  nickname: string;
  phone: string;
  id_image_url: string;
  id_type: "school_id" | "national_id";
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
    const pendingUsers = await userRepository.findPendingVerificationUsers({
      limit: 100, // Get all pending verifications
    });

    const pendingVerifications: PendingVerification[] = pendingUsers.data.map((user: User) => {
      const createdAt = new Date(user.createdAt);
      const now = new Date();
      const daysWaiting = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

      return {
        user_id: user.id,
        email: user.email || "",
        nickname: user.nickname || "",
        phone: user.phone || "",
        id_image_url: user.idImageUrl || "",
        id_type: user.idType || "school_id",
        created_at: user.createdAt.toISOString(),
        days_waiting: daysWaiting,
      };
    });

    return { success: true, data: pendingVerifications };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to fetch pending verifications",
    };
  }
};

/**
 * Approve a user's verification
 */
export const approveUserVerification = async (
  userId: string
): Promise<AdminResponse> => {
  try {
    const updatedUser = await userRepository.updateVerificationStatus(
      userId,
      "approved"
    );

    if (!updatedUser) {
      return { success: false, error: "User not found" };
    }

    return { 
      success: true, 
      data: {
        user_id: updatedUser.id,
        verification_status: updatedUser.verificationStatus,
        verified_at: updatedUser.verifiedAt,
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to approve user" };
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
    const updatedUser = await userRepository.updateVerificationStatus(
      userId,
      "rejected",
      reason || "ID verification failed"
    );

    if (!updatedUser) {
      return { success: false, error: "User not found" };
    }

    return { 
      success: true, 
      data: {
        user_id: updatedUser.id,
        verification_status: updatedUser.verificationStatus,
        rejection_reason: updatedUser.rejectionReason,
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to reject user" };
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
    // Get user statistics
    const userStats = await userRepository.getUserStats();

    // Calculate date for one week ago
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Get new signups in the last week
    const newSignupsResult = await db
      .select({ count: sql`count(*)` })
      .from(users)
      .where(gte(users.createdAt, oneWeekAgo));

    // Get new stories in the last week
    const newStoriesResult = await db
      .select({ count: sql`count(*)` })
      .from(stories)
      .where(gte(stories.createdAt, oneWeekAgo));

    // Get new messages in the last week
    const newMessagesResult = await db
      .select({ count: sql`count(*)` })
      .from(messages)
      .where(gte(messages.createdAt, oneWeekAgo));

    // Calculate average verification time for approved users
    const avgVerificationResult = await db
      .select({
        avg_hours: sql`EXTRACT(EPOCH FROM AVG(verified_at - created_at)) / 3600`
      })
      .from(users)
      .where(eq(users.verificationStatus, "approved"));

    const avgVerificationHours = Number(avgVerificationResult[0]?.avg_hours || 0);

    const adminStats: AdminStats = {
      pending_verifications: userStats.pending,
      verified_users: userStats.verified,
      rejected_users: userStats.rejected,
      new_signups_week: Number(newSignupsResult[0]?.count || 0),
      new_stories_week: Number(newStoriesResult[0]?.count || 0),
      new_messages_week: Number(newMessagesResult[0]?.count || 0),
      avg_verification_hours: Math.round(avgVerificationHours * 100) / 100, // Round to 2 decimal places
    };

    return { success: true, data: adminStats };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to fetch admin stats",
    };
  }
};

/**
 * Bulk approve all pending verifications (for testing)
 */
export const bulkApprovePendingVerifications =
  async (): Promise<AdminResponse> => {
    try {
      // Get all pending verification users
      const pendingUsers = await userRepository.findPendingVerificationUsers({
        limit: 1000, // Large limit to get all pending users
      });

      if (pendingUsers.data.length === 0) {
        return { success: true, data: { approved_count: 0 } };
      }

      // Extract user IDs
      const userIds = pendingUsers.data.map((user: User) => user.id);

      // Bulk approve all pending users
      const approvedUsers = await userRepository.bulkUpdateVerificationStatus(
        userIds,
        "approved"
      );

      return { success: true, data: { approved_count: approvedUsers.length } };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to bulk approve users",
      };
    }
  };

/**
 * Get signed URL for verification image access
 * TODO: Implement with Cloudinary or alternative file storage
 */
export const getSignedImageUrl = async (
  storageUrl: string
): Promise<string | null> => {
  if (!storageUrl) {
    return null;
  }

  try {
    // TODO: Replace with Cloudinary URL transformation or alternative storage solution
    // For now, return the URL as-is if it's already a valid URL
    if (storageUrl.startsWith('http://') || storageUrl.startsWith('https://')) {
      return storageUrl;
    }

    // If it's a relative path, we'll need to implement proper file storage retrieval
    console.warn('getSignedImageUrl: File storage migration not yet implemented');
    return null;
  } catch (error) {
    console.error('Error getting signed image URL:', error);
    return null;
  }
};

/**
 * Fix image URL by removing duplicate path segments (legacy function - use getSignedImageUrl instead)
 */
export const fixImageUrl = (url: string): string => {
  if (!url) return url;

  // TODO: Implement URL fixing for new file storage solution
  // For now, return the URL as-is
  return url;
};

/**
 * Check file storage accessibility and list files for debugging
 * TODO: Implement with Cloudinary or alternative file storage
 */
export const checkStorageBucketAccess = async (): Promise<{
  success: boolean;
  accessible: boolean;
  error?: string;
  files?: string[];
}> => {
  try {
    // TODO: Implement storage check with new file storage solution
    console.warn('checkStorageBucketAccess: File storage migration not yet implemented');
    
    return {
      success: true,
      accessible: false,
      error: "File storage migration not yet implemented",
      files: [],
    };
  } catch (error: any) {
    return {
      success: false,
      accessible: false,
      error: error.message || "Storage check failed",
    };
  }
};

/**
 * Debug function to help troubleshoot file paths
 * TODO: Implement with new file storage solution
 */
export const debugStorageFiles = async (): Promise<void> => {
  try {
    // TODO: Implement storage debugging with new file storage solution
    console.warn('debugStorageFiles: File storage migration not yet implemented');
  } catch (error) {
    // Silent error handling
  }
};

/**
 * Subscribe to real-time verification status changes
 * TODO: Implement with alternative real-time solution (WebSockets, Server-Sent Events, etc.)
 */
export const subscribeToVerificationChanges = (
  onVerificationChange: (payload: any) => void
) => {
  // TODO: Implement real-time subscriptions with alternative solution
  console.warn('subscribeToVerificationChanges: Real-time subscriptions not yet implemented');
  
  // Return a mock subscription object for compatibility
  return {
    unsubscribe: () => {
      console.log('Unsubscribed from verification changes');
    }
  };
};
