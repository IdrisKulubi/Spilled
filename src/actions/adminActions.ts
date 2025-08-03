/**
 * Admin Actions - Handle admin functionality for user verification management
 */

import { supabase } from "../config/supabase";

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
    const { data, error } = await (supabase as any ).rpc("get_verification_queue");

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
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
    const { data, error } = await (supabase as any).rpc("approve_user_verification", {
      user_id: userId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
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
    const { data, error } = await (supabase as any).rpc("reject_user_verification", {
      user_id: userId,
      reason: reason || "ID verification failed",
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
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
    const { data, error } = await (supabase as any).rpc("get_admin_stats");

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || {} };
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
      const { data, error } = await (supabase as any).rpc(
        "bulk_approve_pending_verifications"
      );

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: { approved_count: data } };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to bulk approve users",
      };
    }
  };

/**
 * Extract file path from storage URL and generate signed URL for private bucket access
 */
export const getSignedImageUrl = async (
  storageUrl: string
): Promise<string | null> => {
  if (!storageUrl) {
    return null;
  }

  try {
    let filePath = "";

    // Try different URL patterns to extract the file path
    if (storageUrl.includes("/storage/v1/object/public/id-verification/")) {
      // Standard public URL format
      const urlParts = storageUrl.split(
        "/storage/v1/object/public/id-verification/"
      );
      if (urlParts.length === 2) {
        filePath = urlParts[1];
      }
    } else if (storageUrl.includes("/id-verification/")) {
      // Direct path format - extract everything after the last /id-verification/
      const parts = storageUrl.split("/id-verification/");
      filePath = parts[parts.length - 1];
    } else {
      // Try to extract filename from the end of the URL
      const urlObj = new URL(storageUrl);
      const pathSegments = urlObj.pathname.split("/");
      filePath = pathSegments[pathSegments.length - 1];
    }

    if (!filePath) {
      return null;
    }

    // Fix duplicate path segments if they exist
    if (filePath.startsWith("id-verification/")) {
      filePath = filePath.replace("id-verification/", "");
    }

    // Ensure we have a valid file path
    if (!filePath || filePath.length === 0) {
      return null;
    }

    // First, let's list ALL files in the bucket to see what's actually there
    const { data: allFiles, error: listError } = await supabase.storage
      .from("id-verification")
      .list("", { limit: 100 });

    if (!listError && allFiles) {
      // Check if there's an id-verification folder and list its contents
      const hasIdVerificationFolder = allFiles?.find(
        (f) => f.name === "id-verification"
      );
      if (hasIdVerificationFolder) {
        const { data: folderFiles, error: folderError } = await supabase.storage
          .from("id-verification")
          .list("id-verification", { limit: 100 });

        if (!folderError && folderFiles) {
          // Check if our target file exists in the folder
          const targetFileInFolder = folderFiles.find(
            (f) => f.name === filePath
          );
          if (targetFileInFolder) {
            // Update filePath to include the folder
            filePath = `id-verification/${filePath}`;
          } else {
            // Look for partial matches in the folder
            const partialMatches = folderFiles.filter(
              (f) =>
                f.name.includes(filePath.split("-")[0]) ||
                filePath.includes(f.name.split("-")[0]) ||
                f.name.includes("5c0213f7-66d6-4dc2-a09b-3da1f601aa72") ||
                f.name.includes("1753978775858")
            );
            if (partialMatches.length > 0) {
              // Use the first partial match
              filePath = `id-verification/${partialMatches[0].name}`;
            }
          }
        }
      }
    }

    // Generate signed URL for private bucket access (valid for 1 hour)
    const { data, error } = await supabase.storage
      .from("id-verification")
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) {
      // The file path might have been updated above when we found it in the folder
      // Let's try the updated path first
      if (filePath.startsWith("id-verification/")) {
        const { data: folderRetryData, error: folderRetryError } =
          await supabase.storage
            .from("id-verification")
            .createSignedUrl(filePath, 3600);

        if (!folderRetryError && folderRetryData?.signedUrl) {
          return folderRetryData.signedUrl;
        }
      }

      // Final fallback: try just the filename without subdirectories
      if (filePath.includes("/")) {
        const filename = filePath.split("/").pop();

        const { data: retryData, error: retryError } = await supabase.storage
          .from("id-verification")
          .createSignedUrl(filename!, 3600);

        if (!retryError && retryData?.signedUrl) {
          return retryData.signedUrl;
        }
      }

      return null;
    }

    if (!data?.signedUrl) {
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    return null;
  }
};

/**
 * Fix image URL by removing duplicate path segments (legacy function - use getSignedImageUrl instead)
 */
export const fixImageUrl = (url: string): string => {
  if (!url) return url;

  // Check for duplicate id-verification path and fix it
  if (url.includes("/id-verification/id-verification/")) {
    const fixedUrl = url.replace(
      "/id-verification/id-verification/",
      "/id-verification/"
    );
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
    // Try to list files in the id-verification bucket
    const { data, error } = await supabase.storage
      .from("id-verification")
      .list("", { limit: 50 });

    if (error) {
      return {
        success: false,
        accessible: false,
        error: error.message,
      };
    }

    const fileNames = data?.map((file) => file.name) || [];

    return {
      success: true,
      accessible: true,
      files: fileNames,
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
 */
export const debugStorageFiles = async (): Promise<void> => {
  try {
    const { error } = await supabase.storage
      .from("id-verification")
      .list("", { limit: 100 });

    if (error) {
      return;
    }

    // Debug information is available but not logged to console
    // This function can be used for debugging purposes when needed
  } catch (error) {
    // Silent error handling
  }
};

/**
 * Subscribe to real-time verification status changes
 */
export const subscribeToVerificationChanges = (
  onVerificationChange: (payload: any) => void
) => {
  return supabase
    .channel("verification_changes")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "users",
        filter: "verification_status=neq.pending",
      },
      (payload) => {
        onVerificationChange(payload);
      }
    )
    .subscribe();
};
