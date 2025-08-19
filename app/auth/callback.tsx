/**
 * OAuth Callback Handler
 * Handles the OAuth callback from Google and establishes the session
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { authClient } from '../../src/lib/auth-client';
import { useAuth } from '../../src/contexts/AuthContext';
import { Colors } from '../../constants/Colors';

export default function OAuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, refreshSession } = useAuth();
  const [statusMessage, setStatusMessage] = useState('Setting up your account...');
  
  useEffect(() => {
    handleOAuthCallback();
  }, []);

  const handleOAuthCallback = async () => {
    try {
      console.log('[Callback] OAuth Callback received with params:', params);
      setStatusMessage('Finalizing sign-in...');
      
      // Aggressively try to refresh the session
      let attempts = 0;
      const maxAttempts = 5;
      let refreshResult = null;

      while(attempts < maxAttempts) {
        attempts++;
        console.log(`[Callback] Refreshing session, attempt ${attempts}...`);
        refreshResult = await refreshSession();

        if (refreshResult.success && refreshResult.user) {
          console.log('[Callback] Session established on attempt:', attempts);
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      if (refreshResult!.success && refreshResult!.user) {
        console.log('[Callback] Session refreshed successfully:', refreshResult!.user);
        setStatusMessage('Success! Taking you to the app...');
        router.replace('/' as any);
      } else {
        throw new Error('Failed to establish session after multiple attempts.');
      }
    } catch (error) {
      console.error('[Callback] OAuth callback error:', error);
      setStatusMessage('Something went wrong. Please try signing in again.');
      await new Promise(resolve => setTimeout(resolve, 3000));
      router.replace('/' as any);
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.light.primary} />
      <Text style={styles.text}>Welcome to Spilled!</Text>
      <Text style={styles.subtext}>{statusMessage}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  text: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  subtext: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
});
