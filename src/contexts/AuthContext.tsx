/**
 * Authentication Context for TeaKE
 * Manages user authentication state across the app
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authClient } from '../lib/auth-client';
import { UserRepository } from '../repositories/UserRepository';
import { isUserAdmin } from '../config/admin';
import type { User } from '../database/schema';
import type { User as BetterAuthUser } from 'better-auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  profileLoading: boolean;
  isAdmin: boolean;
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
  const [isAdmin, setIsAdmin] = useState(false);
  const userRepository = new UserRepository();

  // Helper function to get database user from Better Auth user
  const getDatabaseUser = async (betterAuthUser: BetterAuthUser): Promise<User | null> => {
    try {
      let dbUser = await userRepository.findById(betterAuthUser.id);
      
      if (!dbUser) {
        // Create user profile if it doesn't exist
        dbUser = await userRepository.create({
          id: betterAuthUser.id,
          email: betterAuthUser.email || null,
          nickname:  betterAuthUser.name || betterAuthUser.email?.split('@')[0] || 'User',
          verified: false,
          verificationStatus: 'pending',
          createdAt: new Date(),
        });
      }
      
      return dbUser;
    } catch (error) {
      console.error('Error getting database user:', error);
      return null;
    }
  };

  useEffect(() => {
    // Check for existing session on app start
    const checkUser = async () => {
      try {
        const sessionResult = await authClient.getSession();
        if (sessionResult.data?.user) {
          const dbUser = await getDatabaseUser(sessionResult.data.user);
          setUser(dbUser);
          
          // Check if user is admin
          if (sessionResult.data.user.email) {
            const adminStatus = isUserAdmin(sessionResult.data.user.email);
            setIsAdmin(adminStatus);
          } else {
            setIsAdmin(false);
          }
        } else {
          setUser(null);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error checking user:', error);
        setUser(null);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Better Auth doesn't have onSessionChange, so we'll use a different approach
    // For now, we'll rely on the initial check and manual updates
    // TODO: Implement proper session change listening when Better Auth supports it
  }, []);

  const signInWithGoogle = async () => {
    // This method needs to be called from a component that uses the hook
    // For now, return an error indicating the proper way to use Google sign-in
    return {
      success: false,
      error: 'Please use the Google sign-in button component that uses useGoogleAuth hook',
    };
  };

  // Deprecated functions - keeping for backwards compatibility
  const signUp = async (email: string, password: string, nickname?: string, phone?: string) => {
    setLoading(true);
    try {
      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return {
          success: false,
          error: "Please enter a valid email address",
        };
      }

      const result = await authClient.signUp.email({
        email,
        password,
        name: nickname || email.split('@')[0],
        callbackURL: "/",
      });

      if (result.error) {
        return {
          success: false,
          error: result.error.message || 'Sign up failed',
        };
      }

      // Check if we have a user in the response
      if (result.data && 'user' in result.data && result.data.user) {
        const dbUser = await getDatabaseUser(result.data.user);
        
        if (!dbUser) {
          return {
            success: false,
            error: 'Failed to create user profile',
          };
        }
        
        // Update user profile with additional fields if provided
        if (nickname || phone) {
          try {
            const updatedUser = await userRepository.update(result.data.user.id, {
              nickname: nickname || null,
              phone: phone || null,
            });
            if (updatedUser) {
              setUser(updatedUser);
              return {
                success: true,
                user: updatedUser,
              };
            }
          } catch (updateError) {
            console.warn('Failed to update user profile after signup:', updateError);
          }
        }
        
        setUser(dbUser);
        return {
          success: true,
          user: dbUser,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sign up failed',
      };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await authClient.signIn.email({
        email,
        password,
        callbackURL: "/",
      });

      if (result.error) {
        return {
          success: false,
          error: result.error.message || 'Sign in failed',
        };
      }

      // Check if we have a user in the response
      if (result.data && 'user' in result.data && result.data.user) {
        const dbUser = await getDatabaseUser(result.data.user);
        
        if (!dbUser) {
          return {
            success: false,
            error: 'Failed to load user profile',
          };
        }
        
        setUser(dbUser);
        return {
          success: true,
          user: dbUser,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sign in failed',
      };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const result = await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            setUser(null);
            setIsAdmin(false);
          },
        },
      });

      if (result.error) {
        return {
          success: false,
          error: result.error.message || 'Sign out failed',
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sign out failed',
      };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    try {
      if (!user) {
        return { success: false, error: 'No authenticated user found' };
      }

      // Update user profile in database using repository
      const updatedUser = await userRepository.update(user.id, updates);
      
      if (updatedUser) {
        setUser(updatedUser);
        return { success: true };
      } else {
        return { success: false, error: 'Failed to update profile' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update profile' 
      };
    }
  };

  const uploadVerificationImage = async (imageUri: string, idType: 'school_id' | 'national_id') => {
    try {
      if (!user) {
        return { success: false, error: 'You must be logged in to upload verification' };
      }

      // TODO: Implement file upload with Cloudinary or alternative storage
      // For now, return a placeholder implementation
      console.warn('uploadVerificationImage: File storage migration not yet implemented');
      
      // Update user profile with verification status
      const updatedUser = await userRepository.update(user.id, {
        idType: idType,
        verificationStatus: 'pending',
        // idImageUrl will be set once file storage is implemented
      });

      if (updatedUser) {
        setUser(updatedUser);
        return { success: true };
      } else {
        return { success: false, error: 'Failed to update verification status' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to upload verification image' 
      };
    }
  };

  const getVerificationStatus = async () => {
    try {
      if (!user) return null;

      return {
        status: (user.verificationStatus as 'pending' | 'approved' | 'rejected') || 'pending',
        reason: user.rejectionReason || undefined,
      };
    } catch (error) {
      return null;
    }
  };

  const canUserPost = async () => {
    try {
      return user?.verificationStatus === 'approved' || false;
    } catch (error) {
      return false;
    }
  };

  // Ensure profile exists in database - MUST be called before verification screen
  const ensureProfileExists = async (): Promise<boolean> => {
    if (!user) {
      return false;
    }

    setProfileLoading(true);

    try {
      // Get the current Better Auth session
      const sessionResult = await authClient.getSession();
      if (!sessionResult.data?.user) {
        setProfileLoading(false);
        return false;
      }

      // Try multiple times with increasing delays
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        attempts++;
        
        try {
          const dbUser = await getDatabaseUser(sessionResult.data.user);
          
          if (dbUser) {
            // Update user with database profile
            setUser(dbUser);
            setProfileLoading(false);
            return true;
          }
          
        } catch (error) {
          console.error(` [Profile] Attempt ${attempts} failed:`, error);
          if (attempts < maxAttempts) {
            // Wait before retry (exponential backoff)
            const delay = attempts * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      console.error(' [Profile] All profile creation attempts failed');
      setProfileLoading(false);
      return false;
      
    } catch (error) {
      console.error(' [Profile] Unexpected error ensuring profile:', error);
      setProfileLoading(false);
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    profileLoading,
    isAdmin,
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