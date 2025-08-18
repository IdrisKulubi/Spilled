import React, { useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  Alert,
  ScrollView,
} from "react-native";
import { TeaKEStyles } from "../constants/Styles";
import { Colors } from "../../constants/Colors";
import { BetterAuthGoogleButton } from "../components/BetterAuthGoogleButton";

export const SignUpScreen: React.FC = () => {

  const handleGoogleSignUpSuccess = (user: any) => {
    console.log('Sign-up successful:', user);
    // The welcome message is shown by the GoogleSignInButton component
    // Navigation will be handled by the auth context or manually navigate
    // navigation.navigate('Verification');
  };

  const handleGoogleSignUpError = (error: string) => {
    Alert.alert(
      "Oops! Something went wrong",
      error
    );
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
            <Text style={styles.logoText}>TeaKE</Text>
            <Text style={styles.logoEmoji}>☕️</Text>
          </View>

          <Text style={styles.tagline}>&quot;Is he seeing others?&quot; 👀</Text>

          <Text style={styles.subtitle}>
            The safe space where Kenyan women spill the tea about dating 🫖✨
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
          <BetterAuthGoogleButton
            buttonText="Join the sisterhood"
            onSuccess={handleGoogleSignUpSuccess}
            onError={handleGoogleSignUpError}
            isSignUp={true}
            callbackURL="dashboard"
          />

          <Text style={styles.ctaSubtext}>
            Free to join • Safe & anonymous • Girls only 💕
          </Text>
        </View>

        {/* Safety Info */}
        <View style={styles.safetySection}>
          <View style={styles.safetyCard}>
            <Text style={styles.safetyTitle}>🆔 Quick verification needed</Text>
            <Text style={styles.safetyText}>
              Upload your school or national ID after signing up. We verify
              you&apos;re a woman to keep our community safe and authentic.
            </Text>
          </View>

          <Text style={styles.legalText}>
            By joining, you agree to our Terms & Privacy Policy. We use Google
            for secure sign-in only.
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
