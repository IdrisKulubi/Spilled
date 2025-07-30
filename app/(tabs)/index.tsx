/**
 * Main Home Screen - Authentication-aware entry point
 * Shows different content based on user's auth and verification status
 */

import React from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  ScrollView,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { TeaKEStyles } from '@/src/constants/Styles';
import { TeaKEButton, TeaKECard } from '@/src/components/ui';
import { Colors } from '@/constants/Colors';

export default function HomeScreen() {
  const { user } = useAuth();

  // Note: All authentication and verification logic is now handled in TabLayout
  // This ensures tabs only show for fully verified users
  
  // If we reach this point, user should be logged in and verified
  if (!user) {
    console.log('[HomeScreen] No user - TabLayout should handle this');
    return null;
  }

  if (!user.verified) {
    console.log('[HomeScreen] User not verified - TabLayout should handle this');
    return null;
  }

  // Main authenticated home screen for verified users
  return <AuthenticatedHome user={user} />;
}

// Main dashboard for verified users
const AuthenticatedHome: React.FC<{ user: any }> = ({ user }) => {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <SafeAreaView style={TeaKEStyles.safeContainer}>
      <ScrollView style={TeaKEStyles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.welcomeText}>Welcome back!</Text>
            <Text style={[TeaKEStyles.body, { opacity: 0.8 }]}>
              {user.nickname || user.email}
            </Text>
          </View>
          <TouchableOpacity 
            onPress={handleSignOut}
            style={styles.signOutButton}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={[TeaKEStyles.heading2, { marginBottom: 16 }]}>
            What would you like to do?
          </Text>
          
          <TeaKECard style={styles.actionCard}>
            <Text style={styles.actionEmoji}>🔍</Text>
            <Text style={[TeaKEStyles.heading2, { fontSize: 18 }]}>
              Search for a Guy
            </Text>
            <Text style={[TeaKEStyles.body, { opacity: 0.8, marginBottom: 16 }]}>
              Look up someone you&apos;re dating or curious about
            </Text>
            <TeaKEButton 
              title="Start Search" 
              onPress={() => {
                // TODO: Navigate to search screen
                console.log('Navigate to search');
              }}
              size="small"
            />
          </TeaKECard>

          <TeaKECard style={styles.actionCard}>
            <Text style={styles.actionEmoji}>📝</Text>
            <Text style={[TeaKEStyles.heading2, { fontSize: 18 }]}>
              Share a Story
            </Text>
            <Text style={[TeaKEStyles.body, { opacity: 0.8, marginBottom: 16 }]}>
              Help other women by sharing your experience
            </Text>
            <TeaKEButton 
              title="Add Post" 
              onPress={() => {
                // TODO: Navigate to add post screen
                console.log('Navigate to add post');
              }}
              size="small"
              variant="secondary"
            />
          </TeaKECard>
        </View>

        {/* Recent Activity */}
        <View style={styles.recentSection}>
          <Text style={[TeaKEStyles.heading2, { marginBottom: 16 }]}>
            Recent Activity
          </Text>
          
          <TeaKECard>
            <Text style={[TeaKEStyles.body, { textAlign: 'center', opacity: 0.6 }]}>
              No recent activity yet.{'\n'}
              Start by searching for someone or sharing a story.
            </Text>
          </TeaKECard>
        </View>

        {/* Safety Reminder */}
        <TeaKECard style={StyleSheet.flatten([styles.safetyCard, { marginBottom: 32 }])}>
          <Text style={styles.safetyEmoji}>🛡️</Text>
          <Text style={[TeaKEStyles.body, { fontSize: 14, textAlign: 'center' }]}>
            <Text style={{ fontWeight: '600' }}>Stay Safe:</Text> Remember to verify information independently. 
            Use TeaKE as a starting point, not the final word.
          </Text>
        </TeaKECard>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 16,
    marginBottom: 32,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  signOutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.light.accent,
  },
  signOutText: {
    fontSize: 14,
    color: Colors.light.primary,
    fontWeight: '600',
  },
  quickActionsContainer: {
    marginBottom: 32,
  },
  actionCard: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 24,
  },
  actionEmoji: {
    fontSize: 32,
    marginBottom: 12,
  },
  recentSection: {
    marginBottom: 32,
  },
  safetyCard: {
    alignItems: 'center',
    backgroundColor: Colors.light.accent,
    borderColor: Colors.light.primary,
    borderWidth: 1,
    paddingVertical: 20,
  },
  safetyEmoji: {
    fontSize: 24,
    marginBottom: 12,
  },
});
