/**
 * Fetch Guy Profile Action - TeaKE
 * Retrieves guy profiles and associated stories/comments
 */

import { supabase, handleSupabaseError } from '../config/supabase';
import { authUtils } from '../utils/auth';
import { Database } from '../types/database';

type TagType = Database['public']['Enums']['tag_type'];

export interface GuyProfile {
  id: string;
  name?: string;
  phone?: string;
  socials?: string;
  created_at: string;
  stories: Story[];
}

export interface Story {
  id: string;
  user_id: string;
  text: string;
  tags: TagType[];
  image_url?: string;
  created_at: string;
  comments: Comment[];
  anonymous: boolean;
  nickname?: string;
}

export interface Comment {
  id: string;
  user_id: string;
  text: string;
  created_at: string;
  anonymous: boolean;
  nickname?: string;
}

export interface SearchParams {
  name?: string;
  phone?: string;
  socials?: string;
}

export const fetchGuyProfile = async (searchParams: SearchParams): Promise<GuyProfile | null> => {
  try {
    // Validation
    const hasSearchCriteria = searchParams.name || searchParams.phone || searchParams.socials;
    if (!hasSearchCriteria) {
      throw new Error('At least one search parameter is required');
    }

    // Format phone number if provided
    let formattedPhone = searchParams.phone;
    if (formattedPhone) {
      formattedPhone = authUtils.formatPhoneNumber(formattedPhone);
    }

    // Search for guy using the custom function
    const { data: guys, error: searchError } = await supabase
      .rpc('search_guys', {
        search_name: searchParams.name || null,
        search_phone: formattedPhone || null,
        search_socials: searchParams.socials || null,
      });

    if (searchError) {
      console.error('Error searching guys:', searchError);
      return null;
    }

    if (!guys || guys.length === 0) {
      return null;
    }

    // Get the first (most relevant) guy
    const guy = guys[0];
    
    // Fetch full guy profile with stories and comments
    return await fetchGuyById(guy.id);
  } catch (error) {
    console.error('Error fetching guy profile:', error);
    return null;
  }
};

export const fetchGuyById = async (guyId: string): Promise<GuyProfile | null> => {
  try {
    // Fetch guy details
    const { data: guy, error: guyError } = await supabase
      .from('guys')
      .select('*')
      .eq('id', guyId)
      .single();

    if (guyError || !guy) {
      console.error('Error fetching guy:', guyError);
      return null;
    }

    // Fetch stories with comments
    const { data: stories, error: storiesError } = await supabase
      .from('stories')
      .select(`
        *,
        comments (
          id,
          user_id,
          text,
          anonymous,
          nickname,
          created_at
        )
      `)
      .eq('guy_id', guyId)
      .order('created_at', { ascending: false });

    if (storiesError) {
      console.error('Error fetching stories:', storiesError);
      return null;
    }

    // Format the response
    const guyProfile: GuyProfile = {
      id: guy.id,
      name: guy.name,
      phone: guy.phone,
      socials: guy.socials,
      created_at: guy.created_at,
      stories: (stories || []).map(story => ({
        id: story.id,
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
      })),
    };

    return guyProfile;
  } catch (error) {
    console.error('Error fetching guy by ID:', error);
    return null;
  }
};

// Add comment to a story
export const addComment = async (storyId: string, text: string, anonymous: boolean = true, nickname?: string): Promise<{ success: boolean; error?: string; commentId?: string }> => {
  try {
    const currentUser = await authUtils.getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: 'You must be logged in to comment'
      };
    }

    if (!text.trim()) {
      return {
        success: false,
        error: 'Comment text is required'
      };
    }

    const { data: newComment, error } = await supabase
      .from('comments')
      .insert({
        story_id: storyId,
        user_id: currentUser.id,
        text: text.trim(),
        anonymous: anonymous,
        nickname: anonymous ? null : (nickname || currentUser.nickname),
      })
      .select('id')
      .single();

    if (error || !newComment) {
      return {
        success: false,
        error: handleSupabaseError(error)
      };
    }

    return {
      success: true,
      commentId: newComment.id
    };
  } catch (error) {
    console.error('Error adding comment:', error);
    return {
      success: false,
      error: 'Failed to add comment. Please try again.'
    };
  }
};

// Search guys with multiple criteria (public function)
export const searchGuys = async (searchParams: SearchParams): Promise<GuyProfile[]> => {
  try {
    // Validation
    const hasSearchCriteria = searchParams.name || searchParams.phone || searchParams.socials;
    if (!hasSearchCriteria) {
      return [];
    }

    // Format phone number if provided
    let formattedPhone = searchParams.phone;
    if (formattedPhone) {
      formattedPhone = authUtils.formatPhoneNumber(formattedPhone);
    }

    // Search using the custom function
    const { data: guys, error } = await supabase
      .rpc('search_guys', {
        search_name: searchParams.name || null,
        search_phone: formattedPhone || null,
        search_socials: searchParams.socials || null,
      });

    if (error) {
      console.error('Error searching guys:', error);
      return [];
    }

    if (!guys || guys.length === 0) {
      return [];
    }

    // Return basic guy info with story count
    return guys.map(guy => ({
      id: guy.id,
      name: guy.name,
      phone: guy.phone,
      socials: guy.socials,
      created_at: guy.created_at,
      stories: [], // Don't load full stories for search results
      story_count: guy.story_count,
    }));
  } catch (error) {
    console.error('Error searching guys:', error);
    return [];
  }
};