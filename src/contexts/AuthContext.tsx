/**
 * Authentication Context for TeaKE
 * Manages user authentication state across the app
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { authUtils, User } from '../utils/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithOTP: (phone: string) => Promise<{ success: boolean; error?: string }>;
  verifyOTP: (phone: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: Partial<User>) => Promise<{ success: boolean; error?: string }>;
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

  const signInWithOTP = async (phone: string) => {
    setLoading(true);
    try {
      const result = await authUtils.signInWithOTP(phone);
      return result;
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (phone: string, otp: string) => {
    setLoading(true);
    try {
      const result = await authUtils.verifyOTP(phone, otp);
      if (result.success && result.user) {
        setUser(result.user);
      }
      return { success: result.success, error: result.error };
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

  const value: AuthContextType = {
    user,
    loading,
    signInWithOTP,
    verifyOTP,
    signOut,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};