/**
 * Stories Feed Action - TeaKE
 * Fetches all stories for the explore feed with guy info, comments, and reactions
 */

import { db } from '../database/connection';
import { stories, guys, comments, storyReactions } from '../database/schema';
import { authClient } from '../lib/auth-client';
import { and, desc, eq, inArray } from 'drizzle-orm';

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
    const session = await authClient.getSession();
    const user = session?.data?.user;

    const results = await db
      .select()
      .from(stories)
      .leftJoin(guys, eq(stories.guyId, guys.id))
      .orderBy(desc(stories.createdAt))
      .limit(limit)
      .offset(offset);

    const processedStories: StoryFeedItem[] = await Promise.all(
      results.map(async (row) => {
        const story = row.stories;
        const guy = row.guys;

        const commentCount = await db
          .select()
          .from(comments)
          .where(eq(comments.storyId, story.id));

        const reactionCounts = await db
          .select()
          .from(storyReactions)
          .where(eq(storyReactions.storyId, story.id));

        let userReaction: ReactionType | undefined;
        if (user) {
          const reaction = await db
            .select()
            .from(storyReactions)
            .where(
              and(
                eq(storyReactions.storyId, story.id),
                eq(storyReactions.userId, user.id)
              )
            );
          userReaction = reaction[0]?.reactionType as ReactionType;
        }

        return {
          id: story.id,
          guy_id: story.guyId,
          guy_name: guy?.name,
          guy_phone: guy?.phone,
          guy_socials: guy?.socials,
          guy_location: guy?.location,
          guy_age: guy?.age,
          user_id: story.userId,
          text: story.text,
          tags: story.tags,
          image_url: story.imageUrl,
          created_at: story.createdAt,
          anonymous: story.anonymous,
          nickname: story.nickname,
          comments: [],
          comment_count: commentCount.length,
          reactions: {
            red_flag: reactionCounts.filter(r => r.reactionType === 'red_flag').length,
            good_vibes: reactionCounts.filter(r => r.reactionType === 'good_vibes').length,
            unsure: reactionCounts.filter(r => r.reactionType === 'unsure').length,
            total: reactionCounts.length
          },
          user_reaction: userReaction,
        };
      })
    );

    return {
      success: true,
      stories: processedStories,
    };
  } catch (error) {
    console.error('Error fetching stories feed:', error);
    return {
      success: false,
      stories: [],
      error: 'Failed to load stories feed',
    };
  }
};

// Add or update user reaction to a story
export const reactToStory = async (
  storyId: string,
  reactionType: ReactionType
): Promise<ReactionResponse> => {
  try {
    const session = await authClient.getSession();
    const user = session?.data?.user;

    if (!user) {
      return {
        success: false,
        error: 'You must be logged in to react to stories',
      };
    }

    const existingReaction = await db
      .select()
      .from(storyReactions)
      .where(
        and(
          eq(storyReactions.storyId, storyId),
          eq(storyReactions.userId, user.id)
        )
      );

    if (existingReaction.length > 0) {
      if (existingReaction[0].reactionType === reactionType) {
        await db.delete(storyReactions).where(eq(storyReactions.id, existingReaction[0].id));
      } else {
        await db
          .update(storyReactions)
          .set({ reactionType })
          .where(eq(storyReactions.id, existingReaction[0].id));
      }
    } else {
      await db.insert(storyReactions).values({
        storyId,
        userId: user.id,
        reactionType,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error reacting to story:', error);
    return {
      success: false,
      error: 'Failed to process reaction',
    };
  }
};

// Add comment to story (reuse from existing action)
export { addComment } from './fetchGuyProfile';