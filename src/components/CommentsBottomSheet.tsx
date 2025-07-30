/**
 * Comments Bottom Sheet - TeaKE
 * Instagram-like bottom sheet for viewing and adding comments
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { Colors } from '../../constants/Colors';
import { Spacing } from '../constants/Styles';
import { StoryFeedItem, StoryComment } from '../actions/fetchStoriesFeed';


const { height: screenHeight } = Dimensions.get('window');
const BOTTOM_SHEET_DEFAULT_HEIGHT = screenHeight * 0.8; // Open to 80% to ensure input is visible

interface CommentsBottomSheetProps {
  visible: boolean;
  story: StoryFeedItem | null;
  onClose: () => void;
}

export const CommentsBottomSheet: React.FC<CommentsBottomSheetProps> = ({
  visible,
  story,
  onClose
}) => {
  const [comments, setComments] = useState<StoryComment[]>([]);
  
  const translateY = useRef(new Animated.Value(BOTTOM_SHEET_DEFAULT_HEIGHT)).current;
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
        const newY = openHeight + gestureState.dy;
        
        // Only allow dragging down to close
        if (gestureState.dy > 0) {
          translateY.setValue(Math.max(openHeight, newY));
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        const openHeight = screenHeight - BOTTOM_SHEET_DEFAULT_HEIGHT;
        
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          // Close if dragged down significantly
          closeBottomSheet();
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

  const openBottomSheet = useCallback(() => {
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
  }, [backdropOpacity, translateY]);

  const closeBottomSheet = () => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: BOTTOM_SHEET_DEFAULT_HEIGHT,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  useEffect(() => {
    if (visible) {
      openBottomSheet();
    } else {
      translateY.setValue(BOTTOM_SHEET_DEFAULT_HEIGHT);
      backdropOpacity.setValue(0);
    }
  }, [visible, openBottomSheet, translateY, backdropOpacity]);



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
            {/* Handle */}
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Comments</Text>
              <TouchableOpacity onPress={closeBottomSheet} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color={Colors.light.textSecondary} />
              </TouchableOpacity>
            </View>

          {/* Comments List */}
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
    height: BOTTOM_SHEET_DEFAULT_HEIGHT, // Use default height to ensure input is visible
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
    flexGrow: 1,
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

});