/**
 * Secure App Wrapper
 * Handles app initialization, credential setup, and secure configuration
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import AppInitializer from './AppInitializer';
import CredentialsSetupScreen from '../screens/CredentialsSetupScreen';
import { secureConfig } from '../config/secureConfig';

interface SecureAppWrapperProps {
  children: React.ReactNode;
}

export const SecureAppWrapper: React.FC<SecureAppWrapperProps> = ({ children }) => {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    checkConfiguration();
  }, []);

  const checkConfiguration = async () => {
    try {
      const configured = await secureConfig.isConfigured();
      setIsConfigured(configured);
      
      if (!configured) {
        setShowSetup(true);
      }
    } catch (error) {
      console.error('[SecureAppWrapper] Failed to check configuration:', error);
      setIsConfigured(false);
      setShowSetup(true);
    }
  };

  const handleSetupComplete = () => {
    setShowSetup(false);
    setIsConfigured(true);
  };

  const handleInitializationError = (error: string) => {
    console.error('[SecureAppWrapper] Initialization error:', error);
    // If initialization fails due to credentials, show setup screen
    if (error.includes('credentials') || error.includes('configuration')) {
      setShowSetup(true);
      setIsConfigured(false);
    }
  };

  // Show loading state while checking configuration
  if (isConfigured === null) {
    return <View style={styles.container} />;
  }

  // Show credentials setup if not configured
  if (showSetup || !isConfigured) {
    return (
      <View style={styles.container}>
        <CredentialsSetupScreen onComplete={handleSetupComplete} />
      </View>
    );
  }

  // Show app with initialization wrapper
  return (
    <AppInitializer onError={handleInitializationError}>
      {children}
    </AppInitializer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});

export default SecureAppWrapper;