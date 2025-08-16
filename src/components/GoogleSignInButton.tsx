/**
 * Google Sign-In Button Component
 * Uses expo-auth-session for proper OAuth flow
 */

import React, { useEffect, useState } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { UserRepository } from '../repositories/UserRepository';
import { isUserAdmin } from '../config/admin';
import { v4 as uuidv4 } from 'react-native-uuid';

// Ensure web browser sessions complete properly
WebBrowser.maybeCompleteAuthSession();

interface GoogleSignInButtonProps {
  onSuccess?: (user: any) => void;
  onError?: (error: string) => void;
  buttonText?: string;
  isSignUp?: boolean;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError,
  buttonText = 'Continue with Google',
  isSignUp = false,
}) => {
  const [loading, setLoading] = useState(false);
  const userRepository = new UserRepository();

  // Use the Google Auth Request hook
  const [request, response, promptAsync] = Google.useAuthRequest({
    // Use web client ID for development/web
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    // Add Android and iOS client IDs when available
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
  });

  // Handle the authentication response
  useEffect(() => {
    if (response?.type === 'success') {
      handleAuthResponse(response.authentication);
    } else if (response?.type === 'error') {
      setLoading(false);
      const errorMessage = response.error?.message || 'Google sign-in failed';
      console.error('Google Auth Error:', response.error);
      
      if (onError) {
        onError(errorMessage);
      } else {
        Alert.alert(
          'Oops! Something went wrong',
          errorMessage
        );
      }
    }
  }, [response]);

  const handleAuthResponse = async (authentication: any) => {
    if (!authentication?.accessToken) {
      setLoading(false);
      const error = 'No access token received from Google';
      if (onError) {
        onError(error);
      } else {
        Alert.alert('Error', error);
      }
      return;
    }

    try {
      // Fetch user info from Google
      const userInfoResponse = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${authentication.accessToken}`,
          },
        }
      );

      if (!userInfoResponse.ok) {
        throw new Error('Failed to fetch user information from Google');
      }

      const googleUser = await userInfoResponse.json();
      console.log('Google User Info:', googleUser);

      // Generate a unique ID for the user if not provided
      const userId = googleUser.id || uuidv4();

      // Store tokens securely
      await SecureStore.setItemAsync('google_access_token', authentication.accessToken);
      if (authentication.idToken) {
        await SecureStore.setItemAsync('google_id_token', authentication.idToken);
      }

      // Create or update user in database
      let dbUser;
      try {
        // Check if user exists
        dbUser = await userRepository.findById(userId);
        
        if (!dbUser) {
          // Create new user
          dbUser = await userRepository.create({
            id: userId,
            email: googleUser.email || null,
            nickname: googleUser.name || googleUser.email?.split('@')[0] || 'User',
            phone: null,
            verified: googleUser.verified_email || false,
            verificationStatus: 'pending',
            createdAt: new Date(),
          });
          
          console.log('Created new user:', dbUser);
        } else {
          console.log('User already exists:', dbUser);
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
        // Try to create user with a different approach
        try {
          dbUser = {
            id: userId,
            email: googleUser.email || null,
            nickname: googleUser.name || googleUser.email?.split('@')[0] || 'User',
            phone: null,
            verified: googleUser.verified_email || false,
            verificationStatus: 'pending',
            createdAt: new Date(),
          };
          
          // Store user session locally
          await SecureStore.setItemAsync('user_session', JSON.stringify({
            user: dbUser,
            expiresAt: Date.now() + 3600000, // 1 hour
          }));
        } catch (fallbackError) {
          console.error('Fallback error:', fallbackError);
          throw new Error('Failed to create user profile');
        }
      }

      // Check if user is admin
      const isAdmin = googleUser.email && isUserAdmin(googleUser.email);

      // Store admin status if applicable
      if (isAdmin) {
        await SecureStore.setItemAsync('is_admin', 'true');
      }

      setLoading(false);

      // Call success callback
      if (onSuccess) {
        onSuccess(dbUser);
      }

      // Show appropriate message
      if (isSignUp) {
        Alert.alert(
          "Welcome to Spilled! 🎉",
          "Your account has been created successfully. Please upload your ID for verification to start posting and messaging.",
          [{ text: "Let's go!" }]
        );
      }
    } catch (error) {
      setLoading(false);
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete sign-in';
      console.error('Sign-in error:', error);
      
      if (onError) {
        onError(errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }
    }
  };

  const handlePress = async () => {
    if (!request) {
      Alert.alert(
        'Configuration Error',
        'Google OAuth is not properly configured. Please check your environment variables.'
      );
      return;
    }

    setLoading(true);
    try {
      await promptAsync();
    } catch (error) {
      setLoading(false);
      console.error('Error prompting Google auth:', error);
      Alert.alert('Error', 'Failed to open Google sign-in');
    }
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handlePress}
      disabled={loading || !request}
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
