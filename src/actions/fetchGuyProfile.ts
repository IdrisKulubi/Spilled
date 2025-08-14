/**
 * Fetch Guy Profile Action - Spilled
 * Retrieves guy profiles and associated stories/comments
 * Updated to use Drizzle ORM instead of Supabase
 */

import { GuyRepository } from '../repositories/GuyRepository';
import { authUtils } from '../utils/auth';
import { eq, and, or, ilike, sql, desc } from 'drizzle-orm';
import { db } from '../database/connection';
import { guys, stories, comments, users } from '../database/schema';

type TagType = "red_flag" | "good_vibes" | "unsure";

export interface GuyProfile {
  id: string;
  name?: string;
  phone?: string;
  socials?: string;
  location?: string;
  age?: number;
  created_at: string;
  stories: Story[];
  story_count?: number;
  match_source?: string;
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
  location?: string;
  minAge?: number;
  maxAge?: number;
  searchTerm?: string; // For general search
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

    // Search for guys using Drizzle query (replicating search_guys function)
    const searchConditions: any[] = [];
    
    if (searchParams.name) {
      searchConditions.push(ilike(guys.name, `%${searchParams.name}%`));
    }
    
    if (formattedPhone) {
      searchConditions.push(ilike(guys.phone, `%${formattedPhone}%`));
    }
    
    if (searchParams.socials) {
      searchConditions.push(ilike(guys.socials, `%${searchParams.socials}%`));
    }

    if (searchConditions.length === 0) {
      return null;
    }

    // Build the search query with story count
    const searchResults = await db
      .select({
        id: guys.id,
        name: guys.name,
        phone: guys.phone,
        socials: guys.socials,
        location: guys.location,
        age: guys.age,
        createdAt: guys.createdAt,
        storyCount: sql<number>`count(${stories.id})`,
      })
      .from(guys)
      .leftJoin(stories, eq(guys.id, stories.guyId))
      .where(or(...searchConditions))
      .groupBy(guys.id, guys.name, guys.phone, guys.socials, guys.location, guys.age, guys.createdAt)
      .orderBy(desc(sql`count(${stories.id})`), desc(guys.createdAt));

    if (!searchResults || searchResults.length === 0) {
      return null;
    }

    // Get the first (most relevant) guy
    const guy = searchResults[0];
    
    // Fetch full guy profile with stories and comments
    return await fetchGuyById(guy.id);
  } catch (error) {
    console.error('Error fetching guy profile:', error);
    return null;
  }
};

export const fetchGuyById = async (guyId: string): Promise<GuyProfile | null> => {
  try {
    // Initialize repositories
    const guyRepository = new GuyRepository();
    
    // Fetch guy details
    const guy = await guyRepository.findById(guyId);
    
    if (!guy) {
      console.error('Guy not found:', guyId);
      return null;
    }

    // Fetch stories with comments using complex query
    const storiesWithComments = await db
      .select({
        // Story fields
        storyId: stories.id,
        storyUserId: stories.userId,
        storyText: stories.text,
        storyTags: stories.tags,
        storyImageUrl: stories.imageUrl,
        storyCreatedAt: stories.createdAt,
        storyAnonymous: stories.anonymous,
        storyNickname: stories.nickname,
        // Comment fields
        commentId: comments.id,
        commentUserId: comments.userId,
        commentText: comments.text,
        commentCreatedAt: comments.createdAt,
        commentAnonymous: comments.anonymous,
        commentNickname: comments.nickname,
      })
      .from(stories)
      .leftJoin(comments, eq(stories.id, comments.storyId))
      .where(eq(stories.guyId, guyId))
      .orderBy(desc(stories.createdAt), desc(comments.createdAt));

    // Group stories and their comments
    const storiesMap = new Map<string, Story>();
    
    for (const row of storiesWithComments) {
      // Add story if not already in map
      if (!storiesMap.has(row.storyId)) {
        storiesMap.set(row.storyId, {
          id: row.storyId,
          user_id: row.storyUserId,
          text: row.storyText,
          tags: row.storyTags || [],
          image_url: row.storyImageUrl,
          created_at: row.storyCreatedAt.toISOString(),
          anonymous: row.storyAnonymous,
          nickname: row.storyNickname,
          comments: [],
        });
      }
      
      // Add comment if it exists
      if (row.commentId) {
        const story = storiesMap.get(row.storyId)!;
        story.comments.push({
          id: row.commentId,
          user_id: row.commentUserId,
          text: row.commentText,
          created_at: row.commentCreatedAt.toISOString(),
          anonymous: row.commentAnonymous,
          nickname: row.commentNickname,
        });
      }
    }

    // Convert map to array and sort stories by creation date
    const storiesArray = Array.from(storiesMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Format the response
    const guyProfile: GuyProfile = {
      id: guy.id,
      name: guy.name,
      phone: guy.phone,
      socials: guy.socials,
      location: guy.location,
      age: guy.age,
      created_at: guy.createdAt.toISOString(),
      stories: storiesArray,
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

    // Check if user is verified
    if (currentUser.verificationStatus !== 'approved') {
      const statusMessage = currentUser.verificationStatus === 'pending' 
        ? 'Your verification is still pending. Please wait for approval.'
        : currentUser.verificationStatus === 'rejected'
        ? 'Your verification was rejected. Please re-upload your ID.'
        : 'Please verify your identity by uploading your ID to comment.';
      
      return {
        success: false,
        error: statusMessage
      };
    }

    if (!text.trim()) {
      return {
        success: false,
        error: 'Comment text is required'
      };
    }

    // Create comment directly using database insert (matching schema)
    const newCommentResult = await db
      .insert(comments)
      .values({
        storyId: storyId,
        userId: currentUser.id,
        text: text.trim(),
        anonymous: anonymous,
        nickname: anonymous ? null : (nickname || currentUser.nickname),
      })
      .returning({ id: comments.id });

    const newComment = newCommentResult[0];
    if (!newComment) {
      throw new Error('Failed to create comment');
    }

    return {
      success: true,
      commentId: newComment.id
    };
  } catch (error) {
    console.error('Error adding comment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add comment. Please try again.'
    };
  }
};

// Search guys with multiple criteria (public function)
export const searchGuys = async (searchParams: SearchParams): Promise<GuyProfile[]> => {
  try {
    // Check if we have any search criteria
    const hasSearchCriteria = searchParams.name || searchParams.phone || searchParams.socials || 
                             searchParams.location || searchParams.searchTerm || 
                             searchParams.minAge || searchParams.maxAge;
    
    if (!hasSearchCriteria) {
      return [];
    }

    let searchResults;

    // If we have a general search term, use comprehensive search (replicating search_guys_and_stories)
    if (searchParams.searchTerm && searchParams.searchTerm.trim()) {
      const searchTerm = searchParams.searchTerm.trim();
      
      // Search in guys table and stories table
      const directMatches = await db
        .select({
          guyId: guys.id,
          guyName: guys.name,
          guyPhone: guys.phone,
          guySocials: guys.socials,
          guyLocation: guys.location,
          guyAge: guys.age,
          storyCount: sql<number>`count(${stories.id})`,
          latestStoryDate: sql<string>`max(${stories.createdAt})`,
          matchSource: sql<string>`'direct'`,
        })
        .from(guys)
        .leftJoin(stories, eq(guys.id, stories.guyId))
        .where(
          or(
            ilike(guys.name, `%${searchTerm}%`),
            ilike(guys.phone, `%${searchTerm}%`),
            ilike(guys.socials, `%${searchTerm}%`),
            ilike(guys.location, `%${searchTerm}%`)
          )
        )
        .groupBy(guys.id, guys.name, guys.phone, guys.socials, guys.location, guys.age)
        .having(sql`count(${stories.id}) > 0`);

      const storyMatches = await db
        .select({
          guyId: guys.id,
          guyName: guys.name,
          guyPhone: guys.phone,
          guySocials: guys.socials,
          guyLocation: guys.location,
          guyAge: guys.age,
          storyCount: sql<number>`count(${stories.id})`,
          latestStoryDate: sql<string>`max(${stories.createdAt})`,
          matchSource: sql<string>`'story_content'`,
        })
        .from(guys)
        .innerJoin(stories, eq(guys.id, stories.guyId))
        .where(ilike(stories.text, `%${searchTerm}%`))
        .groupBy(guys.id, guys.name, guys.phone, guys.socials, guys.location, guys.age);

      // Combine results and remove duplicates
      const combinedResults = [...directMatches, ...storyMatches];
      const uniqueResults = combinedResults.reduce((acc, current) => {
        const existing = acc.find(item => item.guyId === current.guyId);
        if (!existing) {
          acc.push(current);
        } else if (current.storyCount > existing.storyCount) {
          // Keep the one with more stories
          const index = acc.indexOf(existing);
          acc[index] = current;
        }
        return acc;
      }, [] as typeof combinedResults);

      searchResults = uniqueResults.sort((a, b) => b.storyCount - a.storyCount);
    } else {
      // Use specific field search (replicating search_guys function)
      const searchConditions: any[] = [];
      
      if (searchParams.name) {
        searchConditions.push(ilike(guys.name, `%${searchParams.name}%`));
      }
      
      if (searchParams.phone) {
        const formattedPhone = authUtils.formatPhoneNumber(searchParams.phone);
        searchConditions.push(ilike(guys.phone, `%${formattedPhone}%`));
      }
      
      if (searchParams.socials) {
        searchConditions.push(ilike(guys.socials, `%${searchParams.socials}%`));
      }
      
      if (searchParams.location) {
        searchConditions.push(ilike(guys.location, `%${searchParams.location}%`));
      }
      
      // Age range conditions
      if (searchParams.minAge !== undefined) {
        searchConditions.push(sql`${guys.age} >= ${searchParams.minAge}`);
      }
      
      if (searchParams.maxAge !== undefined) {
        searchConditions.push(sql`${guys.age} <= ${searchParams.maxAge}`);
      }

      if (searchConditions.length === 0) {
        return [];
      }

      searchResults = await db
        .select({
          guyId: guys.id,
          guyName: guys.name,
          guyPhone: guys.phone,
          guySocials: guys.socials,
          guyLocation: guys.location,
          guyAge: guys.age,
          storyCount: sql<number>`count(${stories.id})`,
          latestStoryDate: sql<string>`max(${stories.createdAt})`,
          matchSource: sql<string>`'direct'`,
        })
        .from(guys)
        .leftJoin(stories, eq(guys.id, stories.guyId))
        .where(and(...searchConditions))
        .groupBy(guys.id, guys.name, guys.phone, guys.socials, guys.location, guys.age)
        .having(sql`count(${stories.id}) > 0`)
        .orderBy(desc(sql`count(${stories.id})`), desc(sql`max(${stories.createdAt})`));
    }

    if (!searchResults || searchResults.length === 0) {
      return [];
    }

    // Return basic guy info with story count
    return searchResults.map(guy => ({
      id: guy.guyId,
      name: guy.guyName,
      phone: guy.guyPhone,
      socials: guy.guySocials,
      location: guy.guyLocation,
      age: guy.guyAge,
      created_at: guy.latestStoryDate || new Date().toISOString(),
      stories: [], // Don't load full stories for search results
      story_count: guy.storyCount,
      match_source: guy.matchSource,
    }));
  } catch (error) {
    console.error('Error searching guys:', error);
    return [];
  }
};