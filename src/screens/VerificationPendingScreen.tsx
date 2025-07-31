/**
 * Verification Pending Screen
 * Shown when user has uploaded ID and is waiting for approval
 */

import React from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { TeaKEStyles } from '@/src/constants/Styles';
import {  TeaKECard } from '@/src/components/ui';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/src/contexts/AuthContext';

interface VerificationPendingScreenProps {
  user: {
    nickname: string;
    verification_status: string;
    id_image_url?: string;
    id_type?: string;
  };
}

export const VerificationPendingScreen: React.FC<VerificationPendingScreenProps> = ({ user }) => {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <SafeAreaView style={[TeaKEStyles.safeContainer, styles.container]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="pending" size={64} color={Colors.light.primary} />
          </View>
          <Text style={styles.title}>
            Verification Pending
          </Text>
          <Text style={styles.subtitle}>
            Hi {user.nickname}! Your ID is being reviewed
          </Text>
        </View>

        {/* Status Card */}
        <TeaKECard style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <MaterialIcons name="upload-file" size={24} color={Colors.light.primary} />
            <Text style={styles.statusTitle}>
              ID Submitted Successfully
            </Text>
          </View>
          
          <Text style={styles.statusDescription}>
            Your {user.id_type === 'school_id' ? 'School ID' : 'National ID'} has been submitted and is currently being reviewed by our team.
          </Text>

          <View style={styles.timelineContainer}>
            <View style={[styles.timelineItem, styles.completed]}>
              <View style={[styles.timelineDot, styles.completedDot]} />
              <Text style={styles.timelineText}>ID Uploaded</Text>
            </View>
            
            <View style={[styles.timelineItem, styles.current]}>
              <View style={[styles.timelineDot, styles.currentDot]} />
              <Text style={styles.timelineText}>Under Review</Text>
            </View>
            
            <View style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <Text style={styles.timelineText}>Verification Complete</Text>
            </View>
          </View>

          <View style={styles.estimateContainer}>
            <MaterialIcons name="access-time" size={16} color={Colors.light.textSecondary} />
            <Text style={styles.estimateText}>
              Estimated review time: 10 minutes 
            </Text>
          </View>
        </TeaKECard>

        {/* Info Card */}
        <TeaKECard style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            What happens next?
          </Text>
          
          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <MaterialIcons name="check-circle" size={16} color={Colors.light.success} />
              <Text style={styles.infoText}>
                Our team will verify your identity
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <MaterialIcons name="notifications" size={16} color={Colors.light.success} />
              <Text style={styles.infoText}>
                You&apos;ll receive a notification when approved
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <MaterialIcons name="chat" size={16} color={Colors.light.success} />
              <Text style={styles.infoText}>
                Once verified, you can start posting and chatting
              </Text>
            </View>
          </View>
        </TeaKECard>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 32,
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
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  subtitle: {
    textAlign: 'center',
    color: Colors.light.textSecondary,
    fontSize: 16,
  },
  statusCard: {
    marginBottom: 24,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    marginLeft: 12,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  statusDescription: {
    marginBottom: 24,
    lineHeight: 22,
  },
  timelineContainer: {
    marginBottom: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.light.border,
    marginRight: 12,
  },
  completedDot: {
    backgroundColor: Colors.light.success,
  },
  currentDot: {
    backgroundColor: Colors.light.primary,
  },
  timelineText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  completed: {},
  current: {},
  estimateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.accent,
    padding: 12,
    borderRadius: 8,
  },
  estimateText: {
    marginLeft: 8,
    color: Colors.light.textSecondary,
    fontSize: 12,
  },
  infoCard: {
    marginBottom: 32,
  },
  infoTitle: {
    marginBottom: 16,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  infoList: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    marginLeft: 12,
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
  },
  actions: {
    alignItems: 'center',
  },
  signOutButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  signOutText: {
    color: Colors.light.textSecondary,
    fontSize: 16,
  },
});