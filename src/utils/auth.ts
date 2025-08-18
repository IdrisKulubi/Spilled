/**
 * Authentication utilities for TeaKE
 * Updated to use Better Auth instead of Supabase
 */

import { authClient } from "../lib/auth-client";
import { UserRepository } from "../repositories/UserRepository";
import type { User } from "../database/schema";
import { uploadImageToR2, deleteImageFromR2, validateImageFile } from "./imageUpload";

// Initialize repository
const userRepository = new UserRepository();

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}

export interface SignUpResponse {
  success: boolean;
  user?: User;
  error?: string;
}

export interface VerificationUploadResponse {
  success: boolean;
  uploadUrl?: string;
  error?: string;
}

// Helper function to handle Better Auth errors
const handleBetterAuthError = (error: any): string => {
  if (error?.message) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unexpected error occurred";
};

export const authUtils = {
  // Phone number validation for Kenyan numbers
  validateKenyanPhone: (phone: string): boolean => {
    // Kenyan phone number regex (supports +254, 254, 07xx, 01xx formats)
    const kenyanPhoneRegex = /^(\+254|254|0)([71][0-9]{8}|[10][0-9]{8})$/;
    return kenyanPhoneRegex.test(phone.replace(/\s+/g, ""));
  },

  // Format phone number to international format
  formatPhoneNumber: (phone: string): string => {
    const cleaned = phone.replace(/\s+/g, "");
    if (cleaned.startsWith("+254")) return cleaned;
    if (cleaned.startsWith("254")) return `+${cleaned}`;
    if (cleaned.startsWith("0")) return `+254${cleaned.substring(1)}`;
    return cleaned;
  },

  // Sign in with Google OAuth
  signInWithGoogle: async (): Promise<AuthResponse> => {
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/", // Redirect to home after sign in
      });

      if (result.error) {
        return {
          success: false,
          error: handleBetterAuthError(result.error),
        };
      }

      // Check if we have a user in the response
      if (result.data && "user" in result.data && result.data.user) {
        // Get or create user profile in our database
        const userProfile = await authUtils.ensureUserProfile(
          result.data.user.id,
          result.data.user.name || result.data.user.email?.split("@")[0],
          undefined, // phone not available from Better Auth user object
          result.data.user.email || undefined
        );

        return {
          success: true,
          user: userProfile,
        };
      }

      // If no user in response, it might be a redirect flow
      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: handleBetterAuthError(error),
      };
    }
  },

  // Sign up with email and basic info (DEPRECATED - keeping for backwards compatibility)
  signUp: async (
    email: string,
    password: string,
    nickname?: string,
    phone?: string
  ): Promise<SignUpResponse> => {
    try {
      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return {
          success: false,
          error: "Please enter a valid email address",
        };
      }

      // Validate phone if provided
      if (phone && !authUtils.validateKenyanPhone(phone)) {
        return {
          success: false,
          error: "Please enter a valid Kenyan phone number",
        };
      }

      const result = await authClient.signUp.email({
        email,
        password,
        name: nickname || email.split("@")[0],
        callbackURL: "/",
      });

      if (result.error) {
        return {
          success: false,
          error: handleBetterAuthError(result.error),
        };
      }

      if (!result.data?.user) {
        return {
          success: false,
          error: "Failed to create user account",
        };
      }

      // Create user profile
      const formattedPhone = phone
        ? authUtils.formatPhoneNumber(phone)
        : undefined;
      const userProfile = await authUtils.ensureUserProfile(
        result.data.user.id,
        nickname,
        formattedPhone,
        email
      );

      return {
        success: true,
        user: userProfile,
      };
    } catch (error) {
      return {
        success: false,
        error: handleBetterAuthError(error),
      };
    }
  },

  // Sign in with email and password (DEPRECATED - use signInWithGoogle instead)
  signIn: async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const result = await authClient.signIn.email({
        email,
        password,
        callbackURL: "/",
      });

      if (result.error) {
        return {
          success: false,
          error: handleBetterAuthError(result.error),
        };
      }

      if (!result.data?.user) {
        return {
          success: false,
          error: "Failed to authenticate user",
        };
      }

      // Get user profile from database
      const userProfile = await authUtils.getCurrentUser();

      return {
        success: true,
        user: userProfile || undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: handleBetterAuthError(error),
      };
    }
  },

  // Get current authenticated user
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const sessionResult = await authClient.getSession();

      if (!sessionResult.data?.user) {
        return null;
      }

      // Get user profile from our users table
      const profile = await userRepository.findById(sessionResult.data.user.id);

      return profile;
    } catch (error) {
      return null;
    }
  },

  // Ensure user profile exists in our users table
  ensureUserProfile: async (
    userId: string,
    nickname?: string,
    phone?: string,
    email?: string
  ): Promise<User> => {
    try {
      // First, check if user profile already exists
      const existing = await userRepository.findById(userId);

      if (existing) {
        return existing;
      }
    } catch (error) {
      // Continue to create new profile if check fails
    }

    // Create new user profile
    try {
      const newUser = await userRepository.create({
        id: userId,
        nickname: nickname || null,
        phone: phone || null,
        email: email || null,
        verified: false,
        verificationStatus: "pending",
        createdAt: new Date(),
      });

      return newUser;
    } catch (error) {
      throw new Error(
        `Failed to create user profile: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  },

  // Upload ID image for verification
  uploadVerificationImage: async (
    imageUri: string,
    idType: "school_id" | "national_id"
  ): Promise<VerificationUploadResponse> => {
    try {
      const currentUser = await authUtils.getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          error: "You must be logged in to upload verification",
        };
      }

      // Validate image file before upload
      const validation = await validateImageFile(imageUri, 10 * 1024 * 1024); // 10MB limit
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error || "Invalid image file",
        };
      }

      // Upload image to R2
      const uploadResult = await uploadImageToR2(imageUri, {
        prefix: 'verification-images',
        fileName: `verification_${currentUser.id}_${Date.now()}.jpg`
      });

      if (!uploadResult.success) {
        return {
          success: false,
          error: uploadResult.error || "Failed to upload verification image",
        };
      }

      // Update user profile with verification status and image URL
      const updatedUser = await userRepository.update(currentUser.id, {
        idType: idType,
        verificationStatus: "pending",
        idImageUrl: uploadResult.url,
      });

      if (updatedUser) {
        return {
          success: true,
          uploadUrl: uploadResult.url,
        };
      } else {
        // If database update fails, try to clean up uploaded image
        if (uploadResult.url) {
          await deleteImageFromR2(uploadResult.url).catch(console.error);
        }
        return {
          success: false,
          error: "Failed to update verification status",
        };
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to upload verification image. Please try again.",
      };
    }
  },

  // Check verification status
  getVerificationStatus: async (): Promise<{
    status: "pending" | "approved" | "rejected";
    reason?: string;
  } | null> => {
    try {
      const currentUser = await authUtils.getCurrentUser();
      if (!currentUser) return null;

      return {
        status: currentUser.verificationStatus || "pending",
        reason: currentUser.rejectionReason || undefined,
      };
    } catch (error) {
      return null;
    }
  },

  // Check if user can post (is verified)
  canUserPost: async (): Promise<boolean> => {
    try {
      const currentUser = await authUtils.getCurrentUser();
      return currentUser?.verificationStatus === "approved";
    } catch (error) {
      return false;
    }
  },

  // Update user profile
  updateProfile: async (updates: Partial<User>): Promise<AuthResponse> => {
    try {
      const currentUser = await authUtils.getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          error: "No authenticated user found",
        };
      }

      // Update user profile using repository
      const updatedUser = await userRepository.update(currentUser.id, updates);

      if (!updatedUser) {
        return {
          success: false,
          error: "Failed to update user profile",
        };
      }

      return {
        success: true,
        user: updatedUser,
      };
    } catch (error) {
      return {
        success: false,
        error: handleBetterAuthError(error),
      };
    }
  },

  // Sign out
  signOut: async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await authClient.signOut();

      if (result.error) {
        return {
          success: false,
          error: handleBetterAuthError(result.error),
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: handleBetterAuthError(error),
      };
    }
  },

  // Transform Better Auth user to our User type (for compatibility)
  transformUser: (betterAuthUser: any): User | null => {
    if (!betterAuthUser) return null;

    // This is mainly for compatibility - in practice we should use the database user
    return {
      id: betterAuthUser.id,
      email: betterAuthUser.email,
      phone: betterAuthUser.phone,
      nickname: betterAuthUser.nickname || betterAuthUser.name || null,
      verified: false,
      verificationStatus: "pending",
      createdAt: new Date(),
    } as User;
  },

  // Validate if a user exists by ID
  validateUserExists: async (
    userId: string
  ): Promise<{ exists: boolean; user?: User; error?: string }> => {
    try {
      if (
        !userId ||
        userId.trim() === "" ||
        userId === "undefined" ||
        userId === "null"
      ) {
        return {
          exists: false,
          error: "Invalid user ID provided",
        };
      }

      // Basic UUID format validation
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        return {
          exists: false,
          error: "Invalid user ID format",
        };
      }

      const user = await userRepository.findById(userId);

      if (!user) {
        return {
          exists: false,
          error: "User not found",
        };
      }

      return {
        exists: true,
        user: user,
      };
    } catch (error) {
      return {
        exists: false,
        error: "Failed to validate user",
      };
    }
  },

  // Listen to auth state changes
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    // Better Auth doesn't have onSessionChange in the same way as Supabase
    // This is mainly for compatibility with existing code
    // For now, we'll return a dummy unsubscribe function
    console.warn(
      "onAuthStateChange: Better Auth session change listening not yet implemented"
    );

    return {
      data: {
        subscription: {
          unsubscribe: () => {
            // Placeholder unsubscribe function
          },
        },
      },
    };
  },
};
