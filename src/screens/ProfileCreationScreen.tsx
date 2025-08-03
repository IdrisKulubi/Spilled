/**
 * Profile Creation Screen
 * Ensures user profile is created in database before proceeding to verification
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { TeaKEStyles } from "../constants/Styles";
import { Colors } from "../../constants/Colors";
import { useAuth } from "../contexts/AuthContext";

export const ProfileCreationScreen: React.FC = () => {
  const { user, profileLoading, ensureProfileExists } = useAuth();
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const createProfile = useCallback(async () => {
    setError(null);
    setAttempts((prev) => prev + 1);

    const success = await ensureProfileExists();
    if (!success) {
      setError("Failed to create your profile. Please try again.");
    }
  }, [ensureProfileExists]);

  useEffect(() => {
    createProfile();
  }, [createProfile]);

  return (
    <SafeAreaView style={TeaKEStyles.safeContainer}>
      <View style={styles.container}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>Spilled</Text>
            <Text style={styles.logoEmoji}>☕️</Text>
          </View>

          <Text style={styles.tagline}>Almost there! ✨</Text>

          <Text style={styles.subtitle}>
            We&apos;re setting up your profile so you can start spilling the tea
          </Text>
        </View>

        {/* Status Section */}
        <View style={styles.statusSection}>
          {profileLoading ? (
            <View style={styles.statusCard}>
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.light.primary} />
                <Text style={styles.statusTitle}>
                  Creating your profile... 🎀
                </Text>
                <Text style={styles.statusDescription}>
                  This might take a moment while we get everything ready
                </Text>
                {attempts > 1 && (
                  <Text style={styles.attemptText}>
                    Attempt {attempts}/3 - Hang tight! 💪
                  </Text>
                )}
              </View>
            </View>
          ) : error ? (
            <View style={styles.statusCard}>
              <View style={styles.errorContainer}>
                <Text style={styles.errorEmoji}>😅</Text>
                <Text style={styles.statusTitle}>
                  Oops! Something went wrong
                </Text>
                <Text style={styles.statusDescription}>
                  {error} Don&apos;t worry, we&apos;ll get this sorted!
                </Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={createProfile}
                  activeOpacity={0.8}
                >
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.statusCard}>
              <View style={styles.successContainer}>
                <Text style={styles.successEmoji}>🎉</Text>
                <Text style={styles.statusTitle}>
                  Welcome to the sisterhood!
                </Text>
                <Text style={styles.statusDescription}>
                  Hey {user?.nickname || "gorgeous"}! Your profile is all set up
                  and ready to go ✨
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>🔒 Your privacy matters</Text>
            <Text style={styles.infoText}>
              Your profile is securely stored and will only be used for
              verification. We&apos;ve got your back!
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = {
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
    justifyContent: "center" as const,
  },

  headerSection: {
    alignItems: "center" as const,
    marginBottom: 50,
  },

  logoContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: 16,
  },

  logoText: {
    fontSize: 36,
    fontWeight: "bold" as const,
    color: Colors.light.primary,
    marginRight: 8,
  },

  logoEmoji: {
    fontSize: 32,
  },

  tagline: {
    fontSize: 24,
    fontWeight: "600" as const,
    color: Colors.light.text,
    textAlign: "center" as const,
    marginBottom: 12,
  },

  subtitle: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: "center" as const,
    lineHeight: 24,
    paddingHorizontal: 20,
  },

  statusSection: {
    marginBottom: 40,
  },

  statusCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 20,
    padding: 32,
    shadowColor: Colors.light.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },

  loadingContainer: {
    alignItems: "center" as const,
  },

  errorContainer: {
    alignItems: "center" as const,
  },

  successContainer: {
    alignItems: "center" as const,
  },

  statusTitle: {
    fontSize: 20,
    fontWeight: "600" as const,
    color: Colors.light.text,
    textAlign: "center" as const,
    marginTop: 16,
    marginBottom: 12,
  },

  statusDescription: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: "center" as const,
    lineHeight: 24,
    marginBottom: 8,
  },

  attemptText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "center" as const,
    fontStyle: "italic" as const,
    marginTop: 8,
  },

  errorEmoji: {
    fontSize: 48,
  },

  successEmoji: {
    fontSize: 48,
  },

  retryButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginTop: 20,
    shadowColor: Colors.light.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  retryButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.light.textOnPrimary,
    textAlign: "center" as const,
  },

  infoSection: {
    alignItems: "center" as const,
  },

  infoCard: {
    backgroundColor: Colors.light.accent,
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.primary,
    maxWidth: 320,
  },

  infoTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: "center" as const,
  },

  infoText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
    textAlign: "center" as const,
  },
};
