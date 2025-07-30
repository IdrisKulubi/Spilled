/**
 * Add Comment Modal - TeaKE
 * Standalone modal for adding comments to stories
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
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../constants/Styles';
import { StoryFeedItem } from '../actions/fetchStoriesFeed';
import { addComment } from '../actions/fetchGuyProfile';

interface AddCommentModalProps {
  visible: boolean;
  story: StoryFeedItem | null;
  onClose: () => void;
  onCommentAdded: () => void;
}

export const AddCommentModal: React.FC<AddCommentModalProps> = ({
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

    if (!user || !story) return;

    if (!anonymous && !nickname.trim()) {
      Alert.alert('Nickname Required', 'Please provide a nickname or comment anonymously.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await addComment(
        story.id,
        commentText.trim(),
        anonymous,
        anonymous ? undefined : nickname.trim()
      );

      if (response.success && response.commentId) {
        Alert.alert('Support Sent! 💝', 'Thank you for supporting this sister.');
        onCommentAdded();
        handleClose();
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={handleClose}>
                <Text style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.title}>Add Comment</Text>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!commentText.trim() || isSubmitting}
                style={[
                  styles.submitButton,
                  { opacity: !commentText.trim() || isSubmitting ? 0.5 : 1 }
                ]}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? 'Posting...' : 'Post'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Story Context */}
              <View style={styles.storyContext}>
                <Text style={styles.storyContextLabel}>Commenting on:</Text>
                <Text style={styles.storyContextText} numberOfLines={2}>
                  {story.text}
                </Text>
              </View>

              {/* Comment Input */}
              <View style={styles.inputSection}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Share your support and advice..."
                  placeholderTextColor={Colors.light.textSecondary}
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  maxLength={500}
                  textAlignVertical="top"
                />
                <Text style={styles.characterCount}>
                  {commentText.length}/500
                </Text>
              </View>

              {/* Privacy Options */}
              <View style={styles.privacySection}>
                <Text style={styles.privacySectionTitle}>Privacy</Text>
                
                <TouchableOpacity
                  style={styles.privacyOption}
                  onPress={() => setAnonymous(!anonymous)}
                >
                  <MaterialIcons
                    name={anonymous ? 'radio-button-checked' : 'radio-button-unchecked'}
                    size={20}
                    color={Colors.light.primary}
                  />
                  <View style={styles.privacyOptionText}>
                    <Text style={styles.privacyOptionTitle}>Comment Anonymously</Text>
                    <Text style={styles.privacyOptionDescription}>
                      Your comment will show as "Anonymous Sister"
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.privacyOption}
                  onPress={() => setAnonymous(false)}
                >
                  <MaterialIcons
                    name={!anonymous ? 'radio-button-checked' : 'radio-button-unchecked'}
                    size={20}
                    color={Colors.light.primary}
                  />
                  <View style={styles.privacyOptionText}>
                    <Text style={styles.privacyOptionTitle}>Use a Nickname</Text>
                    <Text style={styles.privacyOptionDescription}>
                      Choose a name to display with your comment
                    </Text>
                  </View>
                </TouchableOpacity>

                {!anonymous && (
                  <TextInput
                    style={styles.nicknameInput}
                    placeholder="Enter your nickname"
                    placeholderTextColor={Colors.light.textSecondary}
                    value={nickname}
                    onChangeText={setNickname}
                    maxLength={30}
                  />
                )}
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: Colors.light.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  cancelButton: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  submitButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.light.primary,
    borderRadius: 16,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  storyContext: {
    backgroundColor: Colors.light.accent,
    padding: Spacing.md,
    borderRadius: 12,
    marginVertical: Spacing.md,
  },
  storyContextLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  storyContextText: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
  },
  inputSection: {
    marginBottom: Spacing.lg,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.light.text,
    minHeight: 120,
    backgroundColor: Colors.light.background,
  },
  characterCount: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  privacySection: {
    marginBottom: Spacing.xl,
  },
  privacySectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  privacyOptionText: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  privacyOptionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 2,
  },
  privacyOptionDescription: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    lineHeight: 16,
  },
  nicknameInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    fontSize: 14,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
    marginTop: Spacing.xs,
    marginLeft: 28,
  },
});