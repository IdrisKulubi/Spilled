/**
 * Google Sign-In Button using Better Auth
 * This replaces the complex expo-auth-session implementation
 * with Better Auth's built-in social authentication
 */

import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { authClient } from '../lib/auth-client';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';

interface BetterAuthGoogleButtonProps {
  onSuccess?: (user: any) => void;
  onError?: (error: string) => void;
  buttonText?: string;
  isSignUp?: boolean;
  callbackURL?: string;
}

export const BetterAuthGoogleButton: React.FC<BetterAuthGoogleButtonProps> = ({
  onSuccess,
  onError,
  buttonText = 'Continue with Google',
  isSignUp = false,
  callbackURL = 'dashboard', // This will be converted to deep link (e.g., spilled://dashboard)
}) => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    
    try {
      // Log environment configuration
      console.log('=== Google Sign-in Debug Info ===');
      console.log('Auth Base URL:', process.env.EXPO_PUBLIC_AUTH_BASE_URL);
      console.log('Google Client ID:', process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID?.substring(0, 20) + '...');
      console.log('Callback URL:', callbackURL);
      console.log('Starting Google sign-in with Better Auth...');
      console.log('[Client] Better Auth Config:', {
        callbackURL: `/${callbackURL}`,
      });
      
      // Check if auth client is properly initialized
      if (!authClient) {
        throw new Error('Auth client is not initialized');
      }

      // Use Better Auth's built-in social sign-in
      // According to Better Auth docs, callbackURL should be a simple path
      const result = await authClient.signIn.social({
        provider: 'google',
        callbackURL: `/auth/callback`,
      });

      console.log('Google sign-in result:', JSON.stringify(result, null, 2));

      // Check for various error conditions
      if (result?.error) {
        console.error('Sign-in error details:', result.error);
        
        // Check for specific error types
        if (result.error.status === 0) {
          throw new Error('Network error: Unable to reach authentication server. Please check your internet connection and ensure the dev server is running.');
        } else if (result.error.status === 404) {
          throw new Error('Authentication endpoint not found. Please ensure the auth API routes are properly configured.');
        } else if (result.error.status === 500) {
          throw new Error('Server error: Authentication server encountered an error. Check server logs for details.');
        } else {
          throw new Error(result.error.message || `Google sign-in failed with status ${result.error.status}`);
        }
      }

      // For OAuth flow, if we get a redirect URL, we need to handle it
      if (result?.data?.redirect && result?.data?.url) {
        console.log('OAuth redirect required, opening browser...');
        console.log('OAuth URL:', result.data.url);
        
        // The OAuth flow will redirect back to the app via the callback screen
        // The session will be handled by the callback screen
        // Don't try to get session here, just let the OAuth flow complete
        
        // Call success callback to indicate OAuth initiation was successful
        if (onSuccess) {
          // Pass a placeholder since we don't have the actual user yet
          onSuccess({ oauthInitiated: true } as any);
        }
        
        return;
      }

      // If we get here, it means we got a direct response (non-OAuth)
      // This shouldn't happen with Google OAuth but handle it just in case
      const session = await authClient.getSession();
      
      if (session?.data?.user) {
        console.log('Sign-in successful (direct), user:', session.data.user);
        
        // Call success callback if provided
        if (onSuccess) {
          onSuccess(session.data.user);
        }

        // For direct sign-in, navigate to home and let routing handle verification
        router.replace('/' as any);
      } else {
        // No session found - this might be normal for OAuth flow
        console.log('No immediate session found - this is normal for OAuth flow');
        
        // Call success callback to indicate OAuth was initiated
        if (onSuccess) {
          onSuccess({ oauthInitiated: true } as any);
        }
      }
    } catch (error) {
      console.error('=== Google Sign-in Error Details ===');
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Full error object:', error);
      
      // Determine the most helpful error message
      let errorMessage = 'Failed to sign in with Google';
      let debugInfo = '';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Add debug information for network errors
        if (errorMessage.includes('Network error')) {
          debugInfo = '\n\nDebug: Make sure:\n1. Your dev server is running (npm start)\n2. You have internet connection\n3. The AUTH_BASE_URL is correct';
        } else if (errorMessage.includes('endpoint not found')) {
          debugInfo = '\n\nDebug: Check that app/api/auth/[...auth]+api.ts exists and exports GET and POST handlers';
        }
      }
      
      const fullErrorMessage = errorMessage + debugInfo;
      
      if (onError) {
        onError(fullErrorMessage);
      } else {
        Alert.alert(
          'Sign-in Failed',
          fullErrorMessage,
          [
            { text: 'OK' },
            { 
              text: 'View Logs', 
              onPress: () => console.log('Check console for detailed error logs')
            }
          ]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handleGoogleSignIn}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={Colors.light.textOnPrimary} size="small" />
      ) : (
        <View style={styles.buttonContent}>
          <Ionicons name="logo-google" size={24} color="#FFFFFF" />
          <Text style={styles.buttonText}>{buttonText}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    minWidth: 280,
    shadowColor: Colors.light.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.textOnPrimary,
    marginLeft: 12,
  },
});
