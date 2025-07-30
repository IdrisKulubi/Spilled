/**
 * Authentication Context for TeaKE
 * Manages user authentication state across the app
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { authUtils, User } from '../utils/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  profileLoading: boolean;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string; user?: User }>;
  signUp: (email: string, password: string, nickname?: string, phone?: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  uploadVerificationImage: (imageUri: string, idType: 'school_id' | 'national_id') => Promise<{ success: boolean; error?: string }>;
  getVerificationStatus: () => Promise<{ status: 'pending' | 'approved' | 'rejected'; reason?: string } | null>;
  canUserPost: () => Promise<boolean>;
  ensureProfileExists: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    // Check for existing session on app start
    const checkUser = async () => {
      try {
        const currentUser = await authUtils.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Error checking user:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Listen for auth state changes
    const { data: { subscription } } = authUtils.onAuthStateChange(async (event, session) => {
      console.log('[Auth] Auth state change event:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('[Auth] User signed in, creating provisional user object...');
        // Set user to a *provisional* object first.
        // It's missing `created_at`, which we use to detect a real DB profile.
        setUser({
          id: session.user.id,
          email: session.user.email,
          nickname: session.user.user_metadata?.full_name || 'User',
          phone: null,
          verified: false,
          verification_status: 'pending',
          id_image_url: null,
          id_type: null,
          rejection_reason: null,
          verified_at: null,
        } as any);
        console.log('[Auth] Provisional user set, auth loading is complete.');
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        console.log('[Auth] User signed out, clearing user state');
        setUser(null);
        setLoading(false);
      } else {
        // For any other auth events, ensure loading is false
        console.log('[Auth] Auth event processed, setting loading to false');
        setLoading(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const result = await authUtils.signInWithGoogle();
      // Don't set user here - let onAuthStateChange handle it to prevent race conditions
      return { success: result.success, error: result.error, user: result.user };
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  // Deprecated functions - keeping for backwards compatibility
  const signUp = async (email: string, password: string, nickname?: string, phone?: string) => {
    setLoading(true);
    try {
      const result = await authUtils.signUp(email, password, nickname, phone);
      if (result.success && result.user) {
        setUser(result.user);
      }
      return { success: result.success, error: result.error, user: result.user };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await authUtils.signIn(email, password);
      if (result.success && result.user) {
        setUser(result.user);
      }
      return { success: result.success, error: result.error, user: result.user };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const result = await authUtils.signOut();
      if (result.success) {
        setUser(null);
      }
      return result;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    try {
      const result = await authUtils.updateProfile(updates);
      if (result.success && result.user) {
        setUser(result.user);
      }
      return { success: result.success, error: result.error };
    } catch (error) {
      return { success: false, error: 'Failed to update profile' };
    }
  };

  const uploadVerificationImage = async (imageUri: string, idType: 'school_id' | 'national_id') => {
    try {
      const result = await authUtils.uploadVerificationImage(imageUri, idType);
      // Refresh user data after upload
      if (result.success) {
        const updatedUser = await authUtils.getCurrentUser();
        if (updatedUser) {
          setUser(updatedUser);
        }
      }
      return { success: result.success, error: result.error };
    } catch (error) {
      return { success: false, error: 'Failed to upload verification image' };
    }
  };

  const getVerificationStatus = async () => {
    return await authUtils.getVerificationStatus();
  };

  const canUserPost = async () => {
    return await authUtils.canUserPost();
  };

  // Ensure profile exists in database - MUST be called before verification screen
  const ensureProfileExists = async (): Promise<boolean> => {
    if (!user) {
      console.log('❌ [Profile] No user session - cannot ensure profile');
      return false;
    }

    console.log('🔧 [Profile] Ensuring profile exists for verification...');
    setProfileLoading(true);

    try {
      // Try multiple times with increasing delays
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        attempts++;
        console.log(`🔄 [Profile] Profile creation attempt ${attempts}/${maxAttempts}`);
        
        try {
          const userProfile = await authUtils.ensureUserProfile(
            user.id,
            user.nickname || user.email?.split('@')[0] || 'User',
            user.phone || undefined,
            user.email || undefined
          );
          
          // Update user with database profile
          setUser(userProfile);
          console.log('✅ [Profile] Profile successfully ensured for verification');
          setProfileLoading(false);
          return true;
          
        } catch (error) {
          console.error(`❌ [Profile] Attempt ${attempts} failed:`, error);
          if (attempts < maxAttempts) {
            // Wait before retry (exponential backoff)
            const delay = attempts * 1000;
            console.log(`⏳ [Profile] Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      console.error('❌ [Profile] All profile creation attempts failed');
      setProfileLoading(false);
      return false;
      
    } catch (error) {
      console.error('❌ [Profile] Unexpected error ensuring profile:', error);
      setProfileLoading(false);
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    profileLoading,
    signInWithGoogle,
    signUp,
    signIn,
    signOut,
    updateProfile,
    uploadVerificationImage,
    getVerificationStatus,
    canUserPost,
    ensureProfileExists,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};