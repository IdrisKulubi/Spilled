/**
 * Stories Feed Action - TeaKE
 * Fetches all stories for the explore feed with guy info, comments, and reactions
 */

import { supabase, handleSupabaseError } from '../config/supabase';
import { Database } from '../types/database';

type TagType = Database['public']['Enums']['tag_type'];

export interface StoryFeedItem {
  id: string;
  guy_id: string;
  guy_name?: string;
  guy_phone?: string;  
  guy_socials?: string;
  guy_location?: string;
  guy_age?: number;
  user_id: string;
  text: string;
  tags: TagType[];
  image_url?: string;
  created_at: string;
  anonymous: boolean;
  nickname?: string;
  comments: StoryComment[];
  comment_count: number;
  reactions: StoryReactions;
  user_reaction?: ReactionType;
}

export interface StoryComment {
  id: string;
  user_id: string;
  text: string;
  created_at: string;
  anonymous: boolean;
  nickname?: string;
}

export interface StoryReactions {
  red_flag: number;
  good_vibes: number;
  unsure: number;
  total: number;
}

export type ReactionType = 'red_flag' | 'good_vibes' | 'unsure';

export interface FeedResponse {
  success: boolean;
  stories: StoryFeedItem[];
  error?: string;
}

export interface ReactionResponse {
  success: boolean;
  error?: string;
}

// Fetch stories feed with pagination
export const fetchStoriesFeed = async (
  limit: number = 20,
  offset: number = 0
): Promise<FeedResponse> => {
  try {
    // Fetch stories with guy info and comments
    const { data: stories, error: storiesError } = await supabase
      .from('stories')
      .select(`
        id,
        guy_id,
        user_id,
        text,
        tags,
        image_url,
        created_at,
        anonymous,
        nickname,
        guys!inner (
          id,
          name,
          phone,
          socials,
          location,
          age
        ),
        comments (
          id,
          user_id,
          text,
          anonymous,
          nickname,
          created_at
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (storiesError) {
      console.error('Error fetching stories feed:', storiesError);
      return {
        success: false,
        stories: [],
        error: 'Failed to load stories feed'
      };
    }

    if (!stories || stories.length === 0) {
      return {
        success: true,
        stories: []
      };
    }

    // Get story IDs for fetching reactions
    const storyIds = stories.map(story => story.id);
    
    // Fetch reactions for all stories
    const { data: reactions, error: reactionsError } = await supabase
      .from('story_reactions')
      .select('story_id, reaction_type')
      .in('story_id', storyIds);

    // Get current user's reactions if authenticated
    const { data: { user } } = await supabase.auth.getUser();
    let userReactions: any[] = [];
    
    if (user) {
      const { data: userReactionsData } = await supabase
        .from('story_reactions')
        .select('story_id, reaction_type')
        .in('story_id', storyIds)
        .eq('user_id', user.id);
      
      userReactions = userReactionsData || [];
    }

    // Process stories data
    const processedStories: StoryFeedItem[] = stories.map(story => {
      // Calculate reactions for this story
      const storyReactions = (reactions || []).filter(r => r.story_id === story.id);
      const reactionCounts: StoryReactions = {
        red_flag: 0,
        good_vibes: 0,
        unsure: 0,
        total: 0
      };

      // Count reactions manually since we can't use SQL GROUP BY
      storyReactions.forEach(reaction => {
        const reactionType = reaction.reaction_type as ReactionType;
        reactionCounts[reactionType] = (reactionCounts[reactionType] || 0) + 1;
        reactionCounts.total += 1;
      });

      // Get user's reaction for this story
      const userReaction = userReactions.find(ur => ur.story_id === story.id);

      return {
        id: story.id,
        guy_id: story.guy_id,
        guy_name: story.guys?.name,
        guy_phone: story.guys?.phone,
        guy_socials: story.guys?.socials,
        guy_location: story.guys?.location,
        guy_age: story.guys?.age,
        user_id: story.user_id,
        text: story.text,
        tags: story.tags,
        image_url: story.image_url,
        created_at: story.created_at,
        anonymous: story.anonymous,
        nickname: story.nickname,
        comments: (story.comments || []).map(comment => ({
          id: comment.id,
          user_id: comment.user_id,
          text: comment.text,
          created_at: comment.created_at,
          anonymous: comment.anonymous,
          nickname: comment.nickname,
        })),
        comment_count: story.comments?.length || 0,
        reactions: reactionCounts,
        user_reaction: userReaction?.reaction_type
      };
    });

    return {
      success: true,
      stories: processedStories
    };

  } catch (error) {
    console.error('Error fetching stories feed:', error);
    return {
      success: false,
      stories: [],
      error: 'Failed to load stories feed'
    };
  }
};

// Add or update user reaction to a story
export const reactToStory = async (
  storyId: string,
  reactionType: ReactionType
): Promise<ReactionResponse> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        success: false,
        error: 'You must be logged in to react to stories'
      };
    }

    // Check if user already reacted to this story
    const { data: existingReaction, error: checkError } = await supabase
      .from('story_reactions')
      .select('id, reaction_type')
      .eq('story_id', storyId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing reaction:', checkError);
      return {
        success: false,
        error: 'Failed to process reaction'
      };
    }

    if (existingReaction) {
      // If same reaction, remove it (toggle off)
      if (existingReaction.reaction_type === reactionType) {
        const { error: deleteError } = await supabase
          .from('story_reactions')
          .delete()
          .eq('id', existingReaction.id);

        if (deleteError) {
          console.error('Error removing reaction:', deleteError);
          return {
            success: false,
            error: 'Failed to remove reaction'
          };
        }
      } else {
        // Update to new reaction type
        const { error: updateError } = await supabase
          .from('story_reactions')
          .update({ reaction_type: reactionType })
          .eq('id', existingReaction.id);

        if (updateError) {
          console.error('Error updating reaction:', updateError);
          return {
            success: false,
            error: 'Failed to update reaction'
          };
        }
      }
    } else {
      // Add new reaction
      const { error: insertError } = await supabase
        .from('story_reactions')
        .insert({
          story_id: storyId,
          user_id: user.id,
          reaction_type: reactionType
        });

      if (insertError) {
        console.error('Error adding reaction:', insertError);
        return {
          success: false,
          error: 'Failed to add reaction'
        };
      }
    }

    return {
      success: true
    };

  } catch (error) {
    console.error('Error reacting to story:', error);
    return {
      success: false,
      error: 'Failed to process reaction'
    };
  }
};

// Add comment to story (reuse from existing action)
export { addComment } from './fetchGuyProfile';