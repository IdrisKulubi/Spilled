/**
 * OAuth Redirect Handler
 * This screen handles the OAuth redirect from Supabase authentication
 */

import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

export default function RedirectScreen() {
  const router = useRouter();

  useEffect(() => {
    // Complete the auth session
    WebBrowser.maybeCompleteAuthSession();
    
    // Navigate back to the main app
    // Give a small delay to ensure the auth session is processed
    const timer = setTimeout(() => {
      router.replace('/');
    }, 1000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#FFF8F9'
    }}>
      <ActivityIndicator size="large" color="#E91E63" />
      <Text style={{
        marginTop: 16,
        fontSize: 16,
        color: '#666',
        textAlign: 'center'
      }}>
        Completing sign in...
      </Text>
    </View>
  );
}