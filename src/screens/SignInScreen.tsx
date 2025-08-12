import React, { useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TeaKEStyles } from "../constants/Styles";
import { Colors } from "../../constants/Colors";
import { useAuth } from "../contexts/AuthContext";

export const SignInScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle } = useAuth();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithGoogle();

      if (result.success) {
        // Navigation will be handled by AuthContext state change
      } else {
        Alert.alert(
          "Oops! Something went wrong ",
          result.error || "Failed to sign in with Google"
        );
      }
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      Alert.alert("Error", "Failed to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={TeaKEStyles.safeContainer}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>Spilled</Text>
            <Text style={styles.logoEmoji}>☕️</Text>
          </View>

          <Text style={styles.tagline}>Welcome back, sis! 👋</Text>

          <Text style={styles.subtitle}>
            Ready to catch up on the latest tea? Let&apos;s get you signed in ✨
          </Text>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <View style={styles.featureItem}>
            <Text style={styles.featureEmoji}>🔍</Text>
            <Text style={styles.featureText}>
              Search guys by name or socials
            </Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureEmoji}>📝</Text>
            <Text style={styles.featureText}>
              Share your dating experiences anonymously
            </Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureEmoji}>💬</Text>
            <Text style={styles.featureText}>
              Connect with other women privately
            </Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureEmoji}>🛡️</Text>
            <Text style={styles.featureText}>
              ID verified community - girls only!
            </Text>
          </View>
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator
                color={Colors.light.textOnPrimary}
                size="small"
              />
            ) : (
              <>
                <Ionicons name="logo-google" size={24} color="#FFFFFF" />
                <Text style={styles.googleButtonText}>
                  Continue with Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.ctaSubtext}>
            Secure sign-in • Your data is safe • Girls only 💕
          </Text>
        </View>

        {/* Safety Info */}
        <View style={styles.safetySection}>
          <View style={styles.safetyCard}>
            <Text style={styles.safetyTitle}>🆔 Already verified?</Text>
            <Text style={styles.safetyText}>
              If you&apos;re already part of our community, just sign in and you&apos;re
              good to go! New here? You&apos;ll need to verify your ID after signing
              in.
            </Text>
          </View>

          <Text style={styles.legalText}>
            By signing in, you agree to our Terms & Privacy Policy. We use
            Google for secure authentication only.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = {
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
  },

  headerSection: {
    alignItems: "center" as const,
    marginBottom: 40,
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
    fontSize: 20,
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

  featuresSection: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
    shadowColor: Colors.light.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },

  featureItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: 16,
  },

  featureEmoji: {
    fontSize: 24,
    marginRight: 16,
    width: 32,
  },

  featureText: {
    fontSize: 16,
    color: Colors.light.text,
    flex: 1,
    lineHeight: 22,
  },

  ctaSection: {
    alignItems: "center" as const,
    marginBottom: 32,
  },

  googleButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
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

  googleButtonText: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.light.textOnPrimary,
    marginLeft: 12,
  },

  ctaSubtext: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "center" as const,
    marginTop: 16,
    fontStyle: "italic" as const,
  },

  safetySection: {
    alignItems: "center" as const,
  },

  safetyCard: {
    backgroundColor: Colors.light.accent,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.primary,
  },

  safetyTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.light.text,
    marginBottom: 8,
  },

  safetyText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },

  legalText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: "center" as const,
    lineHeight: 18,
    paddingHorizontal: 20,
  },
};
