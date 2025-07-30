/**
 * Authentication Context for TeaKE
 * Manages user authentication state across the app
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { authUtils, User } from '../utils/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string; user?: User }>;
  signUp: (email: string, password: string, nickname?: string, phone?: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  uploadVerificationImage: (imageUri: string, idType: 'school_id' | 'national_id') => Promise<{ success: boolean; error?: string }>;
  getVerificationStatus: () => Promise<{ status: 'pending' | 'approved' | 'rejected'; reason?: string } | null>;
  canUserPost: () => Promise<boolean>;
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
    const { data: { subscription } } = authUtils.onAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const result = await authUtils.signInWithGoogle();
      if (result.success && result.user) {
        setUser(result.user);
      }
      return { success: result.success, error: result.error, user: result.user };
    } finally {
      setLoading(false);
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

  const value: AuthContextType = {
    user,
    loading,
    signInWithGoogle,
    signUp,
    signIn,
    signOut,
    updateProfile,
    uploadVerificationImage,
    getVerificationStatus,
    canUserPost,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};