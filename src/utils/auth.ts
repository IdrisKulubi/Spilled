/**
 * Authentication utilities for TeaKE
 */

import { supabase, handleSupabaseError } from '../config/supabase';
import { Database } from '../types/database';

export type User = Database['public']['Tables']['users']['Row'];

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}

export interface SignInResponse {
  success: boolean;
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

  // Sign in with OTP (phone number)
  signInWithOTP: async (phone: string): Promise<SignInResponse> => {
    try {
      const formattedPhone = authUtils.formatPhoneNumber(phone);
      
      if (!authUtils.validateKenyanPhone(formattedPhone)) {
        return {
          success: false,
          error: 'Please enter a valid Kenyan phone number'
        };
      }

      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          // Custom SMS template can be set in Supabase dashboard
        }
      });

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

  // Verify OTP code
  verifyOTP: async (phone: string, otp: string): Promise<AuthResponse> => {
    try {
      const formattedPhone = authUtils.formatPhoneNumber(phone);
      
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otp,
        type: 'sms'
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

      // Create or get user profile
      const userProfile = await authUtils.ensureUserProfile(data.user.id, formattedPhone);
      
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

  // Get current authenticated user
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return null;

      // Get user profile from our users table
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error || !profile) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return profile;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  // Ensure user profile exists in our users table
  ensureUserProfile: async (userId: string, phone?: string): Promise<User> => {
    const { data: existing, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (existing && !fetchError) {
      return existing;
    }

    // Create new user profile
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        id: userId,
        phone: phone,
        verified: false,
      })
      .select()
      .single();

    if (createError || !newUser) {
      throw new Error('Failed to create user profile');
    }

    return newUser;
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

      const { data: updatedUser, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', currentUser.id)
        .select()
        .single();

      if (error || !updatedUser) {
        return {
          success: false,
          error: handleSupabaseError(error)
        };
      }

      return {
        success: true,
        user: updatedUser
      };
    } catch (error) {
      return {
        success: false,
        error: handleSupabaseError(error)
      };
    }
  },

  // Sign out
  signOut: async (): Promise<SignInResponse> => {
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