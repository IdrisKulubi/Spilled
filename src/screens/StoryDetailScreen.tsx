/**
 * Story Detail Screen - TeaKE
 * Shows full story details with all comments and reactions
 * Allows users to add comments and support each other
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import { TeaKEStyles, Spacing } from '../constants/Styles';
import { TeaKECard, TeaKEButton, StatusTag } from '../components/ui';
import { StoryFeedItem, StoryComment } from '../actions/fetchStoriesFeed';
import { addComment } from '../actions/fetchGuyProfile';

interface StoryDetailScreenProps {
  story: StoryFeedItem;
  onBack: () => void;
  onReaction: (storyId: string, reactionType: any) => Promise<void>;
}

export const StoryDetailScreen: React.FC<StoryDetailScreenProps> = ({
  story,
  onBack,
  onReaction
}) => {
  const { user } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [comments, setComments] = useState<StoryComment[]>(story.comments);
  const [anonymous, setAnonymous] = useState(true);
  const [nickname, setNickname] = useState('');

  // Format time ago
  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const commentDate = new Date(dateString);
    const diffMs = now.getTime() - commentDate.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return commentDate.toLocaleDateString();
  };

  // Get guy display info
  const getGuyDisplayInfo = (): string => {
    const parts: string[] = [];
    if (story.guy_name) parts.push(story.guy_name);
    if (story.guy_phone) parts.push(story.guy_phone);
    if (story.guy_socials) parts.push(story.guy_socials);
    return parts.join(' • ') || 'Someone';
  };

  // Get author display
  const getAuthorDisplay = (): string => {
    if (story.anonymous) return 'Anonymous Sister';
    return story.nickname || 'A Sister';
  };

  // Handle comment submission
  const handleSubmitComment = async () => {
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

    setIsSubmittingComment(true);

    try {
      const response = await addComment(
        story.id,
        commentText.trim(),
        anonymous,
        anonymous ? undefined : nickname.trim()
      );

      if (response.success && response.commentId) {
        // Add the new comment to the local state
        const newComment: StoryComment = {
          id: response.commentId,
          user_id: user.id,
          text: commentText.trim(),
          created_at: new Date().toISOString(),
          anonymous,
          nickname: anonymous ? undefined : nickname.trim()
        };

        setComments(prev => [newComment, ...prev]);
        setCommentText('');
        setNickname('');
        
        Alert.alert(
          'Comment Added',
          'Thank you for supporting this sister. Your comment has been posted.'
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to add comment.');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Get reaction stats
  const getReactionStats = () => {
    const total = story.reactions.total;
    if (total === 0) return 'No reactions yet';
    
    const parts = [];
    if (story.reactions.red_flag > 0) parts.push(`🚩 ${story.reactions.red_flag}`);
    if (story.reactions.good_vibes > 0) parts.push(`✅ ${story.reactions.good_vibes}`);
    if (story.reactions.unsure > 0) parts.push(`❓ ${story.reactions.unsure}`);
    
    return parts.join('  ');
  };

  return (
    <SafeAreaView style={TeaKEStyles.safeContainer}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Story Details</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          {/* Main Story Card */}
          <TeaKECard style={styles.storyCard}>
            {/* Author info */}
            <View style={styles.authorSection}>
              <View style={styles.avatarPlaceholder}>
                <MaterialIcons name="person" size={20} color={Colors.light.primary} />
              </View>
              <View>
                <Text style={styles.authorName}>{getAuthorDisplay()}</Text>
                <Text style={styles.timeAgo}>{formatTimeAgo(story.created_at)}</Text>
              </View>
            </View>

            {/* About section */}
            <View style={styles.aboutSection}>
              <Text style={styles.aboutLabel}>About:</Text>
              <Text style={styles.aboutText}>{getGuyDisplayInfo()}</Text>
            </View>

            {/* Tags */}
            {story.tags.length > 0 && (
              <View style={styles.tagsSection}>
                {story.tags.map((tag, index) => (
                  <StatusTag key={index} type={tag} style={styles.tag} />
                ))}
              </View>
            )}

            {/* Full story text */}
            <View style={styles.storyContent}>
              <Text style={styles.storyText}>{story.text}</Text>
            </View>

            {/* Reactions summary */}
            <View style={styles.reactionsSummary}>
              <Text style={styles.reactionsText}>{getReactionStats()}</Text>
              <Text style={styles.commentsCount}>
                {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
              </Text>
            </View>
          </TeaKECard>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsHeader}>
              Community Support ({comments.length})
            </Text>
            
            {comments.length === 0 ? (
              <TeaKECard style={styles.emptyComments}>
                <MaterialIcons name="chat-bubble-outline" size={32} color={Colors.light.textSecondary} />
                <Text style={styles.emptyCommentsText}>
                  Be the first to offer support and encouragement
                </Text>
              </TeaKECard>
            ) : (
              comments.map((comment) => (
                <TeaKECard key={comment.id} style={styles.commentCard}>
                  <View style={styles.commentHeader}>
                    <View style={styles.commentAuthorInfo}>
                      <View style={styles.commentAvatar}>
                        <MaterialIcons name="person" size={14} color={Colors.light.primary} />
                      </View>
                      <Text style={styles.commentAuthor}>
                        {comment.anonymous ? 'Anonymous Sister' : (comment.nickname || 'A Sister')}
                      </Text>
                    </View>
                    <Text style={styles.commentTime}>{formatTimeAgo(comment.created_at)}</Text>
                  </View>
                  <Text style={styles.commentText}>{comment.text}</Text>
                </TeaKECard>
              ))
            )}
          </View>
        </ScrollView>

        {/* Comment Input Section */}
        <View style={styles.commentInputSection}>
          <TeaKECard style={styles.commentInputCard}>
            <Text style={styles.inputLabel}>Add your support:</Text>
            
            <TextInput
              style={styles.commentInput}
              placeholder="Share words of encouragement, advice, or support..."
              value={commentText}
              onChangeText={setCommentText}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={500}
            />

            <View style={styles.commentOptions}>
              <View style={styles.anonymousOption}>
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
              </View>

              {!anonymous && (
                <TextInput
                  style={styles.nicknameInput}
                  placeholder="Your nickname"
                  value={nickname}
                  onChangeText={setNickname}
                  maxLength={50}
                />
              )}
            </View>

            <TeaKEButton
              title={isSubmittingComment ? 'Posting...' : 'Send Support'}
              onPress={handleSubmitComment}
              disabled={isSubmittingComment || !commentText.trim()}
              size="small"
            />
          </TeaKECard>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  headerRight: {
    width: 40, // Balance the back button
  },
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  storyCard: {
    margin: Spacing.md,
    padding: Spacing.md,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  timeAgo: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  aboutSection: {
    backgroundColor: Colors.light.accent,
    borderRadius: 8,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  aboutLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  aboutText: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '500',
  },
  tagsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  tag: {
    marginRight: 0,
    marginBottom: 0,
  },
  storyContent: {
    marginBottom: Spacing.md,
  },
  storyText: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.light.text,
  },
  reactionsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  reactionsText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  commentsCount: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  commentsSection: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  commentsHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyCommentsText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  commentCard: {
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  commentAuthorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.light.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.xs,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
  },
  commentTime: {
    fontSize: 11,
    color: Colors.light.textSecondary,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.text,
  },
  commentInputSection: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.light.background,
  },
  commentInputCard: {
    padding: Spacing.md,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    padding: Spacing.sm,
    fontSize: 14,
    color: Colors.light.text,
    backgroundColor: Colors.light.cardBackground,
    marginBottom: Spacing.sm,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  commentOptions: {
    marginBottom: Spacing.sm,
  },
  anonymousOption: {
    marginBottom: Spacing.xs,
  },
  anonymousToggle: {
    flexDirection: 'row',
    alignItems: 'center',
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
});