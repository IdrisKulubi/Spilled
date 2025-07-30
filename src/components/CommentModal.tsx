/**
 * Comment Modal Component - TeaKE
 * Quick comment modal for adding support from the feed
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../constants/Styles';
import { TeaKECard, TeaKEButton } from './ui';
import { StoryFeedItem } from '../actions/fetchStoriesFeed';
import { addComment } from '../actions/fetchGuyProfile';

interface CommentModalProps {
  visible: boolean;
  story: StoryFeedItem | null;
  onClose: () => void;
  onCommentAdded: () => void;
}

export const CommentModal: React.FC<CommentModalProps> = ({
  visible,
  story,
  onClose,
  onCommentAdded
}) => {
  const { user } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [anonymous, setAnonymous] = useState(true);
  const [nickname, setNickname] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setCommentText('');
    setNickname('');
    setAnonymous(true);
    onClose();
  };

  const handleSubmit = async () => {
    if (!commentText.trim()) {
      Alert.alert('Comment Required', 'Please enter a comment.');
      return;
    }

    if (!user) {
      Alert.alert('Login Required', 'You must be logged in to comment.');
      return;
    }

    if (!anonymous && !nickname.trim()) {
      Alert.alert('Nickname Required', 'Please provide a nickname or comment anonymously.');
      return;
    }

    if (!story) return;

    setIsSubmitting(true);

    try {
      const response = await addComment(
        story.id,
        commentText.trim(),
        anonymous,
        anonymous ? undefined : nickname.trim()
      );

      if (response.success) {
        Alert.alert(
          'Support Sent! 💝',
          'Thank you for supporting this sister. Your comment has been posted.',
          [
            {
              text: 'OK',
              onPress: () => {
                handleClose();
                onCommentAdded();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to add comment.');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!story) return null;

  const getAuthorDisplay = (): string => {
    if (story.anonymous) return 'Anonymous Sister';
    return story.nickname || 'A Sister';
  };

  const getGuyDisplayInfo = (): string => {
    const parts: string[] = [];
    if (story.guy_name) {
      const nameParts = story.guy_name.trim().split(' ');
      if (nameParts.length > 1) {
        parts.push(`${nameParts[0]} ${nameParts[1].charAt(0)}.`);
      } else {
        parts.push(nameParts[0]);
      }
    }
    if (story.guy_phone) {
      const phone = story.guy_phone.replace(/\D/g, '');
      if (phone.length >= 4) {
        parts.push(`***${phone.slice(-4)}`);
      }
    }
    if (story.guy_socials) {
      parts.push(story.guy_socials);
    }
    return parts.length > 0 ? parts.join(' • ') : 'Someone';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Support</Text>
            <View style={styles.headerRight} />
          </View>

          {/* Story Preview */}
          <TeaKECard style={styles.storyPreview}>
            <View style={styles.storyHeader}>
              <Text style={styles.authorName}>{getAuthorDisplay()}</Text>
              <Text style={styles.aboutText}>about {getGuyDisplayInfo()}</Text>
            </View>
            <Text style={styles.storyText} numberOfLines={3}>
              {story.text}
            </Text>
          </TeaKECard>

          {/* Comment Input */}
          <TeaKECard style={styles.commentCard}>
            <Text style={styles.inputLabel}>Your message of support:</Text>
            
            <TextInput
              style={styles.commentInput}
              placeholder="Share words of encouragement, advice, or your own experience..."
              value={commentText}
              onChangeText={setCommentText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
              autoFocus
            />

            <View style={styles.characterCount}>
              <Text style={styles.characterCountText}>
                {commentText.length}/500
              </Text>
            </View>

            {/* Privacy Options */}
            <View style={styles.privacyOptions}>
              <TouchableOpacity
                style={styles.anonymousToggle}
                onPress={() => setAnonymous(!anonymous)}
              >
                <MaterialIcons
                  name={anonymous ? 'check-box' : 'check-box-outline-blank'}
                  size={20}
                  color={Colors.light.primary}
                />
                <Text style={styles.anonymousText}>Post anonymously</Text>
              </TouchableOpacity>

              {!anonymous && (
                <TextInput
                  style={styles.nicknameInput}
                  placeholder="Your display name"
                  value={nickname}
                  onChangeText={setNickname}
                  maxLength={50}
                />
              )}
            </View>

            {/* Submit Button */}
            <TeaKEButton
              title={isSubmitting ? 'Sending...' : 'Send Support 💝'}
              onPress={handleSubmit}
              disabled={isSubmitting || !commentText.trim()}
            />
          </TeaKECard>

          {/* Encouragement Message */}
          <View style={styles.encouragementSection}>
            <MaterialIcons name="favorite" size={20} color={Colors.light.primary} />
            <Text style={styles.encouragementText}>
              Your support can make a real difference in someone's life. Thank you for being part of this caring community.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  cancelButton: {
    padding: Spacing.xs,
  },
  cancelText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  headerRight: {
    width: 60, // Balance the cancel button
  },
  storyPreview: {
    margin: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.light.accent,
  },
  storyHeader: {
    marginBottom: Spacing.xs,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  aboutText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  storyText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.text,
    fontStyle: 'italic',
  },
  commentCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.light.text,
    backgroundColor: Colors.light.cardBackground,
    marginBottom: Spacing.xs,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
  },
  characterCountText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  privacyOptions: {
    marginBottom: Spacing.md,
  },
  anonymousToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  anonymousText: {
    fontSize: 14,
    color: Colors.light.text,
    marginLeft: Spacing.xs,
  },
  nicknameInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    padding: Spacing.sm,
    fontSize: 14,
    color: Colors.light.text,
    backgroundColor: Colors.light.cardBackground,
  },
  encouragementSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.light.accent,
    marginHorizontal: Spacing.md,
    borderRadius: 12,
  },
  encouragementText: {
    fontSize: 13,
    color: Colors.light.text,
    marginLeft: Spacing.sm,
    flex: 1,
    lineHeight: 18,
  },
});