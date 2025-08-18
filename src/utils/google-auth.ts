/**
 * Google OAuth implementation for Expo/React Native
 * Uses expo-auth-session for proper OAuth flow on mobile
 */

import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';
import { authClient } from '../lib/auth-client';
import { authUtils } from './auth';
import type { User } from '../database/schema';

// Ensure web browser sessions complete properly
WebBrowser.maybeCompleteAuthSession();

// Google OAuth configuration
const GOOGLE_CONFIG = {
  // For Android - use reversed client ID
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  // For iOS
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  // For web/development
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  // Scopes we need
  scopes: ['openid', 'profile', 'email'],
};

export interface GoogleAuthResult {
  success: boolean;
  user?: User;
  error?: string;
  idToken?: string;
}

/**
 * Initialize Google sign-in with expo-auth-session
 * This returns a hook that can be used in React components
 */
export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: GOOGLE_CONFIG.androidClientId,
    iosClientId: GOOGLE_CONFIG.iosClientId,
    webClientId: GOOGLE_CONFIG.webClientId,
    scopes: GOOGLE_CONFIG.scopes,
    // Use Expo proxy for OAuth redirect in development
    redirectUri: makeRedirectUri({
      useProxy: true,
    }),
  });

  return {
    request,
    response,
    promptAsync,
  };
}

/**
 * Handle Google OAuth response and create/update user
 */
export async function handleGoogleSignIn(
  authentication: Google.TokenResponse
): Promise<GoogleAuthResult> {
  try {
    if (!authentication?.idToken) {
      return {
        success: false,
        error: 'No ID token received from Google',
      };
    }

    // Decode the ID token to get user info
    const userInfo = await fetchGoogleUserInfo(authentication.accessToken);
    
    if (!userInfo) {
      return {
        success: false,
        error: 'Failed to fetch user information from Google',
      };
    }

    // Store tokens securely
    await SecureStore.setItemAsync('google_id_token', authentication.idToken);
    await SecureStore.setItemAsync('google_access_token', authentication.accessToken);
    
    // Create or update user in our database
    const user = await createOrUpdateUser(userInfo);
    
    if (!user) {
      return {
        success: false,
        error: 'Failed to create or update user profile',
      };
    }

    // Store user session
    await SecureStore.setItemAsync('user_session', JSON.stringify({
      user,
      expiresAt: Date.now() + (authentication.expiresIn ? authentication.expiresIn * 1000 : 3600000),
    }));

    return {
      success: true,
      user,
      idToken: authentication.idToken,
    };
  } catch (error) {
    console.error('Google sign-in error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sign in with Google',
    };
  }
}

/**
 * Fetch user info from Google using access token
 */
async function fetchGoogleUserInfo(accessToken: string | undefined): Promise<any> {
  if (!accessToken) return null;
  
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      return await response.json();
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching Google user info:', error);
    return null;
  }
}

/**
 * Create or update user in our database
 */
async function createOrUpdateUser(googleUser: any): Promise<User | null> {
  try {
    // Map Google user data to our user structure
    const userData = {
      id: googleUser.id,
      email: googleUser.email,
      nickname: googleUser.name || googleUser.email?.split('@')[0] || 'User',
      verified: googleUser.verified_email || false,
    };

    // Use authUtils to ensure user profile exists
    const user = await authUtils.ensureUserProfile(
      userData.id,
      userData.nickname,
      undefined, // phone
      userData.email
    );

    return user;
  } catch (error) {
    console.error('Error creating/updating user:', error);
    return null;
  }
}

/**
 * Sign out and clear stored tokens
 */
export async function signOutGoogle(): Promise<void> {
  try {
    // Clear stored tokens
    await SecureStore.deleteItemAsync('google_id_token');
    await SecureStore.deleteItemAsync('google_access_token');
    await SecureStore.deleteItemAsync('user_session');
    
    // Sign out from Better Auth if connected
    await authClient.signOut().catch(console.error);
  } catch (error) {
    console.error('Error signing out:', error);
  }
}

/**
 * Check if user has a valid session
 */
export async function checkGoogleSession(): Promise<User | null> {
  try {
    const sessionStr = await SecureStore.getItemAsync('user_session');
    
    if (!sessionStr) return null;
    
    const session = JSON.parse(sessionStr);
    
    // Check if session is expired
    if (session.expiresAt && Date.now() > session.expiresAt) {
      await signOutGoogle();
      return null;
    }
    
    return session.user;
  } catch (error) {
    console.error('Error checking session:', error);
    return null;
  }
}

/**
 * Refresh Google tokens if needed
 */
export async function refreshGoogleTokens(): Promise<boolean> {
  try {
    // This would typically use the refresh token to get new tokens
    // For now, return false to indicate re-authentication is needed
    return false;
  } catch (error) {
    console.error('Error refreshing tokens:', error);
    return false;
  }
}
