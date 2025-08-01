/**
 * App Initializer Component
 * Handles secure configuration initialization and system setup
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { secureConfig } from '../config/secureConfig';
import { initializeSupabase } from '../config/supabase';
import { securityMonitor } from '../utils/securityMonitoring';
import { errorMonitor } from '../utils/errorMonitoring';
import { cacheManager } from '../utils/caching';

interface AppInitializerProps {
  children: React.ReactNode;
  onInitialized?: () => void;
  onError?: (error: string) => void;
}

export const AppInitializer: React.FC<AppInitializerProps> = ({
  children,
  onInitialized,
  onError
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initStep, setInitStep] = useState('Starting...');

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('[AppInitializer] Starting app initialization...');
      
      // Step 1: Initialize secure configuration
      setInitStep('Initializing secure configuration...');
      await secureConfig.initialize();
      console.log('[AppInitializer] ✅ Secure configuration initialized');

      // Step 2: Check if credentials are configured
      setInitStep('Checking credentials...');
      const isConfigured = await secureConfig.isConfigured();
      if (!isConfigured) {
        throw new Error('App credentials not configured. Please set up your Supabase credentials.');
      }
      console.log('[AppInitializer] ✅ Credentials verified');

      // Step 3: Initialize Supabase client
      setInitStep('Connecting to database...');
      await initializeSupabase();
      console.log('[AppInitializer] ✅ Supabase client initialized');

      // Step 4: Initialize monitoring systems
      setInitStep('Setting up monitoring...');
      
      // Initialize error monitoring
      errorMonitor.setOnlineStatus(true);
      console.log('[AppInitializer] ✅ Error monitoring initialized');

      // Step 5: Warm up cache if needed
      setInitStep('Preparing cache...');
      // Cache is automatically initialized when imported
      console.log('[AppInitializer] ✅ Cache system ready');

      // Step 6: Set up security monitoring
      setInitStep('Configuring security...');
      // Security monitor is automatically initialized when imported
      console.log('[AppInitializer] ✅ Security monitoring ready');

      setInitStep('Finalizing...');
      
      // Log successful initialization
      await errorMonitor.log(
        'info',
        'App initialization completed successfully',
        'app_lifecycle',
        {
          initialization_time: Date.now(),
          version: '1.0.0'
        }
      );

      console.log('[AppInitializer] 🎉 App initialization completed successfully');
      
      setIsInitialized(true);
      setIsLoading(false);
      onInitialized?.();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
      console.error('[AppInitializer] ❌ Initialization failed:', errorMessage);
      
      // Log initialization error
      try {
        await errorMonitor.reportError({
          error_type: 'crash',
          severity: 'critical',
          message: `App initialization failed: ${errorMessage}`,
          context: {
            initialization_step: initStep,
            timestamp: new Date().toISOString()
          },
          tags: ['initialization', 'startup', 'critical']
        });
      } catch (logError) {
        console.error('[AppInitializer] Failed to log initialization error:', logError);
      }

      setError(errorMessage);
      setIsLoading(false);
      onError?.(errorMessage);

      // Show user-friendly error
      Alert.alert(
        'Initialization Error',
        'The app failed to initialize properly. Please check your internet connection and try restarting the app.',
        [
          {
            text: 'Retry',
            onPress: () => {
              setError(null);
              setIsLoading(true);
              setInitStep('Retrying...');
              setTimeout(initializeApp, 1000);
            }
          }
        ]
      );
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.title}>Initializing TeaKE</Text>
          <Text style={styles.step}>{initStep}</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.errorTitle}>Initialization Failed</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Text style={styles.errorHint}>
            Please check your internet connection and try again.
          </Text>
        </View>
      </View>
    );
  }

  if (isInitialized) {
    return <>{children}</>;
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 24,
    marginBottom: 8,
  },
  step: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorHint: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default AppInitializer;