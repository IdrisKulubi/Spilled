/**
 * Authentication utilities for TeaKE
 */

import { supabase, handleSupabaseError } from '../config/supabase';
import { Database } from '../types/database';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

export type User = Database['public']['Tables']['users']['Row'];

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

export const authUtils = {
  // Phone number validation for Kenyan numbers
  validateKenyanPhone: (phone: string): boolean => {
    // Kenyan phone number regex (supports +254, 254, 07xx, 01xx formats)
    const kenyanPhoneRegex = /^(\+254|254|0)([71][0-9]{8}|[10][0-9]{8})$/;
    return kenyanPhoneRegex.test(phone.replace(/\s+/g, ''));
  },

  // Format phone number to international format
  formatPhoneNumber: (phone: string): string => {
    const cleaned = phone.replace(/\s+/g, '');
    if (cleaned.startsWith('+254')) return cleaned;
    if (cleaned.startsWith('254')) return `+${cleaned}`;
    if (cleaned.startsWith('0')) return `+254${cleaned.substring(1)}`;
    return cleaned;
  },

  // Sign in with Google OAuth
  signInWithGoogle: async (): Promise<AuthResponse> => {
    try {
      // Configure WebBrowser for OAuth
      WebBrowser.maybeCompleteAuthSession();

      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: Platform.OS === 'web' ? undefined : 'teake',
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        return {
          success: false,
          error: handleSupabaseError(error)
        };
      }

      // For web, the OAuth flow is handled automatically
      if (Platform.OS === 'web') {
        return {
          success: true,
        };
      }

      // For mobile, we need to open the URL
      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl,
          {
            showInRecents: true,
          }
        );
        
        if (result.type === 'success') {
          // For mobile OAuth, the session is automatically handled by Supabase
          // We just need to get the current user after successful OAuth
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          if (userError || !user) {
            return {
              success: false,
              error: 'Failed to get user after OAuth'
            };
          }

          // Ensure user profile exists
          const userProfile = await authUtils.ensureUserProfile(
            user.id,
            user.user_metadata?.full_name || user.email?.split('@')[0],
            undefined, // phone - not available from Google OAuth
            user.email
          );
          
          return {
            success: true,
            user: userProfile
          };
        }
        
        return {
          success: false,
          error: 'Authentication was cancelled or failed'
        };
      }

      return {
        success: false,
        error: 'Failed to initialize Google authentication'
      };
    } catch (error) {
      return {
        success: false,
        error: handleSupabaseError(error)
      };
    }
  },

  // Sign up with email and basic info (DEPRECATED - keeping for backwards compatibility)
  signUp: async (email: string, password: string, nickname?: string, phone?: string): Promise<SignUpResponse> => {
    try {
      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return {
          success: false,
          error: 'Please enter a valid email address'
        };
      }

      // Validate phone if provided
      if (phone && !authUtils.validateKenyanPhone(phone)) {
        return {
          success: false,
          error: 'Please enter a valid Kenyan phone number'
        };
      }

      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (error) {
        return {
          success: false,
          error: handleSupabaseError(error)
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: 'Failed to create user account'
        };
      }

      // Create user profile
      const formattedPhone = phone ? authUtils.formatPhoneNumber(phone) : undefined;
      const userProfile = await authUtils.ensureUserProfile(data.user.id, nickname, formattedPhone, email);
      
      return {
        success: true,
        user: userProfile
      };
    } catch (error) {
      return {
        success: false,
        error: handleSupabaseError(error)
      };
    }
  },

  // Sign in with email and password (DEPRECATED - use signInWithGoogle instead)
  signIn: async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        return {
          success: false,
          error: handleSupabaseError(error)
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: 'Failed to authenticate user'
        };
      }

      // Get user profile
      const userProfile = await authUtils.getCurrentUser();
      
      return {
        success: true,
        user: userProfile || undefined
      };
    } catch (error) {
      return {
        success: false,
        error: handleSupabaseError(error)
      };
    }
  },

  // Get current authenticated user
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return null;

      // Get user profile from our users table
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id as any) // Type assertion to bypass strict typing
        .maybeSingle();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return profile as User | null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  // Ensure user profile exists in our users table
  ensureUserProfile: async (userId: string, nickname?: string, phone?: string, email?: string): Promise<User> => {
    // First, try to get existing user
    const { data: existing, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId as any) // Type assertion to bypass strict typing
      .maybeSingle();

    if (existing && !fetchError) {
      return existing as unknown as User;
    }

    // Create new user profile with type assertion
    const insertData = {
      id: userId,
      nickname: nickname || null,
      phone: phone || null,
      email: email || null,
      verified: false,
      verification_status: 'pending' as const,
    };

    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert(insertData as any) // Type assertion to bypass strict typing
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create user profile: ${createError.message}`);
    }

    if (!newUser) {
      throw new Error('Failed to create user profile: No data returned');
    }

    return newUser as unknown as User;
  },

  // Upload ID image for verification
  uploadVerificationImage: async (imageUri: string, idType: 'school_id' | 'national_id'): Promise<VerificationUploadResponse> => {
    try {
      const currentUser = await authUtils.getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          error: 'You must be logged in to upload verification'
        };
      }

      // Convert image to blob for upload
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      const fileName = `verification-${currentUser.id}-${Date.now()}.jpg`;
      const filePath = `id-verification/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('id-verification')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (error) {
        return {
          success: false,
          error: handleSupabaseError(error)
        };
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('id-verification')
        .getPublicUrl(data.path);

      // Update user profile with ID image
      const updateData = {
        id_image_url: publicUrl,
        id_type: idType,
        verification_status: 'pending' as const
      };

      const { error: updateError } = await supabase
        .from('users')
        .update(updateData as any) // Type assertion to bypass strict typing
        .eq('id', currentUser.id as any); // Type assertion for ID

      if (updateError) {
        console.error('Failed to update user profile:', updateError);
      }

      if (updateError) {
        return {
          success: false,
          error: handleSupabaseError(updateError)
        };
      }

      return {
        success: true,
        uploadUrl: publicUrl
      };
    } catch (error) {
      console.error('Error uploading verification image:', error);
      return {
        success: false,
        error: 'Failed to upload verification image. Please try again.'
      };
    }
  },

  // Check verification status
  getVerificationStatus: async (): Promise<{
    status: 'pending' | 'approved' | 'rejected';
    reason?: string;
  } | null> => {
    try {
      const currentUser = await authUtils.getCurrentUser();
      if (!currentUser) return null;

      return {
        status: currentUser.verification_status,
        reason: currentUser.rejection_reason || undefined,
      };
    } catch (error) {
      console.error('Error getting verification status:', error);
      return null;
    }
  },

  // Check if user can post (is verified)
  canUserPost: async (): Promise<boolean> => {
    try {
      const currentUser = await authUtils.getCurrentUser();
      return currentUser?.verification_status === 'approved';
    } catch (error) {
      console.error('Error checking user post permission:', error);
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
          error: 'No authenticated user found'
        };
      }

      // Create a clean update object, removing undefined values and id
      const { id, created_at, ...cleanUpdates } = updates;
      
      const { data: updatedUser, error } = await supabase
        .from('users')
        .update(cleanUpdates as any) // Type assertion to bypass strict typing
        .eq('id', currentUser.id as any) // Type assertion for ID
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: handleSupabaseError(error)
        };
      }

      if (!updatedUser) {
        return {
          success: false,
          error: 'Failed to update user profile'
        };
      }

      return {
        success: true,
        user: updatedUser as unknown as User
      };
    } catch (error) {
      return {
        success: false,
        error: handleSupabaseError(error)
      };
    }
  },

  // Sign out
  signOut: async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return {
          success: false,
          error: handleSupabaseError(error)
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: handleSupabaseError(error)
      };
    }
  },

  // Listen to auth state changes
  onAuthStateChange: (callback: (user: User | null) => void) => {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const userProfile = await authUtils.getCurrentUser();
        callback(userProfile);
      } else if (event === 'SIGNED_OUT') {
        callback(null);
      }
    });
  },
};