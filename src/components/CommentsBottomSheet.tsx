/**
 * Comments Bottom Sheet - TeaKE
 * Instagram-like bottom sheet for viewing and adding comments
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../constants/Styles';
import { StoryFeedItem, StoryComment } from '../actions/fetchStoriesFeed';
import { addComment } from '../actions/fetchGuyProfile';

const { height: screenHeight } = Dimensions.get('window');
const BOTTOM_SHEET_MIN_HEIGHT = 100;
const BOTTOM_SHEET_MAX_HEIGHT = screenHeight * 0.9;
const BOTTOM_SHEET_DEFAULT_HEIGHT = screenHeight * 0.75; // Open to 75% by default

interface CommentsBottomSheetProps {
  visible: boolean;
  story: StoryFeedItem | null;
  onClose: () => void;
  onCommentAdded: () => void;
}

export const CommentsBottomSheet: React.FC<CommentsBottomSheetProps> = ({
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
  const [comments, setComments] = useState<StoryComment[]>([]);
  
  const translateY = useRef(new Animated.Value(BOTTOM_SHEET_MAX_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Update comments when story changes
  useEffect(() => {
    if (story) {
      setComments(story.comments);
    }
  }, [story]);

  // Pan responder for drag to close
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (evt, gestureState) => {
        const openHeight = screenHeight - BOTTOM_SHEET_DEFAULT_HEIGHT;
        const maxOpenHeight = screenHeight - BOTTOM_SHEET_MAX_HEIGHT;
        const newY = openHeight + gestureState.dy;
        
        // Allow dragging both up and down
        if (gestureState.dy > 0) {
          // Dragging down - limit to open height
          translateY.setValue(Math.max(openHeight, newY));
        } else {
          // Dragging up - allow to max height
          translateY.setValue(Math.max(maxOpenHeight, newY));
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        const openHeight = screenHeight - BOTTOM_SHEET_DEFAULT_HEIGHT;
        const maxOpenHeight = screenHeight - BOTTOM_SHEET_MAX_HEIGHT;
        
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          // Close if dragged down significantly
          closeBottomSheet();
        } else if (gestureState.dy < -100 || gestureState.vy < -0.5) {
          // Expand to full height if dragged up significantly
          Animated.spring(translateY, {
            toValue: maxOpenHeight,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }).start();
        } else {
          // Return to default height
          Animated.spring(translateY, {
            toValue: openHeight,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const openBottomSheet = () => {
    const openHeight = screenHeight - BOTTOM_SHEET_DEFAULT_HEIGHT;
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: openHeight,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0.5,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeBottomSheet = () => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: BOTTOM_SHEET_MAX_HEIGHT,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      setCommentText('');
      setNickname('');
      setAnonymous(true);
    });
  };

  useEffect(() => {
    if (visible) {
      openBottomSheet();
    } else {
      translateY.setValue(BOTTOM_SHEET_MAX_HEIGHT);
      backdropOpacity.setValue(0);
    }
  }, [visible]);

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
        onCommentAdded();
        
        Alert.alert('Support Sent! 💝', 'Thank you for supporting this sister.');
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

  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const commentDate = new Date(dateString);
    const diffMs = now.getTime() - commentDate.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'now';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return commentDate.toLocaleDateString();
  };

  const renderComment = ({ item }: { item: StoryComment }) => (
    <View style={styles.commentItem}>
      <View style={styles.commentAvatar}>
        <MaterialIcons name="person" size={16} color={Colors.light.primary} />
      </View>
      <View style={styles.commentContent}>
        <Text style={styles.commentText}>
          <Text style={styles.commentAuthor}>
            {item.anonymous ? 'Anonymous Sister' : (item.nickname || 'A Sister')}
          </Text>
          {' '}
          {item.text}
        </Text>
        <Text style={styles.commentTime}>{formatTimeAgo(item.created_at)}</Text>
      </View>
    </View>
  );

  if (!story) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={closeBottomSheet}
    >
      <View style={styles.container}>
        {/* Backdrop */}
        <Animated.View 
          style={[styles.backdrop, { opacity: backdropOpacity }]}
        >
          <TouchableOpacity 
            style={StyleSheet.absoluteFill}
            onPress={closeBottomSheet}
            activeOpacity={1}
          />
        </Animated.View>

        {/* Bottom Sheet */}
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              transform: [{ translateY }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
            keyboardVerticalOffset={0}
          >
            {/* Handle */}
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Comments</Text>
              <TouchableOpacity onPress={closeBottomSheet} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color={Colors.light.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Comments List - Takes remaining space */}
            <FlatList
              data={comments}
              renderItem={renderComment}
              keyExtractor={(item) => item.id}
              style={styles.commentsList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyComments}>
                  <MaterialIcons name="chat-bubble-outline" size={32} color={Colors.light.textSecondary} />
                  <Text style={styles.emptyCommentsText}>
                    No comments yet. Be the first to offer support!
                  </Text>
                </View>
              }
              contentContainerStyle={styles.commentsListContent}
            />

            {/* Comment Input - Always at bottom */}
            <View style={[styles.inputContainer, { backgroundColor: '#f8f9fa' }]}>
              <View style={styles.inputRow}>
                <View style={styles.userAvatar}>
                  <MaterialIcons name="person" size={16} color={Colors.light.primary} />
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="Add a comment..."
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    { opacity: commentText.trim() ? 1 : 0.5 }
                  ]}
                  onPress={handleSubmit}
                  disabled={!commentText.trim() || isSubmitting}
                >
                  <Text style={styles.sendButtonText}>
                    {isSubmitting ? '...' : 'Send'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Privacy Toggle */}
              <View style={styles.privacyRow}>
                <TouchableOpacity
                  style={styles.anonymousToggle}
                  onPress={() => setAnonymous(!anonymous)}
                >
                  <MaterialIcons
                    name={anonymous ? 'check-box' : 'check-box-outline-blank'}
                    size={16}
                    color={Colors.light.primary}
                  />
                  <Text style={styles.anonymousText}>Anonymous</Text>
                </TouchableOpacity>

                {!anonymous && (
                  <TextInput
                    style={styles.nicknameInput}
                    placeholder="Your name"
                    value={nickname}
                    onChangeText={setNickname}
                    maxLength={30}
                  />
                )}
              </View>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.light.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: BOTTOM_SHEET_MAX_HEIGHT,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  commentsListContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.light.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  commentsList: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  commentItem: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    alignItems: 'flex-start',
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  commentContent: {
    flex: 1,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.text,
  },
  commentAuthor: {
    fontWeight: '600',
    color: Colors.light.text,
  },
  commentTime: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 4,
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
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.light.cardBackground,
    minHeight: 80, // Ensure minimum height
    justifyContent: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: Spacing.xs,
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 20,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    fontSize: 14,
    maxHeight: 80,
    marginRight: Spacing.sm,
  },
  sendButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 40, // Align with text input
  },
  anonymousToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  anonymousText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginLeft: 4,
  },
  nicknameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    fontSize: 12,
    height: 28,
  },
});