/**
 * StoryCard Component - TeaKE
 * Instagram-like card design for stories feed
 * Focus on safety, trust, and community support
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../constants/Styles';
import { StatusTag } from './ui';
import { StoryFeedItem, ReactionType } from '../actions/fetchStoriesFeed';
import { UserProfileModal } from './UserProfileModal';
import { StoryActionsModal } from './modals/StoryActionsModal';
import { DeleteConfirmationModal } from './modals/DeleteConfirmationModal';
import { EditStoryModal } from './modals/EditStoryModal';
import { 
  softDeleteStory, 
  updateStory, 
  checkStoryOwnership,
  UpdateStoryData 
} from '../actions/storyActions';
import { useAuth } from '../contexts/AuthContext';



interface StoryCardProps {
  story: StoryFeedItem;
  onReaction: (storyId: string, reactionType: ReactionType) => Promise<void>;
  onViewComments: (story: StoryFeedItem) => void;
  onAddComment: (story: StoryFeedItem) => void;
  onStoryUpdate?: (updatedStory: StoryFeedItem) => void;
  onStoryDelete?: (storyId: string) => void;
  isReacting?: boolean;
}

export const StoryCard: React.FC<StoryCardProps> = ({
  story,
  onReaction,
  onViewComments,
  onAddComment,
  onStoryUpdate,
  onStoryDelete,
  isReacting = false
}) => {
  const { user } = useAuth();
  const [expandedText, setExpandedText] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  
  // Edit/Delete modal states
  const [actionsModalVisible, setActionsModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Truncate long stories for feed view
  const maxLength = 200;
  const shouldTruncate = story.text.length > maxLength;
  const displayText = shouldTruncate && !expandedText 
    ? story.text.substring(0, maxLength).trim()
    : story.text;

  // Format time ago
  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const storyDate = new Date(dateString);
    const diffMs = now.getTime() - storyDate.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return storyDate.toLocaleDateString();
  };

  // Get guy display info (anonymized for safety)
  const getGuyDisplayInfo = (): string => {
    const parts: string[] = [];
    if (story.guy_name) {
      // Anonymize name (show first name + initial)
      const nameParts = story.guy_name.trim().split(' ');
      if (nameParts.length > 1) {
        parts.push(`${nameParts[0]} ${nameParts[1].charAt(0)}.`);
      } else {
        parts.push(nameParts[0]);
      }
    }
    if (story.guy_age) {
      parts.push(`${story.guy_age}yo`);
    }
    if (story.guy_location) {
      parts.push(story.guy_location);
    }
    if (story.guy_phone) {
      // Show last 4 digits only
      const phone = story.guy_phone.replace(/\D/g, '');
      if (phone.length >= 4) {
        parts.push(`***${phone.slice(-4)}`);
      }
    }
    if (story.guy_socials) {
      // Show social handle
      parts.push(story.guy_socials);
    }
    
    return parts.length > 0 ? parts.join(' • ') : 'Someone';
  };

  // Get author display
  const getAuthorDisplay = (): string => {
    if (story.anonymous) {
      return 'Anonymous Sister';
    }
    return story.nickname || 'A Sister';
  };

  // Handle reaction press
  const handleReactionPress = async (reactionType: ReactionType) => {
    if (isReacting) return;
    
    try {
      await onReaction(story.id, reactionType);
    } catch (error) {
      console.error('Error reacting to story:', error);
      Alert.alert('Error', 'Failed to react to story. Please try again.');
    }
  };

  // Get reaction button style
  const getReactionButtonStyle = (reactionType: ReactionType) => {
    const isSelected = story.user_reaction === reactionType;
    const count = story.reactions[reactionType];
    
    return {
      style: [
        styles.reactionButton,
        isSelected && styles.reactionButtonSelected,
        isSelected && getReactionSelectedStyle(reactionType)
      ],
      count
    };
  };

  const getReactionSelectedStyle = (reactionType: ReactionType) => {
    switch (reactionType) {
      case 'red_flag':
        return { backgroundColor: Colors.light.redFlag };
      case 'good_vibes':
        return { backgroundColor: Colors.light.success };
      case 'unsure':
        return { backgroundColor: Colors.light.unsure };
    }
  };

  const getReactionIcon = (reactionType: ReactionType): string => {
    switch (reactionType) {
      case 'red_flag': return '🚩';
      case 'good_vibes': return '✅';
      case 'unsure': return '❓';
    }
  };

  // Check if current user owns this story
  const isOwner = user ? checkStoryOwnership(story, user.id) : false;

  // Handle three-dots menu press
  const handleActionsPress = () => {
    if (isOwner) {
      setActionsModalVisible(true);
    }
  };

  // Handle edit story
  const handleEditStory = () => {
    setEditModalVisible(true);
  };

  // Handle delete story
  const handleDeleteStory = () => {
    setDeleteModalVisible(true);
  };

  // Confirm delete story
  const handleConfirmDelete = async () => {
    if (!user || !isOwner) return;

    setIsDeleting(true);
    try {
      const response = await softDeleteStory(story.id, user.id);
      
      if (response.success) {
        setDeleteModalVisible(false);
        onStoryDelete?.(story.id);
        Alert.alert('Story Deleted', 'Your story has been hidden successfully! 💕');
      } else {
        Alert.alert('Error', response.error || 'Failed to delete story');
      }
    } catch (error) {
      console.error('Delete story error:', error);
      Alert.alert('Error', 'Something went wrong bestie! 😭');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle story update
  const handleStoryUpdate = async (updatedStory: StoryFeedItem) => {
    if (!user || !isOwner) return;

    setIsUpdating(true);
    try {
      const updateData: UpdateStoryData = {
        guyName: updatedStory.guy_name,
        guyPhone: updatedStory.guy_phone,
        guySocials: updatedStory.guy_socials,
        guyLocation: updatedStory.guy_location,
        guyAge: updatedStory.guy_age,
        storyText: updatedStory.text,
        tags: updatedStory.tags,
        imageUrl: updatedStory.image_url,
        anonymous: updatedStory.anonymous,
        nickname: updatedStory.nickname
      };

      const response = await updateStory(story.id, user.id, updateData);
      
      if (response.success) {
        setEditModalVisible(false);
        onStoryUpdate?.(updatedStory);
      } else {
        Alert.alert('Error', response.error || 'Failed to update story');
      }
    } catch (error) {
      console.error('Update story error:', error);
      Alert.alert('Error', 'Something went wrong bestie! 😭');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle profile modal
  const handleAuthorPress = () => {
    if (story.anonymous) {
      Alert.alert(
        'Anonymous User',
        'This user chose to remain anonymous for privacy protection.'
      );
      return;
    }
    setProfileModalVisible(true);
  };

  const handleCloseProfileModal = () => {
    setProfileModalVisible(false);
  };

  return (
    <View style={styles.card}>
      {/* Header - Author and time */}
      <View style={styles.header}>
        <View style={styles.authorInfo}>
          <View style={styles.avatarPlaceholder}>
            <MaterialIcons name="person" size={20} color={Colors.light.primary} />
          </View>
          <TouchableOpacity style={styles.authorText} onPress={handleAuthorPress}>
            <Text style={styles.authorName}>{getAuthorDisplay()}</Text>
            <Text style={styles.aboutText}>{getGuyDisplayInfo()}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.timeAgo}>{formatTimeAgo(story.created_at)}</Text>
      </View>

      {/* Story Image (if exists) */}
      {story.image_url && (
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: story.image_url }} 
            style={styles.storyImage}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Action buttons - Instagram style */}
      <View style={styles.actionsSection}>
        <View style={styles.mainActions}>
          {/* Reactions */}
          {(['red_flag', 'good_vibes', 'unsure'] as ReactionType[]).map(reactionType => {
            const reactionData = getReactionButtonStyle(reactionType);
            const count = reactionData.count;
            return (
              <TouchableOpacity
                key={reactionType}
                style={reactionData.style}
                onPress={() => handleReactionPress(reactionType)}
                disabled={isReacting}
              >
                <View style={styles.reactionButtonContent}>
                  <Text style={styles.reactionEmoji}>
                    {getReactionIcon(reactionType)}
                  </Text>
                  {count > 0 && (
                    <Text style={styles.reactionCount}>
                      {count}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
          
          {/* Comment button */}
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => onAddComment(story)}
          >
            <MaterialIcons name="chat-bubble-outline" size={24} color={Colors.light.text} />
          </TouchableOpacity>
        </View>

        {/* Story Actions Menu - Three dots (only show for story owner) */}
        {isOwner && (
          <TouchableOpacity 
            style={styles.storyActionsButton}
            onPress={handleActionsPress}
          >
            <Text style={styles.storyActionsText}>•••</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Reaction counts */}
      {story.reactions.total > 0 && (
        <View style={styles.reactionCounts}>
          <Text style={styles.reactionCountText}>
            {story.reactions.total} {story.reactions.total === 1 ? 'reaction' : 'reactions'}
          </Text>
        </View>
      )}

      {/* Story content */}
      <View style={styles.contentSection}>
        <Text style={styles.storyText}>
          <TouchableOpacity onPress={handleAuthorPress}>
            <Text style={styles.authorNameInline}>{getAuthorDisplay()} </Text>
          </TouchableOpacity>
          {displayText}
          {shouldTruncate && !expandedText && '...'}
        </Text>
        
        {/* Read more/less buttons */}
        {shouldTruncate && (
          <TouchableOpacity 
            style={styles.readMoreButton}
            onPress={() => setExpandedText(!expandedText)}
          >
            <Text style={styles.readMoreText}>
              {expandedText ? 'Show less' : 'Read more'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tags */}
      {story.tags.length > 0 && (
        <View style={styles.tagsSection}>
          {story.tags.map((tag, index) => (
            <StatusTag key={index} type={tag} style={styles.tag} />
          ))}
        </View>
      )}

      {/* Comments section */}
      {story.comment_count > 0 ? (
        <View style={styles.commentsSection}>
          {/* View Comments button */}
          <TouchableOpacity 
            style={styles.commentsPreview}
            onPress={() => onViewComments(story)}
          >
            <Text style={styles.commentsPreviewText}>
              View all {story.comment_count} comments
            </Text>
          </TouchableOpacity>
          
          {/* Add Comment button */}
          <TouchableOpacity 
            style={styles.addCommentButtonSmall}
            onPress={() => onAddComment(story)}
          >
            <MaterialIcons name="add-comment" size={20} color={Colors.light.primary} />
            <Text style={styles.addCommentButtonSmallText}>
              Add
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.addCommentButton}
          onPress={() => onAddComment(story)}
        >
          <Text style={styles.addCommentButtonText}>
            Add a comment
          </Text>
        </TouchableOpacity>
      )}

      {/* Safety message for sensitive content */}
      {story.tags.includes('red_flag') && (
        <View style={styles.safetyNotice}>
          <MaterialIcons name="shield" size={14} color={Colors.light.redFlag} />
          <Text style={styles.safetyText}>
            Warning signs detected. Trust your instincts.
          </Text>
        </View>
      )}

      {/* User Profile Modal */}
      <UserProfileModal
        visible={profileModalVisible}
        userId={story.user_id}
        nickname={story.nickname}
        isAnonymous={story.anonymous}
        onClose={handleCloseProfileModal}
      />

      {/* Story Actions Modal */}
      <StoryActionsModal
        visible={actionsModalVisible}
        onClose={() => setActionsModalVisible(false)}
        onEdit={handleEditStory}
        onDelete={handleDeleteStory}
        isOwner={isOwner}
        itemType="story"
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        onConfirm={handleConfirmDelete}
        itemType="story"
        isDeleting={isDeleting}
      />

      {/* Edit Story Modal */}
      <EditStoryModal
        visible={editModalVisible}
        story={story}
        onClose={() => setEditModalVisible(false)}
        onUpdate={handleStoryUpdate}
        isUpdating={isUpdating}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.cardBackground,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: 16, // rounded corners following design rules
    overflow: 'hidden',
    shadowColor: Colors.light.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  authorText: {
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
  },
  aboutText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  timeAgo: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1, // Square like Instagram
    backgroundColor: Colors.light.accent,
  },
  storyImage: {
    width: '100%',
    height: '100%',
  },
  actionsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  mainActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  actionButton: {
    padding: Spacing.xs,
  },
  storyActionsButton: {
    padding: Spacing.xs,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyActionsText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    lineHeight: 20,
  },
  reactionButton: {
    padding: Spacing.xs,
    borderRadius: 20,
    backgroundColor: 'transparent',
    minWidth: 50,
    alignItems: 'center',
  },
  reactionButtonSelected: {
    backgroundColor: Colors.light.accent,
  },
  reactionButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionEmoji: {
    fontSize: 24,
  },
  reactionCount: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 2,
    textAlign: 'center',
  },
  reactionCounts: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  reactionCountText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
  },
  contentSection: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  storyText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.text,
  },
  authorNameInline: {
    fontWeight: '600',
    color: Colors.light.text,
  },
  readMoreButton: {
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: Colors.light.accent,
  },
  readMoreText: {
    color: Colors.light.primary,
    fontWeight: '600',
    fontSize: 12,
  },
  tagsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  tag: {
    marginRight: 0,
    marginBottom: 0,
  },
  commentsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  commentsPreview: {
    flex: 1,
  },
  commentsPreviewText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  addCommentButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.light.accent,
    borderRadius: 8,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    alignItems: 'center',
  },
  addCommentButtonText: {
    fontSize: 13,
    color: Colors.light.primary,
    fontWeight: '600',
  },
  addCommentButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.light.accent,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.primary,
  },
  addCommentButtonSmallText: {
    fontSize: 12,
    color: Colors.light.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  safetyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderTopColor: Colors.light.redFlag,
    borderTopWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  safetyText: {
    fontSize: 12,
    color: Colors.light.redFlag,
    marginLeft: Spacing.xs,
    flex: 1,
    fontWeight: '500',
  },
});