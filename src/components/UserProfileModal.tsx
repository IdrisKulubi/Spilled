/**
 * User Profile Modal - Shows user profile with messaging option
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { TeaKEStyles, Spacing } from '@/src/constants/Styles';
import { TeaKEButton, TeaKECard } from '@/src/components/ui';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';

interface UserProfileModalProps {
  visible: boolean;
  userId: string;
  nickname?: string;
  isAnonymous?: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  visible,
  userId,
  nickname,
  isAnonymous = false,
  onClose
}) => {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const displayName = isAnonymous ? 'Anonymous Sister' : (nickname || 'A Sister');
  const canMessage = !isAnonymous && userId !== user?.id;

  const handleSendMessage = () => {
    if (!canMessage) {
      Alert.alert(
        'Cannot Send Message',
        isAnonymous 
          ? 'Cannot message anonymous users for privacy protection.'
          : 'Cannot message yourself.'
      );
      return;
    }

    onClose();
    // Navigate to chat screen with the user ID
    router.push({
      pathname: '/chat',
      params: { userId, nickname: displayName }
    });
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={[TeaKEStyles.safeContainer, styles.container]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={handleClose}
          >
            <MaterialIcons name="close" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Profile Content */}
        <View style={styles.content}>
          <TeaKECard style={styles.profileCard}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <MaterialIcons 
                  name={isAnonymous ? "visibility-off" : "person"} 
                  size={48} 
                  color={Colors.light.primary} 
                />
              </View>
            </View>

            {/* User Info */}
            <View style={styles.userInfo}>
              <Text style={styles.displayName}>{displayName}</Text>
              {isAnonymous && (
                <Text style={styles.anonymousNote}>
                  This user chose to remain anonymous for privacy
                </Text>
              )}
              {!isAnonymous && (
                <Text style={styles.joinedText}>
                  TeaKE Community Member
                </Text>
              )}
            </View>

            {/* Actions */}
            <View style={styles.actionsContainer}>
              {canMessage ? (
                <TeaKEButton
                  title="Send Message"
                  onPress={handleSendMessage}
                  size="medium"
                  style={styles.messageButton}
                />
              ) : (
                <View style={styles.cannotMessageContainer}>
                  <MaterialIcons 
                    name="info-outline" 
                    size={20} 
                    color={Colors.light.textSecondary} 
                  />
                  <Text style={styles.cannotMessageText}>
                    {isAnonymous 
                      ? 'Anonymous users cannot receive messages'
                      : 'Cannot message yourself'
                    }
                  </Text>
                </View>
              )}
            </View>
          </TeaKECard>

          {/* Privacy Notice */}
          <TeaKECard style={styles.privacyCard}>
            <View style={styles.privacyHeader}>
              <MaterialIcons name="security" size={20} color={Colors.light.primary} />
              <Text style={styles.privacyTitle}>Privacy & Safety</Text>
            </View>
            <Text style={styles.privacyText}>
              • Messages are end-to-end encrypted{'\n'}
              • Messages auto-delete after 7 days{'\n'}
              • Only verified users can send messages{'\n'}
              • Report any inappropriate behavior
            </Text>
          </TeaKECard>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: Colors.light.cardBackground,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  avatarContainer: {
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  anonymousNote: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  joinedText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  actionsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  messageButton: {
    width: '80%',
  },
  cannotMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  cannotMessageText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginLeft: Spacing.xs,
    textAlign: 'center',
  },
  privacyCard: {
    backgroundColor: Colors.light.accent,
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginLeft: Spacing.xs,
  },
  privacyText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
});