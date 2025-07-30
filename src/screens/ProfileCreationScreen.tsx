/**
 * Profile Creation Screen
 * Ensures user profile is created in database before proceeding to verification
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { TeaKEStyles } from '@/src/constants/Styles';
import { TeaKEButton, TeaKECard } from '@/src/components/ui';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/src/contexts/AuthContext';

export const ProfileCreationScreen: React.FC = () => {
  const { user, profileLoading, ensureProfileExists } = useAuth();
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createProfile();
  }, []);

  const createProfile = async () => {
    setError(null);
    setAttempts(prev => prev + 1);
    
    const success = await ensureProfileExists();
    if (!success) {
      setError('Failed to create your profile. Please try again.');
    }
  };

  return (
    <SafeAreaView style={[TeaKEStyles.safeContainer, styles.container]}>
      <View style={styles.content}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <MaterialIcons 
              name="account-circle" 
              size={64} 
              color={Colors.light.primary} 
            />
          </View>
          <Text style={[TeaKEStyles.h1, styles.title]}>
            Setting up your profile
          </Text>
          <Text style={[TeaKEStyles.body, styles.subtitle]}>
            We're creating your TeaKE profile...
          </Text>
        </View>

        {/* Status Card */}
        <TeaKECard style={styles.statusCard}>
          <View style={styles.statusContent}>
            {profileLoading ? (
              <>
                <ActivityIndicator size="large" color={Colors.light.primary} />
                <Text style={[TeaKEStyles.h3, styles.statusTitle]}>
                  Creating Profile...
                </Text>
                <Text style={[TeaKEStyles.body, styles.statusDescription]}>
                  This may take a few moments
                </Text>
                {attempts > 1 && (
                  <Text style={[TeaKEStyles.caption, styles.attemptText]}>
                    Attempt {attempts}/3
                  </Text>
                )}
              </>
            ) : error ? (
              <>
                <MaterialIcons name="error" size={48} color={Colors.light.warning} />
                <Text style={[TeaKEStyles.h3, styles.errorTitle]}>
                  Profile Setup Failed
                </Text>
                <Text style={[TeaKEStyles.body, styles.errorDescription]}>
                  {error}
                </Text>
                <TeaKEButton
                  title="Try Again"
                  onPress={createProfile}
                  style={styles.retryButton}
                />
              </>
            ) : (
              <>
                <MaterialIcons name="check-circle" size={48} color={Colors.light.success} />
                <Text style={[TeaKEStyles.h3, styles.successTitle]}>
                  Profile Created!
                </Text>
                <Text style={[TeaKEStyles.body, styles.successDescription]}>
                  Welcome to TeaKE, {user?.nickname || 'friend'}!
                </Text>
              </>
            )}
          </View>
        </TeaKECard>

        {/* Info */}
        <View style={styles.infoContainer}>
          <MaterialIcons name="info" size={16} color={Colors.light.secondary} />
          <Text style={[TeaKEStyles.caption, styles.infoText]}>
            Your profile is securely stored and will be used for verification
          </Text>
        </View>

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.light.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    color: Colors.light.secondary,
  },
  statusCard: {
    marginBottom: 24,
  },
  statusContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  statusTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  statusDescription: {
    textAlign: 'center',
    color: Colors.light.secondary,
    marginBottom: 8,
  },
  attemptText: {
    color: Colors.light.secondary,
    fontStyle: 'italic',
  },
  errorTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
    color: Colors.light.warning,
  },
  errorDescription: {
    textAlign: 'center',
    color: Colors.light.secondary,
    marginBottom: 16,
  },
  retryButton: {
    minWidth: 120,
  },
  successTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
    color: Colors.light.success,
  },
  successDescription: {
    textAlign: 'center',
    color: Colors.light.secondary,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  infoText: {
    marginLeft: 8,
    color: Colors.light.secondary,
    textAlign: 'center',
    flex: 1,
  },
});