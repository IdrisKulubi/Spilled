/**
 * Explore Section Component - Shows latest stories and community activity
 * Extracted from ExploreScreen
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert 
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { TeaKEStyles, Spacing } from '../../constants/Styles';
import { TeaKECard } from '../../components/ui';
import { Colors } from '../../../constants/Colors';
import { MaterialIcons } from '@expo/vector-icons';
import { StoryCard } from '../../components/StoryCard';
import { CommentsBottomSheet } from '../../components/CommentsBottomSheet';
import { AddCommentModal } from '../../components/AddCommentModal';
import { 
  fetchStoriesFeed, 
  reactToStory, 
  StoryFeedItem, 
  ReactionType 
} from '../../actions/fetchStoriesFeed';

export const ExploreSection: React.FC = () => {
  const { user } = useAuth();
  const [stories, setStories] = useState<StoryFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reacting, setReacting] = useState<string | null>(null);
  const [commentBottomSheetStory, setCommentBottomSheetStory] = useState<StoryFeedItem | null>(null);
  const [addCommentModalStory, setAddCommentModalStory] = useState<StoryFeedItem | null>(null);

  // Load initial stories
  const loadStories = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else if (stories.length === 0) {
        setLoading(true);
      }

      const response = await fetchStoriesFeed(20, 0);
      
      if (response.success) {
        setStories(response.stories);
      } else {
        Alert.alert('Error', response.error || 'Failed to load stories');
      }
    } catch (error) {
      console.error('Error loading stories:', error);
      Alert.alert('Error', 'Something went wrong bestie 😭');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [stories.length]);

  // Load more stories (pagination)
  const loadMoreStories = useCallback(async () => {
    if (loadingMore || stories.length === 0) return;

    setLoadingMore(true);
    try {
      const response = await fetchStoriesFeed(20, stories.length);
      
      if (response.success && response.stories.length > 0) {
        setStories(prev => [...prev, ...response.stories]);
      }
    } catch (error) {
      console.error('Error loading more stories:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [stories.length, loadingMore]);

  // Handle story reaction
  const handleReaction = useCallback(async (storyId: string, reactionType: ReactionType) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to react to stories bestie! 💕');
      return;
    }

    setReacting(storyId);
    try {
      const response = await reactToStory(storyId, reactionType);
      
      if (response.success) {
        // Refresh the stories to get updated reaction counts
        await loadStories(true);
      } else {
        Alert.alert('Error', response.error || 'Failed to react to story');
      }
    } catch (error) {
      console.error('Error reacting to story:', error);
      Alert.alert('Error', 'Something went wrong bestie 😭');
    } finally {
      setReacting(null);
    }
  }, [user, loadStories]);

  // Handle view comments
  const handleViewComments = useCallback((story: StoryFeedItem) => {
    setCommentBottomSheetStory(story);
  }, []);

  // Handle add comment
  const handleAddComment = useCallback((story: StoryFeedItem) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to add comments bestie! 💕');
      return;
    }
    setAddCommentModalStory(story);
  }, [user]);

  // Handle comment added
  const handleCommentAdded = useCallback(async () => {
    await loadStories(true);
  }, [loadStories]);

  // Initial load
  useEffect(() => {
    loadStories();
  }, [loadStories]);

  // Handle story update
  const handleStoryUpdate = useCallback((updatedStory: StoryFeedItem) => {
    setStories(prevStories => 
      prevStories.map(story => 
        story.id === updatedStory.id ? updatedStory : story
      )
    );
  }, []);

  // Handle story delete (remove from feed)
  const handleStoryDelete = useCallback((storyId: string) => {
    setStories(prevStories => 
      prevStories.filter(story => story.id !== storyId)
    );
  }, []);

  // Render story item
  const renderStoryItem = ({ item }: { item: StoryFeedItem }) => (
    <StoryCard
      story={item}
      onReaction={handleReaction}
      onViewComments={handleViewComments}
      onAddComment={handleAddComment}
      onStoryUpdate={handleStoryUpdate}
      onStoryDelete={handleStoryDelete}
      isReacting={reacting === item.id}
    />
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <TeaKECard style={styles.emptyCard}>
        <MaterialIcons name="forum" size={64} color={Colors.light.primary} />
        <Text style={styles.emptyTitle}>No Stories Yet</Text>
        <Text style={styles.emptyDescription}>
          Be the first to spill the tea and help build this supportive community 💕
        </Text>
        <View style={styles.encouragementSection}>
          <MaterialIcons name="favorite" size={20} color={Colors.light.primary} />
          <Text style={styles.encouragementText}>
            Every story shared helps another girl stay safe. Your experience matters bestie! ✨
          </Text>
        </View>
      </TeaKECard>
    </View>
  );

  // Render footer loading
  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={Colors.light.primary} />
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingHorizontal: Spacing.md, paddingTop: Spacing.md }]}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Latest Tea ☕</Text>
        <Text style={styles.subtitle}>
          Real stories from real girls - stay safe out here! 💜
        </Text>
      </View>

      {/* Stories Feed */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>Loading the latest tea... ☕</Text>
        </View>
      ) : (
        <FlatList
          data={stories}
          renderItem={renderStoryItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadStories(true)}
              tintColor={Colors.light.primary}
            />
          }
          onEndReached={loadMoreStories}
          onEndReachedThreshold={0.1}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={stories.length === 0 ? { flex: 1 } : { paddingBottom: 20 }}
          style={{ marginHorizontal: 0 }}
        />
      )}

      {/* Comments Bottom Sheet */}
      <CommentsBottomSheet
        visible={!!commentBottomSheetStory}
        story={commentBottomSheetStory}
        onClose={() => setCommentBottomSheetStory(null)}
      />

      {/* Add Comment Modal */}
      <AddCommentModal
        visible={!!addCommentModalStory}
        story={addCommentModalStory}
        onClose={() => setAddCommentModalStory(null)}
        onCommentAdded={handleCommentAdded}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginTop: Spacing.sm,
  },
  footerLoader: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  emptyDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  encouragementSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
  },
  encouragementText: {
    fontSize: 13,
    color: Colors.light.text,
    marginLeft: Spacing.sm,
    flex: 1,
    lineHeight: 18,
    textAlign: 'center',
  },
});