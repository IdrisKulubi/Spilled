import React, { useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TeaKEStyles } from "../constants/Styles";
import { Colors } from "../../constants/Colors";
import { useAuth } from "../contexts/AuthContext";

export const SignInScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [debugVisible, setDebugVisible] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const { signInWithGoogle } = useAuth();

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

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

  const handleDebugSignIn = async () => {
    setDebugLogs([]);
    setDebugVisible(true);
    setLoading(true);
    
    try {
      addDebugLog("🚀 Starting debug OAuth flow...");
      
      // Import auth utils directly for debugging
      const { authUtils } = await import('../utils/auth');
      
      // Override console.log temporarily to capture logs
      const originalLog = console.log;
      const originalError = console.error;
      
      console.log = (...args) => {
        addDebugLog(`LOG: ${args.join(' ')}`);
        originalLog(...args);
      };
      
      console.error = (...args) => {
        addDebugLog(`ERROR: ${args.join(' ')}`);
        originalError(...args);
      };
      
      const result = await authUtils.signInWithGoogle();
      
      // Restore console
      console.log = originalLog;
      console.error = originalError;
      
      addDebugLog(`✅ OAuth result: ${JSON.stringify(result, null, 2)}`);
      
      if (result.success) {
        addDebugLog("🎉 OAuth successful!");
      } else {
        addDebugLog(`❌ OAuth failed: ${result.error}`);
      }
    } catch (error) {
      addDebugLog(`💥 OAuth crashed: ${error}`);
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

          {/* Debug Button - Only show in development or for testing */}
          <TouchableOpacity
            style={styles.debugButton}
            onPress={handleDebugSignIn}
            disabled={loading}
          >
            <Text style={styles.debugButtonText}>🐛 Debug OAuth</Text>
          </TouchableOpacity>
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

      {/* Debug Modal */}
      <Modal
        visible={debugVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.debugModal}>
          <View style={styles.debugHeader}>
            <Text style={styles.debugTitle}>🐛 OAuth Debug Logs</Text>
            <TouchableOpacity
              style={styles.debugCloseButton}
              onPress={() => setDebugVisible(false)}
            >
              <Text style={styles.debugCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.debugContent}>
            {debugLogs.map((log, index) => (
              <Text key={index} style={styles.debugLogText}>
                {log}
              </Text>
            ))}
            {debugLogs.length === 0 && (
              <Text style={styles.debugEmptyText}>
                No logs yet. Tap "Debug OAuth" to start.
              </Text>
            )}
          </ScrollView>
          
          <View style={styles.debugActions}>
            <TouchableOpacity
              style={styles.debugClearButton}
              onPress={() => setDebugLogs([])}
            >
              <Text style={styles.debugClearText}>Clear Logs</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
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

  // Debug styles
  debugButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF5252',
  },

  debugButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    textAlign: 'center' as const,
  },

  debugModal: {
    flex: 1,
    backgroundColor: '#000000',
  },

  debugHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },

  debugTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
  },

  debugCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333333',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },

  debugCloseText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold' as const,
  },

  debugContent: {
    flex: 1,
    padding: 16,
  },

  debugLogText: {
    fontSize: 12,
    color: '#00FF00',
    fontFamily: 'monospace',
    marginBottom: 4,
    lineHeight: 16,
  },

  debugEmptyText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center' as const,
    marginTop: 50,
  },

  debugActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },

  debugClearButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#333333',
    borderRadius: 8,
    alignItems: 'center' as const,
  },

  debugClearText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
};
