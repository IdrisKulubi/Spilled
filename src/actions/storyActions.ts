/**
 * Story Management Actions - Edit, Delete, and Update operations
 * Handles story modifications with proper permissions and soft delete
 */

import { supabase } from '../config/supabase';
import { StoryFeedItem } from './fetchStoriesFeed';

// Update story data interface
export interface UpdateStoryData {
  guyName?: string;
  guyPhone?: string;
  guySocials?: string;
  guyLocation?: string;
  guyAge?: number;
  storyText: string;
  tags: string[];
  imageUrl?: string;
  anonymous: boolean;
  nickname?: string;
}

// Soft delete story (hide from public view)
export const softDeleteStory = async (storyId: string, userId: string) => {
  try {
    console.log('Soft deleting story:', storyId, 'for user:', userId);

    // First verify the user owns this story
    const { data: story, error: fetchError } = await supabase
      .from('stories')
      .select('user_id')
      .eq('id', storyId)
      .single();

    if (fetchError) {
      console.error('Error fetching story for delete:', fetchError);
      return { success: false, error: 'Story not found' };
    }

    if (story.user_id !== userId) {
      return { success: false, error: 'You can only delete your own stories bestie! 🚫' };
    }

    // Soft delete: Set hidden flag instead of actual deletion
    const { error: updateError } = await supabase
      .from('stories')
      .update({ 
        hidden: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', storyId)
      .eq('user_id', userId); // Double-check ownership

    if (updateError) {
      console.error('Error soft deleting story:', updateError);
      return { success: false, error: 'Failed to delete story. Please try again.' };
    }

    return { success: true };
  } catch (error) {
    console.error('Soft delete story error:', error);
    return { success: false, error: 'Something went wrong bestie! 😭' };
  }
};

// Update only guy information without touching the story
export const updateGuyInfo = async (storyId: string, userId: string, guyData: {
  guyName?: string;
  guyPhone?: string;
  guySocials?: string;
  guyLocation?: string;
  guyAge?: number;
}) => {
  try {
    console.log('Updating guy info for story:', storyId, 'for user:', userId);

    // First verify the user owns this story
    const { data: story, error: fetchError } = await supabase
      .from('stories')
      .select('user_id, guy_id')
      .eq('id', storyId)
      .single();

    if (fetchError) {
      console.error('Error fetching story for update:', fetchError);
      return { success: false, error: 'Story not found' };
    }

    if (story.user_id !== userId) {
      return { success: false, error: 'You can only edit your own stories bestie! 🚫' };
    }

    // Update only the guy information (if guy exists)
    if (story.guy_id) {
      const { error: guyUpdateError } = await supabase
        .from('guys')
        .update({
          name: guyData.guyName || null,
          phone: guyData.guyPhone || null,
          socials: guyData.guySocials || null,
          location: guyData.guyLocation || null,
          age: guyData.guyAge || null,
        })
        .eq('id', story.guy_id);

      if (guyUpdateError) {
        console.error('Error updating guy info:', guyUpdateError);
        return { success: false, error: 'Failed to update person information' };
      }

      console.log('Guy info updated successfully');
      return { success: true };
    } else {
      return { success: false, error: 'No person associated with this story' };
    }

  } catch (error) {
    console.error('Unexpected error updating guy info:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
};

// Update story content
export const updateStory = async (storyId: string, userId: string, updateData: UpdateStoryData) => {
  try {
    console.log('Updating story:', storyId, 'for user:', userId);

    // First verify the user owns this story
    const { data: story, error: fetchError } = await supabase
      .from('stories')
      .select('user_id, guy_id')
      .eq('id', storyId)
      .single();

    if (fetchError) {
      console.error('Error fetching story for update:', fetchError);
      return { success: false, error: 'Story not found' };
    }

    if (story.user_id !== userId) {
      return { success: false, error: 'You can only edit your own stories bestie! 🚫' };
    }

    // Update the guy information first (if guy exists)
    if (story.guy_id) {
      const { error: guyUpdateError } = await supabase
        .from('guys')
        .update({
          name: updateData.guyName || null,
          phone: updateData.guyPhone || null,
          socials: updateData.guySocials || null,
          location: updateData.guyLocation || null,
          age: updateData.guyAge || null,
        })
        .eq('id', story.guy_id);

      if (guyUpdateError) {
        console.error('Error updating guy info:', guyUpdateError);
        return { success: false, error: 'Failed to update person information' };
      }
    }

    // Update the story content
    const { data: updatedStoryData, error: storyUpdateError } = await supabase
      .from('stories')
      .update({
        text: updateData.storyText,
        tags: updateData.tags,
        image_url: updateData.imageUrl || null,
        anonymous: updateData.anonymous,
        nickname: updateData.anonymous ? null : updateData.nickname,
      })
      .eq('id', storyId)
      .eq('user_id', userId) // Double-check ownership
      .select('*');

    if (storyUpdateError) {
      console.error('Error updating story:', storyUpdateError);
      return { success: false, error: 'Failed to update story. Please try again.' };
    }

    // If the update was successful but returned no data (because nothing changed),
    // we can refetch the story to get the latest data.
    const updatedStory = updatedStoryData?.[0];
    if (updatedStory) {
      return { success: true, story: updatedStory };
    } else {
      // Refetch the story to return the latest version
      const { data: refetchedStory, error: refetchError } = await supabase
        .from('stories')
        .select('*')
        .eq('id', storyId)
        .single();
      
      if(refetchError) {
        console.error('Error refetching story after update:', refetchError);
        return { success: false, error: 'Failed to retrieve updated story.' };
      }

      return { success: true, story: refetchedStory };
    }
  } catch (error) {
    console.error('Update story error:', error);
    return { success: false, error: 'Something went wrong bestie! 😭' };
  }
};

// Delete comment (hard delete for comments)
export const deleteComment = async (commentId: string, userId: string) => {
  try {
    console.log('Deleting comment:', commentId, 'for user:', userId);

    // First verify the user owns this comment
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', commentId)
      .single();

    if (fetchError) {
      console.error('Error fetching comment for delete:', fetchError);
      return { success: false, error: 'Comment not found' };
    }

    if (comment.user_id !== userId) {
      return { success: false, error: 'You can only delete your own comments bestie! 🚫' };
    }

    // Hard delete the comment
    const { error: deleteError } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', userId); // Double-check ownership

    if (deleteError) {
      console.error('Error deleting comment:', deleteError);
      return { success: false, error: 'Failed to delete comment. Please try again.' };
    }

    return { success: true };
  } catch (error) {
    console.error('Delete comment error:', error);
    return { success: false, error: 'Something went wrong bestie! 😭' };
  }
};

// Check if user owns a story
export const checkStoryOwnership = (story: StoryFeedItem, userId: string): boolean => {
  return story.user_id === userId;
};

// Check if user owns a comment
export const checkCommentOwnership = (comment: any, userId: string): boolean => {
  return comment.user_id === userId;
};